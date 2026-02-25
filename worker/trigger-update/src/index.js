export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const corsHeaders = buildCorsHeaders(origin, env.ALLOWED_ORIGIN || "");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Method Not Allowed" }, 405, corsHeaders);
    }

    if (!isAllowedOrigin(origin, env.ALLOWED_ORIGIN || "")) {
      return json({ error: "Origin Not Allowed" }, 403, corsHeaders);
    }

    const owner = env.GITHUB_OWNER;
    const repo = env.GITHUB_REPO;
    const ref = env.GITHUB_REF || "main";
    const token = env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
      return json(
        {
          error: "Worker env not configured",
          required: ["GITHUB_OWNER", "GITHUB_REPO", "GITHUB_TOKEN"],
        },
        500,
        corsHeaders
      );
    }

    let payload = {};
    try {
      payload = (await request.json()) || {};
    } catch (_) {
      payload = {};
    }

    const action = String(payload.action || "update");
    const updateWorkflow = env.UPDATE_WORKFLOW_FILE || env.GITHUB_WORKFLOW_FILE || "update-cs-ro.yml";
    const summarizeWorkflow = env.SUMMARIZE_WORKFLOW_FILE || "summarize-papers.yml";
    const defaultBaseUrl = env.DEFAULT_LLM_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    const defaultModel = env.DEFAULT_LLM_MODEL || "qwen3.5-397b-a17b";

    if (action === "chat_stream") {
      return await handleChatStream({
        payload,
        env,
        corsHeaders,
        defaultBaseUrl,
        defaultModel,
      });
    }

    if (action === "summary_status") {
      try {
        const status = await fetchSummaryStatus({
          owner,
          repo,
          token,
          workflow: summarizeWorkflow,
          ref,
          arxivId: String(payload.arxiv_id || "").trim(),
          clientTag: String(payload.client_tag || "").trim(),
          sinceLine: Number(payload.since_line || 0),
          maxLines: Number(payload.max_lines || 80),
        });
        return json({ ok: true, ...status }, 200, corsHeaders);
      } catch (err) {
        return json(
          {
            ok: true,
            found: false,
            transient_error: "summary status temporary unavailable",
            detail: String(err?.message || err),
            message: "github status api temporary error; client should retry polling",
          },
          200,
          corsHeaders
        );
      }
    }

    const workflow = resolveWorkflow(action, updateWorkflow, summarizeWorkflow);
    if (!workflow) {
      return json(
        {
          ok: false,
          error: "invalid action",
          supported_actions: ["update", "summarize_new", "summarize_one", "summary_status", "chat_stream"],
        },
        400,
        corsHeaders
      );
    }

    const workflowInputs = buildWorkflowInputs(action, payload, { defaultBaseUrl, defaultModel });
    if (workflowInputs.__error) {
      return json(
        {
          ok: false,
          error: workflowInputs.__error,
        },
        400,
        corsHeaders
      );
    }
    const dispatchRef = typeof payload.ref === "string" && payload.ref.trim() ? payload.ref.trim() : ref;

    const ghResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "arxiv-trigger-update-worker",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: dispatchRef,
          inputs: workflowInputs,
        }),
      }
    );

    if (ghResp.status === 204) {
      return json(
        {
          ok: true,
          message: "workflow dispatched",
          action,
          workflow,
          ref: dispatchRef,
          inputs: workflowInputs,
        },
        200,
        corsHeaders
      );
    }

    const detail = await ghResp.text();
    return json(
      {
        ok: false,
        status: ghResp.status,
        error: "github dispatch failed",
        detail,
      },
      502,
      corsHeaders
    );
  },
};

function resolveWorkflow(action, updateWorkflow, summarizeWorkflow) {
  if (action === "update") return updateWorkflow;
  if (action === "summarize_new" || action === "summarize_one") return summarizeWorkflow;
  return "";
}

function buildWorkflowInputs(action, payload, defaults = {}) {
  const baseUrl = String(payload.base_url || defaults.defaultBaseUrl || "").trim();
  const model =
    String(payload.model || defaults.defaultModel || "qwen3.5-397b-a17b").trim() ||
    "qwen3.5-397b-a17b";
  const clientTag = String(payload.client_tag || "").trim();
  const saveResult = payload.save_result === true || String(payload.save_result || "").toLowerCase() === "true";
  if (action === "summarize_new") {
    return {
      target: "new",
      n: String(Number(payload.n) > 0 ? Number(payload.n) : 30),
      mode: payload.mode === "deep" ? "deep" : "fast",
      latest_day_only: payload.latest_day_only === false ? "false" : "true",
      daily_report: payload.daily_report === false ? "false" : "true",
      base_url: baseUrl,
      model,
      client_tag: clientTag,
      save_result: saveResult ? "true" : "false",
    };
  }

  if (action === "summarize_one") {
    const arxivId = String(payload.arxiv_id || "").trim();
    if (!arxivId) {
      return { __error: "arxiv_id is required for summarize_one" };
    }
    return {
      target: "one",
      arxiv_id: arxivId,
      mode: payload.mode === "fast" ? "fast" : "deep",
      base_url: baseUrl,
      model,
      client_tag: clientTag,
      save_result: saveResult ? "true" : "false",
    };
  }

  return {};
}

function isAllowedOrigin(origin, allowedOrigin) {
  if (!allowedOrigin) return true;
  if (!origin) return false;

  const allowList = allowedOrigin
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  return allowList.includes(origin);
}

function buildCorsHeaders(origin, allowedOrigin) {
  if (!allowedOrigin) {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };
  }

  const allowed = isAllowedOrigin(origin, allowedOrigin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data, ensureAsciiFalseReplacer)}\n\n`;
}

function ensureAsciiFalseReplacer(_key, value) {
  return value;
}

function normalizeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => ({
      role: String(item?.role || "").trim(),
      content: String(item?.content || "").trim(),
    }))
    .filter((m) => ["system", "user", "assistant"].includes(m.role) && m.content)
    .slice(-20);
}

async function handleChatStream({ payload, env, corsHeaders, defaultBaseUrl, defaultModel }) {
  const apiKey = env.LLM_API_KEY || env.DASHSCOPE_API_KEY || env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return json(
      {
        ok: false,
        error: "missing llm api key",
        required: ["LLM_API_KEY (or DASHSCOPE_API_KEY/OPENAI_API_KEY)"],
      },
      500,
      corsHeaders
    );
  }

  const model = String(payload.model || defaultModel || "qwen3.5-397b-a17b").trim() || "qwen3.5-397b-a17b";
  const baseUrl = String(payload.base_url || defaultBaseUrl || "").trim().replace(/\/+$/, "");
  const messages = normalizeMessages(payload.messages);
  if (!messages.length) {
    return json({ ok: false, error: "messages is required for chat_stream" }, 400, corsHeaders);
  }

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return json(
      {
        ok: false,
        error: "upstream chat failed",
        status: upstream.status,
        detail,
      },
      502,
      corsHeaders
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(sse("stage", { message: "LLM connected, generating..." })));
        const reader = upstream.body.getReader();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const sepIndex = buffer.indexOf("\n\n");
            if (sepIndex < 0) break;
            const block = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);
            if (!block.trim()) continue;

            const dataLine = block
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n");
            if (!dataLine) continue;
            if (dataLine === "[DONE]") {
              controller.enqueue(encoder.encode(sse("done", { ok: true })));
              controller.close();
              return;
            }

            let parsed = null;
            try {
              parsed = JSON.parse(dataLine);
            } catch (_) {
              continue;
            }
            const delta = String(parsed?.choices?.[0]?.delta?.content || "");
            const reasoning = String(parsed?.choices?.[0]?.delta?.reasoning_content || "");
            if (reasoning) {
              controller.enqueue(encoder.encode(sse("token", { text: reasoning })));
            }
            if (delta) {
              controller.enqueue(encoder.encode(sse("token", { text: delta })));
            }
          }
        }
        controller.enqueue(encoder.encode(sse("done", { ok: true })));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            sse("error", {
              ok: false,
              message: String(err?.message || err),
            })
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

async function ghJson(url, token) {
  let lastErr = "unknown";
  for (let i = 0; i < 4; i++) {
    try {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "arxiv-trigger-update-worker",
        },
      });
      if (resp.ok) {
        return await resp.json();
      }
      const detail = await resp.text();
      lastErr = `GitHub API ${resp.status}: ${detail}`;
      if (![429, 500, 502, 503, 504].includes(resp.status) || i === 3) {
        throw new Error(lastErr);
      }
    } catch (err) {
      lastErr = String(err?.message || err);
      if (i === 3) {
        throw new Error(lastErr);
      }
    }
    await waitMs(400 * (i + 1));
  }
  throw new Error(lastErr);
}

async function ghText(url, token) {
  let lastErr = "unknown";
  for (let i = 0; i < 4; i++) {
    try {
      let resp = await fetch(url, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "arxiv-trigger-update-worker",
        },
      });

      // GitHub logs endpoints return 302 to a short-lived download URL.
      if (resp.status >= 300 && resp.status < 400) {
        const location = resp.headers.get("Location") || resp.headers.get("location") || "";
        if (!location) {
          throw new Error(`GitHub API ${resp.status}: missing redirect location for logs`);
        }
        resp = await fetch(location, {
          method: "GET",
          redirect: "follow",
          headers: {
            "User-Agent": "arxiv-trigger-update-worker",
          },
        });
      }

      if (resp.ok) {
        return await resp.text();
      }

      const detail = await resp.text();
      lastErr = `log download ${resp.status}: ${detail}`;
      if (![429, 500, 502, 503, 504].includes(resp.status) || i === 3) {
        throw new Error(lastErr);
      }
    } catch (err) {
      lastErr = String(err?.message || err);
      if (i === 3) {
        throw new Error(lastErr);
      }
    }
    await waitMs(400 * (i + 1));
  }
  throw new Error(lastErr);
}

function waitMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function matchRun(run, arxivId, clientTag) {
  const title = `${run?.display_title || ""} ${run?.name || ""}`.toLowerCase();
  if (clientTag && !title.includes(clientTag.toLowerCase())) {
    return false;
  }
  if (arxivId && !title.includes(arxivId.toLowerCase())) {
    return false;
  }
  return true;
}

function summarizeJobs(jobs = []) {
  return jobs.map((job) => ({
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    html_url: job.html_url,
    started_at: job.started_at,
    completed_at: job.completed_at,
    steps: (job.steps || []).map((s) => ({
      name: s.name,
      status: s.status,
      conclusion: s.conclusion,
      number: s.number,
      started_at: s.started_at,
      completed_at: s.completed_at,
    })),
  }));
}

function stripAnsi(input) {
  return String(input || "").replace(/\x1b\[[0-9;]*m/g, "");
}

function normalizeLogLine(input) {
  return stripAnsi(input)
    .replace(/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z\s+/, "")
    .replace(/^[^[]*##\[command\].*$/, "")
    .trim();
}

function extractLiveLogInfo(logText) {
  const rawLines = String(logText || "").split(/\r?\n/);
  const out = [];
  const finalLines = [];
  let inFinalBlock = false;
  let latestStatus = "";

  for (const raw of rawLines) {
    const line = normalizeLogLine(raw);
    if (!line) continue;

    if (line.includes("[FINAL_BEGIN]")) {
      inFinalBlock = true;
      continue;
    }
    if (line.includes("[FINAL_END]")) {
      inFinalBlock = false;
      continue;
    }
    if (inFinalBlock) {
      finalLines.push(line);
      continue;
    }

    const idxLive = line.indexOf("[LIVE]");
    if (idxLive >= 0) {
      const liveLine = line.slice(idxLive);
      out.push(liveLine);
      const statusText = liveLine.replace("[LIVE]", "").trim();
      if (statusText) latestStatus = statusText;
      continue;
    }

    const idxModel = line.indexOf("[MODEL]");
    if (idxModel >= 0) {
      out.push(line.slice(idxModel));
      continue;
    }

    if (
      /^\[\d+\/\d+\]\s+summarizing\s+/i.test(line) ||
      /^success\s*->/i.test(line) ||
      /^failed\s*->/i.test(line) ||
      /^daily report\s*->/i.test(line) ||
      /^ERROR:/i.test(line)
    ) {
      out.push(line);
    }
  }
  return {
    lines: out,
    latest_status: latestStatus,
    final_markdown: finalLines.join("\n").trim(),
  };
}

function pickSummaryJob(rawJobs) {
  const jobs = Array.isArray(rawJobs) ? rawJobs : [];
  const byStep = jobs.find((job) =>
    (job?.steps || []).some((step) => String(step?.name || "").toLowerCase().includes("summarize papers"))
  );
  if (byStep) return byStep;

  const byName = jobs.find((job) => String(job?.name || "").toLowerCase().includes("summarize"));
  if (byName) return byName;

  return jobs[0] || null;
}

async function fetchJobLiveLogs({ owner, repo, token, jobId, sinceLine, maxLines }) {
  if (!jobId) {
    return {
      total_lines: 0,
      from_line: 0,
      lines: [],
      truncated: false,
    };
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`;
  const text = await ghText(url, token);
  const info = extractLiveLogInfo(text);
  const lines = info.lines;
  const total = lines.length;
  const fromLine = Number.isFinite(sinceLine) && sinceLine > 0 ? Math.min(Math.floor(sinceLine), total) : 0;
  const limit = Number.isFinite(maxLines) && maxLines > 0 ? Math.min(Math.floor(maxLines), 200) : 80;
  const next = lines.slice(fromLine, fromLine + limit);
  return {
    total_lines: total,
    from_line: fromLine,
    lines: next,
    truncated: fromLine + limit < total,
    latest_status: info.latest_status || "",
    final_markdown: info.final_markdown || "",
  };
}

async function fetchSummaryStatus({
  owner,
  repo,
  token,
  workflow,
  ref,
  arxivId,
  clientTag,
  sinceLine,
  maxLines,
}) {
  const runsUrl = new URL(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/runs`);
  runsUrl.searchParams.set("event", "workflow_dispatch");
  runsUrl.searchParams.set("branch", ref);
  runsUrl.searchParams.set("per_page", "20");

  const runsResp = await ghJson(runsUrl.toString(), token);
  const runs = Array.isArray(runsResp?.workflow_runs) ? runsResp.workflow_runs : [];

  let run = runs.find((r) => matchRun(r, arxivId, clientTag));
  if (!run) {
    return {
      found: false,
      message: "no matched workflow run found yet",
    };
  }

  const jobsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${run.id}/jobs?per_page=50`;
  const jobsResp = await ghJson(jobsUrl, token);
  const rawJobs = Array.isArray(jobsResp?.jobs) ? jobsResp.jobs : [];
  const jobs = summarizeJobs(rawJobs);
  const summaryJob = pickSummaryJob(rawJobs);

  let liveLogs = {
    total_lines: 0,
    from_line: 0,
    lines: [],
    truncated: false,
  };
  try {
    liveLogs = await fetchJobLiveLogs({
      owner,
      repo,
      token,
      jobId: summaryJob?.id,
      sinceLine,
      maxLines,
    });
  } catch (err) {
    liveLogs = {
      total_lines: 0,
      from_line: 0,
      lines: [],
      truncated: false,
      error: String(err?.message || err),
    };
  }

  return {
    found: true,
    run: {
      id: run.id,
      name: run.name,
      display_title: run.display_title,
      status: run.status,
      conclusion: run.conclusion,
      html_url: run.html_url,
      created_at: run.created_at,
      updated_at: run.updated_at,
    },
    jobs,
    live_logs: liveLogs,
  };
}
