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
    const workflow = env.GITHUB_WORKFLOW_FILE || "update-cs-ro.yml";
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

    const ghResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref }),
      }
    );

    if (ghResp.status === 204) {
      return json({ ok: true, message: "workflow dispatched", workflow, ref }, 200, corsHeaders);
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
