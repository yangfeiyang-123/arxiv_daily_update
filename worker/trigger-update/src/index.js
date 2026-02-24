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
    const defaultBaseUrl = env.DEFAULT_LLM_BASE_URL || "https://coding.dashscope.aliyuncs.com/v1";
    const defaultModel = env.DEFAULT_LLM_MODEL || "qwen-plus";
    const workflow = resolveWorkflow(action, updateWorkflow, summarizeWorkflow);
    if (!workflow) {
      return json(
        {
          ok: false,
          error: "invalid action",
          supported_actions: ["update", "summarize_new", "summarize_one"],
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
  const model = String(payload.model || defaults.defaultModel || "qwen-plus").trim() || "qwen-plus";
  if (action === "summarize_new") {
    return {
      target: "new",
      n: String(Number(payload.n) > 0 ? Number(payload.n) : 30),
      mode: payload.mode === "deep" ? "deep" : "fast",
      latest_day_only: payload.latest_day_only === false ? "false" : "true",
      daily_report: payload.daily_report === false ? "false" : "true",
      base_url: baseUrl,
      model,
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
