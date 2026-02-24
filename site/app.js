const dataUrl = window.location.pathname.includes("/site/")
  ? "../data/latest_cs_daily.json"
  : "./data/latest_cs_daily.json";
const summariesBaseUrl = window.location.pathname.includes("/site/")
  ? "../outputs/summaries"
  : "./outputs/summaries";
const summaryIndexUrl = `${summariesBaseUrl}/summary_index.json`;
const DISPLAY_TIMEZONE = "Asia/Shanghai";
const DISPLAY_TIMEZONE_LABEL = "北京时间";
const GITHUB_OWNER = "yangfeiyang-123";
const GITHUB_REPO = "arxiv_daily_update";
const WORKFLOW_FILE = "update-cs-ro.yml";
const SUMMARY_WORKFLOW_FILE = "summarize-papers.yml";
const WORKFLOW_PAGE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}`;
const SUMMARY_WORKFLOW_PAGE_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${SUMMARY_WORKFLOW_FILE}`;
const APP_CONFIG = window.MYARXIV_CONFIG || {};
const WORKER_TRIGGER_URL = String(APP_CONFIG.triggerEndpoint || "").trim();
const REALTIME_ENDPOINT = String(APP_CONFIG.realtimeEndpoint || "").trim().replace(/\/+$/, "");
const OPEN_ACTIONS_AFTER_TRIGGER = APP_CONFIG.openActionsAfterTrigger !== false;
const OPEN_SUMMARY_ACTIONS_AFTER_TRIGGER = APP_CONFIG.openSummaryActionsAfterTrigger === true;
const SUMMARY_DAILY_MODE = APP_CONFIG.summaryDailyMode === "deep" ? "deep" : "fast";
const SUMMARY_ONE_MODE = APP_CONFIG.summaryOneMode === "fast" ? "fast" : "deep";
const SUMMARY_BASE_URL = String(APP_CONFIG.summaryBaseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1").trim();
const SUMMARY_MODEL_DEFAULT = String(APP_CONFIG.summaryModel || "qwen3.5-397b-a17b").trim() || "qwen3.5-397b-a17b";
const DATA_CACHE_KEY = "myarxiv_cached_payload_v1";
const DATA_CACHE_NAME = "myarxiv-data-cache-v1";
const SUMMARY_DIALOG_MEMORY_KEY = "myarxiv_summary_dialog_memory_v1";
const SUMMARY_DIALOG_MAX_MESSAGES = 40;
const SUMMARY_DIALOG_MAX_TEXT = 12000;
const SUMMARY_STATUS_POLL_MS = 4500;
const INITIAL_VISIBLE_COUNT = 120;
const VISIBLE_STEP = 120;

const state = {
  fields: new Map(),
  selectedField: "",
  papers: [],
  filtered: [],
  newPaperKeys: new Set(),
  sortBy: "published",
  keyword: "",
  rangeMode: "month",
  windowDays: 30,
  visibleCount: INITIAL_VISIBLE_COUNT,
  summaryIndex: null,
  summaryDialog: {
    open: false,
    activeArxivId: "",
    activeTitle: "",
    activePublished: "",
    messages: [],
    pollTimerId: 0,
    pollContext: null,
    lastStatusSignature: "",
    streamAbort: null,
    streamingText: "",
    streamingActive: false,
  },
};

const fieldSelect = document.getElementById("fieldSelect");
const paperGroups = document.getElementById("paperGroups");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const fetchedAt = document.getElementById("fetchedAt");
const fieldOriginLink = document.getElementById("fieldOriginLink");
const stats = document.getElementById("stats");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const rangeMonthBtn = document.getElementById("rangeMonthBtn");
const rangeDayBtn = document.getElementById("rangeDayBtn");
const triggerUpdateBtn = document.getElementById("triggerUpdateBtn");
const triggerUpdateMsg = document.getElementById("triggerUpdateMsg");
const triggerSummaryDailyBtn = document.getElementById("triggerSummaryDailyBtn");
const triggerSummaryMsg = document.getElementById("triggerSummaryMsg");
const summaryModelInput = document.getElementById("summaryModelInput");
const summaryDialog = document.getElementById("summaryDialog");
const summaryDialogBody = document.getElementById("summaryDialogBody");
const summaryDialogSub = document.getElementById("summaryDialogSub");
const summaryDialogCloseBtn = document.getElementById("summaryDialogCloseBtn");
const summaryDialogClearBtn = document.getElementById("summaryDialogClearBtn");
const summaryDialogRefreshBtn = document.getElementById("summaryDialogRefreshBtn");
const moreWrap = document.getElementById("moreWrap");
const loadMoreBtn = document.getElementById("loadMoreBtn");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDateTime(raw) {
  if (!raw) return "未知时间";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: DISPLAY_TIMEZONE,
  }).format(dt);
  return `${formatted} ${DISPLAY_TIMEZONE_LABEL}`;
}

function formatDateOnly(raw) {
  if (!raw) return "未知日期";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "未知日期";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIMEZONE,
  }).format(dt);
}

function shortText(text, max = 280) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function getPaperIdentity(paper) {
  if (!paper || typeof paper !== "object") return "unknown";
  return paper.id || paper.pdf_url || `${paper.title || "untitled"}|${paper.published || ""}`;
}

function buildPaperKey(fieldCode, paper) {
  return `${fieldCode || "unknown"}::${getPaperIdentity(paper)}`;
}

function buildPaperSignature(fieldCode, paper) {
  return `${buildPaperKey(fieldCode, paper)}::${paper.updated || ""}::${paper.published || ""}`;
}

function collectPaperSignatures(payload) {
  const signatures = new Map();
  const fields = normalizePayload(payload);

  fields.forEach((field) => {
    (field.papers || []).forEach((paper) => {
      signatures.set(buildPaperKey(field.code, paper), buildPaperSignature(field.code, paper));
    });
  });

  return signatures;
}

function computeChangedPaperKeys(oldPayload, newPayload) {
  if (!oldPayload || !newPayload) return new Set();

  const oldSignatures = collectPaperSignatures(oldPayload);
  const newSignatures = collectPaperSignatures(newPayload);
  const changed = new Set();

  newSignatures.forEach((signature, key) => {
    if (!oldSignatures.has(key) || oldSignatures.get(key) !== signature) {
      changed.add(key);
    }
  });

  return changed;
}

function byDateDesc(key) {
  return (a, b) => {
    const ta = new Date(a[key]).getTime() || 0;
    const tb = new Date(b[key]).getTime() || 0;
    return tb - ta;
  };
}

function extractDateKey(raw) {
  if (!raw) return "unknown";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) {
    return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "unknown";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: DISPLAY_TIMEZONE,
  }).formatToParts(dt);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  if (!year || !month || !day) return "unknown";
  return `${year}-${month}-${day}`;
}

function getLatestDateKey(papers) {
  let latest = "";
  papers.forEach((paper) => {
    const key = extractDateKey(paper.published);
    if (key !== "unknown" && key > latest) {
      latest = key;
    }
  });
  return latest || "unknown";
}

function updateRangeButtons() {
  const monthActive = state.rangeMode === "month";
  rangeMonthBtn.classList.toggle("is-active", monthActive);
  rangeDayBtn.classList.toggle("is-active", !monthActive);
}

function setTriggerMessage(text) {
  triggerUpdateMsg.textContent = text;
}

function setSummaryMessage(text) {
  if (triggerSummaryMsg) {
    triggerSummaryMsg.textContent = text;
  }
}

function clampDialogText(text) {
  const value = String(text || "").trim();
  if (value.length <= SUMMARY_DIALOG_MAX_TEXT) return value;
  return `${value.slice(0, SUMMARY_DIALOG_MAX_TEXT)}\n\n[内容过长，已截断显示]`;
}

function extractCanonicalArxivId(arxivId) {
  return String(arxivId || "").replace(/v\d+$/i, "");
}

function persistSummaryDialogMemory() {
  try {
    const mem = {
      open: state.summaryDialog.open,
      activeArxivId: state.summaryDialog.activeArxivId,
      activeTitle: state.summaryDialog.activeTitle,
      activePublished: state.summaryDialog.activePublished,
      messages: state.summaryDialog.messages.slice(-SUMMARY_DIALOG_MAX_MESSAGES),
    };
    localStorage.setItem(SUMMARY_DIALOG_MEMORY_KEY, JSON.stringify(mem));
  } catch (err) {
    console.warn("save summary dialog memory failed", err);
  }
}

function loadSummaryDialogMemory() {
  try {
    const raw = localStorage.getItem(SUMMARY_DIALOG_MEMORY_KEY);
    if (!raw) return;
    const mem = JSON.parse(raw);
    if (!mem || typeof mem !== "object") return;
    state.summaryDialog.open = Boolean(mem.open);
    state.summaryDialog.activeArxivId = String(mem.activeArxivId || "");
    state.summaryDialog.activeTitle = String(mem.activeTitle || "");
    state.summaryDialog.activePublished = String(mem.activePublished || "");
    if (Array.isArray(mem.messages)) {
      state.summaryDialog.messages = mem.messages
        .filter((x) => x && typeof x === "object")
        .map((x) => ({
          role: String(x.role || "system"),
          text: clampDialogText(x.text || ""),
          ts: String(x.ts || ""),
        }))
        .slice(-SUMMARY_DIALOG_MAX_MESSAGES);
    }
  } catch (err) {
    console.warn("load summary dialog memory failed", err);
  }
}

function setSummaryDialogOpen(open) {
  state.summaryDialog.open = Boolean(open);
  if (summaryDialog) {
    summaryDialog.classList.remove("hidden");
    summaryDialog.classList.toggle("is-open", state.summaryDialog.open);
  }
  document.body.classList.toggle("summary-open", state.summaryDialog.open);
  persistSummaryDialogMemory();
}

function renderSummaryDialog() {
  if (!summaryDialog || !summaryDialogBody || !summaryDialogSub) return;

  const sub = state.summaryDialog.activeArxivId
    ? `${state.summaryDialog.activeArxivId}${state.summaryDialog.activeTitle ? ` · ${state.summaryDialog.activeTitle}` : ""}`
    : "未选择论文";
  summaryDialogSub.textContent = sub;

  const hasHistory = state.summaryDialog.messages.length > 0;
  const hasStreaming = state.summaryDialog.streamingActive && state.summaryDialog.streamingText;

  if (!hasHistory && !hasStreaming) {
    summaryDialogBody.innerHTML = `<article class="summary-msg system">点击“AI总结此文”后，这里会显示总结结果。</article>`;
  } else {
    const historyHtml = state.summaryDialog.messages
      .map((msg) => {
        const role = ["user", "assistant", "system"].includes(msg.role) ? msg.role : "system";
        return `<article class="summary-msg ${role}">${escapeHtml(msg.text || "")}</article>`;
      })
      .join("");

    const streamingHtml = hasStreaming
      ? `<article class="summary-msg assistant">${escapeHtml(state.summaryDialog.streamingText)}</article>`
      : "";

    summaryDialogBody.innerHTML = `${historyHtml}${streamingHtml}`;
  }

  summaryDialogBody.scrollTop = summaryDialogBody.scrollHeight;
}

function pushSummaryDialogMessage(role, text) {
  const value = clampDialogText(text);
  if (!value) return;
  state.summaryDialog.messages.push({
    role,
    text: value,
    ts: new Date().toISOString(),
  });
  if (state.summaryDialog.messages.length > SUMMARY_DIALOG_MAX_MESSAGES) {
    state.summaryDialog.messages = state.summaryDialog.messages.slice(-SUMMARY_DIALOG_MAX_MESSAGES);
  }
  persistSummaryDialogMemory();
  renderSummaryDialog();
}

function clearSummaryDialogMemory() {
  state.summaryDialog.messages = [];
  persistSummaryDialogMemory();
  renderSummaryDialog();
}

function setActiveSummaryPaper(meta = {}) {
  state.summaryDialog.activeArxivId = String(meta.arxivId || "");
  state.summaryDialog.activeTitle = String(meta.title || "");
  state.summaryDialog.activePublished = String(meta.published || "");
  persistSummaryDialogMemory();
  renderSummaryDialog();
}

async function ensureSummaryIndex(force = false) {
  if (state.summaryIndex && !force) return state.summaryIndex;
  try {
    const resp = await fetch(summaryIndexUrl, { cache: "no-cache" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.summaryIndex = await resp.json();
    return state.summaryIndex;
  } catch (err) {
    state.summaryIndex = null;
    return null;
  }
}

function buildSummaryCandidatePaths(arxivId, published) {
  const candidates = [];
  const cleanId = extractArxivId(arxivId);
  const canonical = extractCanonicalArxivId(cleanId);
  if (published) {
    const dt = new Date(published);
    if (!Number.isNaN(dt.getTime())) {
      const datePart = new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      }).format(dt);
      if (cleanId) {
        candidates.push(`${summariesBaseUrl}/${datePart}_${cleanId}.md`);
      }
      if (canonical && canonical !== cleanId) {
        candidates.push(`${summariesBaseUrl}/${datePart}_${canonical}.md`);
      }
    }
  }
  if (cleanId) {
    candidates.push(`${summariesBaseUrl}/${cleanId}.md`);
  }
  if (canonical && canonical !== cleanId) {
    candidates.push(`${summariesBaseUrl}/${canonical}.md`);
  }
  return [...new Set(candidates)];
}

function readSummaryPathFromIndex(arxivId) {
  const index = state.summaryIndex;
  if (!index || typeof index !== "object") return "";
  const items = index.items && typeof index.items === "object" ? index.items : null;
  if (!items) return "";
  const cleanId = extractArxivId(arxivId);
  const canonical = extractCanonicalArxivId(cleanId);
  const entry = items[cleanId] || items[canonical];
  if (!entry || typeof entry !== "object") return "";
  const relPath = String(entry.summary_path || entry.summary_file || "").trim();
  if (!relPath) return "";
  if (relPath.startsWith("http://") || relPath.startsWith("https://")) return relPath;
  if (relPath.startsWith("outputs/summaries/")) {
    return window.location.pathname.includes("/site/") ? `../${relPath}` : `./${relPath}`;
  }
  if (relPath.endsWith(".md")) {
    return `${summariesBaseUrl}/${relPath.replace(/^\/+/, "")}`;
  }
  return "";
}

async function fetchSummaryMarkdown(meta, forceIndex = false) {
  await ensureSummaryIndex(forceIndex);
  const paths = [];
  const fromIndex = readSummaryPathFromIndex(meta.arxivId || "");
  if (fromIndex) paths.push(fromIndex);
  paths.push(...buildSummaryCandidatePaths(meta.arxivId || "", meta.published || ""));

  const uniquePaths = [...new Set(paths)];
  for (const path of uniquePaths) {
    try {
      const resp = await fetch(path, { cache: "no-cache" });
      if (!resp.ok) continue;
      const text = await resp.text();
      if (text && text.trim().length > 120) {
        return { text: text.trim(), path };
      }
    } catch (_) {
      // Try next candidate.
    }
  }
  return null;
}

function getCachedPayload() {
  const raw = localStorage.getItem(DATA_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (err) {
    console.warn("invalid cache payload", err);
    return null;
  }
}

function setCachedPayload(payload) {
  try {
    localStorage.setItem(DATA_CACHE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("cache save failed", err);
  }
}

async function getCachedPayloadFromCacheApi() {
  if (!("caches" in window)) return null;
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const reqUrl = new URL(dataUrl, window.location.href).toString();
    const cachedResp = await cache.match(reqUrl);
    if (!cachedResp) return null;
    return await cachedResp.json();
  } catch (err) {
    console.warn("cache api read failed", err);
    return null;
  }
}

async function setCachedPayloadToCacheApi(payload) {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const reqUrl = new URL(dataUrl, window.location.href).toString();
    const resp = new Response(JSON.stringify(payload), {
      headers: {
        "Content-Type": "application/json",
      },
    });
    await cache.put(reqUrl, resp);
  } catch (err) {
    console.warn("cache api write failed", err);
  }
}

function openWorkflowPage(url, msg) {
  window.open(url, "_blank", "noopener,noreferrer");
  if (msg) {
    setTriggerMessage(msg);
  }
}

function openSummaryWorkflowPage(msg) {
  window.open(SUMMARY_WORKFLOW_PAGE_URL, "_blank", "noopener,noreferrer");
  if (msg) {
    setSummaryMessage(msg);
  }
}

function getSelectedSummaryModel() {
  if (summaryModelInput && summaryModelInput.value) {
    return summaryModelInput.value.trim();
  }
  return SUMMARY_MODEL_DEFAULT;
}

async function dispatchWorkerAction(action, payload = {}) {
  if (!WORKER_TRIGGER_URL) {
    throw new Error("missing worker endpoint");
  }
  const resp = await fetch(WORKER_TRIGGER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      ref: "main",
      ...payload,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${detail}`);
  }
  return await resp.json();
}

function summarizeRunStatusText(statusPayload) {
  if (!statusPayload || !statusPayload.found || !statusPayload.run) {
    return "等待工作流创建中...";
  }
  const run = statusPayload.run;
  const lines = [
    `工作流状态：${run.status || "unknown"}${run.conclusion ? ` / ${run.conclusion}` : ""}`,
  ];
  const jobs = Array.isArray(statusPayload.jobs) ? statusPayload.jobs : [];
  jobs.forEach((job) => {
    lines.push(`- Job ${job.name || "unnamed"}：${job.status || "unknown"}${job.conclusion ? ` / ${job.conclusion}` : ""}`);
    const steps = Array.isArray(job.steps) ? job.steps : [];
    steps.forEach((step) => {
      lines.push(`  · ${step.name || "step"}：${step.status || "unknown"}${step.conclusion ? ` / ${step.conclusion}` : ""}`);
    });
  });
  return lines.join("\n");
}

function stopSummaryStatusPolling() {
  const timerId = state.summaryDialog.pollTimerId;
  if (timerId) {
    clearInterval(timerId);
  }
  state.summaryDialog.pollTimerId = 0;
  state.summaryDialog.pollContext = null;
  state.summaryDialog.lastStatusSignature = "";
}

async function pollSummaryStatusOnce() {
  const ctx = state.summaryDialog.pollContext;
  if (!ctx) return;
  try {
    const statusPayload = await dispatchWorkerAction("summary_status", {
      client_tag: ctx.clientTag || "",
      arxiv_id: ctx.arxivId || "",
    });
    const statusText = summarizeRunStatusText(statusPayload);
    if (statusText !== state.summaryDialog.lastStatusSignature) {
      state.summaryDialog.lastStatusSignature = statusText;
      pushSummaryDialogMessage("system", statusText);
    }

    const run = statusPayload?.run;
    if (!run || run.status !== "completed") {
      return;
    }

    stopSummaryStatusPolling();

    if (run.conclusion !== "success") {
      pushSummaryDialogMessage(
        "system",
        `任务完成但失败：${run.conclusion || "unknown"}\n可在 Actions 查看详情：${run.html_url || SUMMARY_WORKFLOW_PAGE_URL}`
      );
      return;
    }

    if (ctx.type === "one") {
      const found = await fetchSummaryMarkdown(ctx.meta || {}, true);
      if (found) {
        pushSummaryDialogMessage("assistant", `总结已生成（${found.path}）\n\n${found.text}`);
      } else {
        pushSummaryDialogMessage("system", "任务成功，但网站还未同步到最新总结文件，请稍后点“刷新”。");
      }
    } else {
      pushSummaryDialogMessage("system", "批量总结任务已完成。你可以在页面刷新后查看最新结果。");
    }
  } catch (err) {
    const raw = String(err?.message || err);
    const msg = `状态轮询失败：${raw}`;
    if (raw.includes("invalid action") && raw.includes("supported_actions")) {
      stopSummaryStatusPolling();
      pushSummaryDialogMessage(
        "system",
        "当前 Worker 还是旧版本，不支持 summary_status。请重新执行 wrangler deploy 后再试。"
      );
      return;
    }
    if (msg !== state.summaryDialog.lastStatusSignature) {
      state.summaryDialog.lastStatusSignature = msg;
      pushSummaryDialogMessage("system", msg);
    }
  }
}

function startSummaryStatusPolling(context) {
  stopSummaryStatusPolling();
  state.summaryDialog.pollContext = context;
  pollSummaryStatusOnce();
  state.summaryDialog.pollTimerId = window.setInterval(() => {
    pollSummaryStatusOnce();
  }, SUMMARY_STATUS_POLL_MS);
}

function stopRealtimeStream() {
  const ctrl = state.summaryDialog.streamAbort;
  if (ctrl) {
    try {
      ctrl.abort();
    } catch (_) {
      // ignore
    }
  }
  state.summaryDialog.streamAbort = null;
  state.summaryDialog.streamingActive = false;
  state.summaryDialog.streamingText = "";
}

function appendStreamingToken(text) {
  if (!text) return;
  state.summaryDialog.streamingActive = true;
  state.summaryDialog.streamingText += text;
  if (state.summaryDialog.streamingText.length > SUMMARY_DIALOG_MAX_TEXT * 4) {
    state.summaryDialog.streamingText = state.summaryDialog.streamingText.slice(-SUMMARY_DIALOG_MAX_TEXT * 4);
  }
  renderSummaryDialog();
}

function finalizeStreamingAsAssistant() {
  if (!state.summaryDialog.streamingText) {
    state.summaryDialog.streamingActive = false;
    state.summaryDialog.streamingText = "";
    renderSummaryDialog();
    return;
  }
  pushSummaryDialogMessage("assistant", state.summaryDialog.streamingText);
  state.summaryDialog.streamingActive = false;
  state.summaryDialog.streamingText = "";
  renderSummaryDialog();
}

function parseSseBlock(rawBlock) {
  const lines = rawBlock.split(/\r?\n/);
  let eventName = "message";
  const dataLines = [];
  lines.forEach((line) => {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim() || "message";
      return;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  });
  const rawData = dataLines.join("\n");
  let data = rawData;
  try {
    data = JSON.parse(rawData);
  } catch (_) {
    // keep as string
  }
  return { eventName, data };
}

async function streamSummaryViaRealtime(meta) {
  if (!REALTIME_ENDPOINT) return false;
  stopSummaryStatusPolling();
  stopRealtimeStream();

  const ctrl = new AbortController();
  state.summaryDialog.streamAbort = ctrl;
  state.summaryDialog.streamingActive = true;
  state.summaryDialog.streamingText = "";
  renderSummaryDialog();

  const url = `${REALTIME_ENDPOINT}/api/summarize-one/stream`;
  const model = getSelectedSummaryModel();

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        arxiv_id: meta.arxivId,
        mode: SUMMARY_ONE_MODE,
        model,
        base_url: SUMMARY_BASE_URL,
        input_path: "data/latest_cs_daily.json",
        output_dir: "outputs/summaries",
        save: true,
      }),
      signal: ctrl.signal,
    });
  } catch (err) {
    stopRealtimeStream();
    pushSummaryDialogMessage("system", `实时接口不可用：${String(err?.message || err)}`);
    return false;
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    stopRealtimeStream();
    pushSummaryDialogMessage("system", `实时流启动失败：HTTP ${response.status} ${detail}`);
    return false;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const sepIndex = buffer.indexOf("\n\n");
        if (sepIndex < 0) break;
        const rawBlock = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);
        if (!rawBlock.trim()) continue;

        const evt = parseSseBlock(rawBlock);
        const data = evt.data && typeof evt.data === "object" ? evt.data : {};

        if (evt.eventName === "stage") {
          const msg = data.message || data.name || "阶段更新";
          pushSummaryDialogMessage("system", String(msg));
          continue;
        }

        if (evt.eventName === "chunk") {
          pushSummaryDialogMessage(
            "system",
            `分块进度：${data.index || "?"}/${data.total || "?"} (${data.chunk_id || "-"})`
          );
          continue;
        }

        if (evt.eventName === "token") {
          appendStreamingToken(String(data.text || ""));
          continue;
        }

        if (evt.eventName === "done") {
          finalizeStreamingAsAssistant();
          pushSummaryDialogMessage(
            "system",
            `实时总结完成：${String(data.summary_path || "已生成")}`
          );
          stopRealtimeStream();
          return true;
        }

        if (evt.eventName === "error") {
          finalizeStreamingAsAssistant();
          pushSummaryDialogMessage("system", `实时总结失败：${String(data.message || "unknown error")}`);
          stopRealtimeStream();
          return false;
        }
      }
    }
  } catch (err) {
    if (!ctrl.signal.aborted) {
      finalizeStreamingAsAssistant();
      pushSummaryDialogMessage("system", `实时流中断：${String(err?.message || err)}`);
    }
    stopRealtimeStream();
    return false;
  }

  finalizeStreamingAsAssistant();
  stopRealtimeStream();
  return true;
}

async function triggerUpdateViaWorker() {
  if (!WORKER_TRIGGER_URL) {
    setTriggerMessage("未配置 Worker 触发地址，正在打开 Actions 页面。");
    openWorkflowPage(WORKFLOW_PAGE_URL, "已打开 GitHub Actions 页面，请点击 Run workflow。");
    return;
  }

  triggerUpdateBtn.disabled = true;
  triggerUpdateBtn.textContent = "触发中...";
  setTriggerMessage("正在触发后台更新任务...");

  try {
    await dispatchWorkerAction("update");
    setTriggerMessage("更新任务已触发。");
    if (OPEN_ACTIONS_AFTER_TRIGGER) {
      setTimeout(() => {
        window.open(WORKFLOW_PAGE_URL, "_blank", "noopener,noreferrer");
      }, 350);
    }
    return;
  } catch (err) {
    console.error(err);
    setTriggerMessage("网络错误，已打开 Actions 页面。");
    openWorkflowPage(WORKFLOW_PAGE_URL, "已打开 GitHub Actions 页面，请点击 Run workflow。");
  } finally {
    triggerUpdateBtn.disabled = false;
    triggerUpdateBtn.textContent = "一键触发更新";
  }
}

function extractArxivId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  let cleaned = raw.replace(/[#?].*$/, "").replace(/\.pdf$/i, "");
  if (cleaned.includes("/abs/")) {
    cleaned = cleaned.split("/abs/").pop();
  } else if (cleaned.includes("/pdf/")) {
    cleaned = cleaned.split("/pdf/").pop();
  } else if (cleaned.includes("/html/")) {
    cleaned = cleaned.split("/html/").pop();
  }
  return cleaned.replace(/^\/+|\/+$/g, "");
}

async function triggerSummaryDailyViaWorker() {
  if (!triggerSummaryDailyBtn) return;
  stopRealtimeStream();
  setSummaryDialogOpen(true);
  if (!WORKER_TRIGGER_URL) {
    openSummaryWorkflowPage("未配置 Worker，已打开总结 workflow 页面。");
    return;
  }

  const clientTag = `daily-${Date.now().toString(36)}`;
  triggerSummaryDailyBtn.disabled = true;
  triggerSummaryDailyBtn.textContent = "触发中...";
  setSummaryMessage("正在触发“最近1天新文”批量总结任务...");
  try {
    await dispatchWorkerAction("summarize_new", {
      mode: SUMMARY_DAILY_MODE,
      latest_day_only: true,
      daily_report: true,
      n: 300,
      model: getSelectedSummaryModel(),
      base_url: SUMMARY_BASE_URL,
      client_tag: clientTag,
    });
    setSummaryMessage("批量总结任务已触发。总结完成后会自动写入仓库并部署。");
    startSummaryStatusPolling({
      type: "daily",
      clientTag,
      arxivId: "",
    });
    pushSummaryDialogMessage("system", "已触发批量总结，正在实时轮询任务进度...");
    if (OPEN_SUMMARY_ACTIONS_AFTER_TRIGGER) {
      setTimeout(() => {
        window.open(SUMMARY_WORKFLOW_PAGE_URL, "_blank", "noopener,noreferrer");
      }, 350);
    }
  } catch (err) {
    console.error(err);
    setSummaryMessage(`触发失败：${String(err?.message || err)}`);
    openSummaryWorkflowPage("触发失败，已打开总结 workflow 页面。");
  } finally {
    triggerSummaryDailyBtn.disabled = false;
    triggerSummaryDailyBtn.textContent = "一键总结最近1天新文";
  }
}

async function triggerSummaryOneViaWorker(arxivId, btn, options = {}) {
  if (!arxivId) {
    setSummaryMessage("无法识别 arXiv ID，已跳过。");
    return false;
  }
  if (!WORKER_TRIGGER_URL) {
    if (options.openWorkflowOnError !== false) {
      openSummaryWorkflowPage("未配置 Worker，已打开总结 workflow 页面。");
    }
    return false;
  }

  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "触发中...";
  setSummaryMessage(`正在触发单篇总结：${arxivId}`);
  const clientTag = `one-${arxivId}-${Date.now().toString(36)}`;

  try {
    await dispatchWorkerAction("summarize_one", {
      mode: SUMMARY_ONE_MODE,
      arxiv_id: arxivId,
      model: getSelectedSummaryModel(),
      base_url: SUMMARY_BASE_URL,
      client_tag: clientTag,
    });
    setSummaryMessage(`单篇总结任务已触发：${arxivId}`);
    if (OPEN_SUMMARY_ACTIONS_AFTER_TRIGGER) {
      setTimeout(() => {
        window.open(SUMMARY_WORKFLOW_PAGE_URL, "_blank", "noopener,noreferrer");
      }, 350);
    }
    return { ok: true, clientTag };
  } catch (err) {
    console.error(err);
    setSummaryMessage(`单篇触发失败：${String(err?.message || err)}`);
    if (options.openWorkflowOnError !== false) {
      openSummaryWorkflowPage("单篇总结触发失败，已打开总结 workflow 页面。");
    }
    return { ok: false, clientTag: "" };
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function showSummaryInDialogForPaper(meta, btn) {
  setSummaryDialogOpen(true);
  setActiveSummaryPaper(meta);
  pushSummaryDialogMessage("user", `请总结论文：${meta.arxivId}`);
  pushSummaryDialogMessage("system", "正在检查是否已有总结...");

  const found = await fetchSummaryMarkdown(meta);
  if (found) {
    pushSummaryDialogMessage("assistant", `已找到总结（${found.path}）\n\n${found.text}`);
    return;
  }

  if (REALTIME_ENDPOINT) {
    pushSummaryDialogMessage("system", "未找到现成总结，开始实时流式总结...");
    const streamed = await streamSummaryViaRealtime(meta);
    if (streamed) return;
    pushSummaryDialogMessage("system", "实时流不可用，回退到后台任务模式。");
  }

  pushSummaryDialogMessage("system", "当前还没有可用总结，正在触发后台单篇总结任务。");
  const result = await triggerSummaryOneViaWorker(meta.arxivId, btn, { openWorkflowOnError: false });
  if (result.ok) {
    pushSummaryDialogMessage(
      "system",
      "总结任务已触发。下面会实时显示任务阶段进度。"
    );
    startSummaryStatusPolling({
      type: "one",
      clientTag: result.clientTag,
      arxivId: meta.arxivId,
      meta,
    });
  } else {
    pushSummaryDialogMessage(
      "system",
      "总结任务触发失败。请检查 Worker 部署、仓库 Secret（DASHSCOPE_API_KEY）和 Actions 日志。"
    );
  }
}

async function refreshSummaryDialog() {
  const arxivId = state.summaryDialog.activeArxivId;
  if (!arxivId) {
    pushSummaryDialogMessage("system", "未选择论文，无法刷新。");
    return;
  }
  const meta = {
    arxivId,
    title: state.summaryDialog.activeTitle,
    published: state.summaryDialog.activePublished,
  };
  pushSummaryDialogMessage("system", "正在刷新总结内容...");
  const found = await fetchSummaryMarkdown(meta, true);
  if (found) {
    pushSummaryDialogMessage("assistant", `刷新成功（${found.path}）\n\n${found.text}`);
    return;
  }
  pushSummaryDialogMessage("system", "仍未找到总结文件，请稍后再试；如果任务在跑，下面会持续显示进度。");
}

function getCurrentField() {
  return state.fields.get(state.selectedField) || null;
}

function getCurrentPapers() {
  const field = getCurrentField();
  return field?.papers || [];
}

function renderFieldOptions() {
  const options = [...state.fields.values()]
    .map(
      (field) =>
        `<option value="${escapeHtml(field.code)}">${escapeHtml(field.code)} · ${escapeHtml(field.name)}</option>`
    )
    .join("");

  fieldSelect.innerHTML = options;

  if (state.selectedField) {
    fieldSelect.value = state.selectedField;
  }
}

function updateOriginLink() {
  const field = getCurrentField();
  if (!field) return;
  fieldOriginLink.href = `https://arxiv.org/list/${encodeURIComponent(field.code)}/recent`;
}

function groupByPublishedDate(papers) {
  const bucket = new Map();

  papers.forEach((paper) => {
    const dateKey = extractDateKey(paper.published || "");
    if (!bucket.has(dateKey)) {
      bucket.set(dateKey, []);
    }
    bucket.get(dateKey).push(paper);
  });

  const groups = [...bucket.entries()].map(([dateKey, list]) => {
    const ts = dateKey === "unknown" ? -1 : new Date(`${dateKey}T00:00:00Z`).getTime();
    return {
      dateKey,
      displayDate: dateKey === "unknown" ? "未知日期" : formatDateOnly(`${dateKey}T00:00:00Z`),
      ts,
      papers: list,
    };
  });

  groups.sort((a, b) => b.ts - a.ts);
  return groups;
}

function applyFilters() {
  const query = state.keyword.trim().toLowerCase();
  state.papers = getCurrentPapers();
  let list = [...state.papers];

  if (state.rangeMode === "latest_day") {
    const latestDateKey = getLatestDateKey(state.papers);
    list = list.filter((paper) => extractDateKey(paper.published) === latestDateKey);
  }

  if (query) {
    list = list.filter((paper) => {
      const fulltext = [
        paper.title,
        paper.summary,
        ...(paper.authors || []),
        ...(paper.categories || []),
      ]
        .join(" ")
        .toLowerCase();
      return fulltext.includes(query);
    });
  }

  if (state.sortBy === "title") {
    list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  } else {
    list.sort(byDateDesc(state.sortBy));
  }

  state.visibleCount = INITIAL_VISIBLE_COUNT;
  state.filtered = list;

  renderStats();
  renderPapersGroupedByDate();
}

function renderStats() {
  const currentField = getCurrentField();
  const currentFieldCode = currentField?.code || "";
  const paperCount = state.filtered.length;
  const allCount = state.papers.length;
  const dateGroups = groupByPublishedDate(state.filtered).length;
  const newCount = state.filtered.filter((paper) => state.newPaperKeys.has(buildPaperKey(currentFieldCode, paper))).length;
  const rangeLabel =
    state.rangeMode === "month"
      ? `最近${state.windowDays}天`
      : "最近1天（最新日期）";

  stats.innerHTML = `
    <article class="stat">
      <div class="stat-label">当前领域</div>
      <div class="stat-value">${escapeHtml(currentField ? currentField.code : "-")}</div>
    </article>
    <article class="stat">
      <div class="stat-label">当前结果 / 领域总量</div>
      <div class="stat-value">${Math.min(state.visibleCount, paperCount)} / ${allCount}</div>
    </article>
    <article class="stat">
      <div class="stat-label">时间范围 / 日期分组 / 新增</div>
      <div class="stat-value">${escapeHtml(rangeLabel)} / ${dateGroups} / ${newCount}</div>
    </article>
  `;
}

function renderPaperCard(paper, index) {
  const categories = (paper.categories || []).slice(0, 3);
  const chips = categories
    .map((cat) => `<span class="chip">${escapeHtml(cat)}</span>`)
    .join("");
  const isNew = state.newPaperKeys.has(buildPaperKey(state.selectedField, paper));

  const arxivUrl = escapeHtml(paper.id || "#");
  const pdfUrl = escapeHtml(paper.pdf_url || paper.id || "#");
  const arxivId = escapeHtml(extractArxivId(paper.id || paper.pdf_url || ""));
  const published = escapeHtml(paper.published || "");
  const title = escapeHtml(paper.title || "Untitled");

  return `
    <article class="paper ${isNew ? "paper--new" : ""}" style="animation-delay:${Math.min(index * 35, 420)}ms">
      ${isNew ? '<div class="paper-new-badge">NEW</div>' : ""}
      <h2 class="paper-title">
        <a href="${arxivUrl}" target="_blank" rel="noreferrer">${escapeHtml(paper.title || "Untitled")}</a>
      </h2>
      <p class="paper-meta">作者：${escapeHtml((paper.authors || []).join(", ") || "Unknown")}</p>
      <p class="paper-meta">发布时间：${formatDateTime(paper.published)} · 更新时间：${formatDateTime(paper.updated)}</p>
      <p class="paper-summary">${escapeHtml(shortText(paper.summary || ""))}</p>
      <div class="chips">${chips}</div>
      <div class="paper-links">
        <a class="paper-link" href="${pdfUrl}" target="_blank" rel="noreferrer">阅读 PDF</a>
        <a class="paper-link alt" href="${arxivUrl}" target="_blank" rel="noreferrer">arXiv 页面</a>
        <button type="button" class="paper-link ai js-summarize-one" data-arxiv-id="${arxivId}" data-published="${published}" data-title="${title}">AI总结此文</button>
      </div>
    </article>
  `;
}

function renderPapersGroupedByDate() {
  paperGroups.innerHTML = "";
  moreWrap.classList.add("hidden");

  if (!state.filtered.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  const visiblePapers = state.filtered.slice(0, state.visibleCount);
  const groups = groupByPublishedDate(visiblePapers);
  let globalIndex = 0;

  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "date-group";

    const cardsHtml = group.papers
      .map((paper) => {
        const card = renderPaperCard(paper, globalIndex);
        globalIndex += 1;
        return card;
      })
      .join("");

    section.innerHTML = `
      <header class="date-group-header">
        <h3>${escapeHtml(group.displayDate)}</h3>
        <span>${group.papers.length} 篇</span>
      </header>
      <div class="paper-grid">${cardsHtml}</div>
    `;

    paperGroups.appendChild(section);
  });

  if (state.filtered.length > state.visibleCount) {
    moreWrap.classList.remove("hidden");
    loadMoreBtn.textContent = `加载更多（已显示 ${visiblePapers.length}/${state.filtered.length}）`;
  }
}

function bindEvents() {
  loadSummaryDialogMemory();
  renderSummaryDialog();
  setSummaryDialogOpen(state.summaryDialog.open);

  if (summaryModelInput && SUMMARY_MODEL_DEFAULT) {
    summaryModelInput.value = SUMMARY_MODEL_DEFAULT;
  }

  fieldSelect.addEventListener("change", (event) => {
    state.selectedField = event.target.value;
    updateOriginLink();
    applyFilters();
  });

  searchInput.addEventListener("input", (event) => {
    state.keyword = event.target.value || "";
    applyFilters();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    applyFilters();
  });

  rangeMonthBtn.addEventListener("click", () => {
    if (state.rangeMode === "month") return;
    state.rangeMode = "month";
    updateRangeButtons();
    applyFilters();
  });

  rangeDayBtn.addEventListener("click", () => {
    if (state.rangeMode === "latest_day") return;
    state.rangeMode = "latest_day";
    updateRangeButtons();
    applyFilters();
  });

  triggerUpdateBtn.addEventListener("click", () => {
    triggerUpdateViaWorker();
  });

  if (triggerSummaryDailyBtn) {
    triggerSummaryDailyBtn.addEventListener("click", () => {
      triggerSummaryDailyViaWorker();
    });
  }

  if (summaryDialogCloseBtn) {
    summaryDialogCloseBtn.addEventListener("click", () => {
      stopSummaryStatusPolling();
      stopRealtimeStream();
      setSummaryDialogOpen(false);
    });
  }

  if (summaryDialogClearBtn) {
    summaryDialogClearBtn.addEventListener("click", () => {
      clearSummaryDialogMemory();
      pushSummaryDialogMessage("system", "已清空本地记忆。");
    });
  }

  if (summaryDialogRefreshBtn) {
    summaryDialogRefreshBtn.addEventListener("click", () => {
      refreshSummaryDialog();
    });
  }

  paperGroups.addEventListener("click", (event) => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    const target = el.closest(".js-summarize-one");
    if (!target) return;
    const meta = {
      arxivId: target.getAttribute("data-arxiv-id") || "",
      title: target.getAttribute("data-title") || "",
      published: target.getAttribute("data-published") || "",
    };
    showSummaryInDialogForPaper(meta, target);
  });

  loadMoreBtn.addEventListener("click", () => {
    state.visibleCount += VISIBLE_STEP;
    renderStats();
    renderPapersGroupedByDate();
  });
}

function normalizePayload(payload) {
  if (Array.isArray(payload.fields) && payload.fields.length > 0) {
    return payload.fields.map((field) => ({
      code: field.code,
      name: field.name || field.code,
      papers: field.papers || [],
    }));
  }

  const fallback = payload.papers || [];
  return [
    {
      code: "cs.RO",
      name: "Robotics",
      papers: fallback,
    },
  ];
}

function applyPayload(payload, sourceLabel, options = {}) {
  const fields = normalizePayload(payload);
  state.fields = new Map(fields.map((field) => [field.code, field]));
  state.selectedField = fields[0]?.code || "";
  state.newPaperKeys = options.newPaperKeys instanceof Set ? options.newPaperKeys : new Set();
  state.windowDays = Number(payload.window_days) > 0 ? Number(payload.window_days) : 30;
  state.rangeMode = "month";

  renderFieldOptions();
  updateRangeButtons();
  updateOriginLink();
  fetchedAt.textContent = `最近更新：${formatDateTime(payload.fetched_at)}（数据窗口：最近${state.windowDays}天，${sourceLabel}）`;
  applyFilters();
}

async function loadData() {
  let hasRenderedCache = false;
  let cachedPayload = null;
  try {
    let cached = await getCachedPayloadFromCacheApi();
    if (!cached) {
      cached = getCachedPayload();
    }
    if (cached) {
      cachedPayload = cached;
      applyPayload(cached, "本地缓存");
      hasRenderedCache = true;
    }

    const resp = await fetch(dataUrl, { cache: "no-cache" });
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const payload = await resp.json();
    setCachedPayload(payload);
    await setCachedPayloadToCacheApi(payload);
    const changedPaperKeys = computeChangedPaperKeys(cachedPayload, payload);
    applyPayload(payload, "在线数据", { newPaperKeys: changedPaperKeys });
  } catch (err) {
    console.error(err);
    if (!hasRenderedCache) {
      errorState.classList.remove("hidden");
    } else {
      setTriggerMessage("网络较慢，当前显示的是本地缓存数据。");
    }
  }
}

bindEvents();
loadData();
