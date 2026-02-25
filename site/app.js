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
const ENABLE_LOCAL_REALTIME = APP_CONFIG.enableLocalRealtime === true;
const OPEN_ACTIONS_AFTER_TRIGGER = APP_CONFIG.openActionsAfterTrigger !== false;
const OPEN_SUMMARY_ACTIONS_AFTER_TRIGGER = APP_CONFIG.openSummaryActionsAfterTrigger === true;
const SUMMARY_DAILY_MODE = APP_CONFIG.summaryDailyMode === "deep" ? "deep" : "fast";
const SUMMARY_ONE_MODE = APP_CONFIG.summaryOneMode === "fast" ? "fast" : "deep";
const SUMMARY_BASE_URL = String(APP_CONFIG.summaryBaseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1").trim();
const SUMMARY_MODEL_DEFAULT = String(APP_CONFIG.summaryModel || "qwen3.5-397b-a17b").trim() || "qwen3.5-397b-a17b";
const SUMMARY_PERSIST_RESULTS = APP_CONFIG.summaryPersistResults === true;
const DATA_CACHE_KEY = "myarxiv_cached_payload_v1";
const DATA_CACHE_NAME = "myarxiv-data-cache-v1";
const SUMMARY_DIALOG_MEMORY_KEY = "myarxiv_summary_dialog_memory_v1";
const SUMMARY_UI_PREF_KEY = "myarxiv_summary_ui_pref_v1";
const SUMMARY_DIALOG_MAX_MESSAGES = 40;
const SUMMARY_DIALOG_MAX_TEXT = 12000;
const SUMMARY_CONVERSATION_MAX = 24;
const SUMMARY_MESSAGE_DELETE_FADE_MS = 1000;
const SUMMARY_MESSAGE_DELETE_CONFIRM_MS = 1800;
const DAILY_PIN_CONVERSATION_ID = "conv-daily-pinned";
const DAILY_PIN_CONVERSATION_TITLE = "每日新文总结";
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
    conversations: [],
    activeConversationId: "",
    activeArxivId: "",
    activeTitle: "",
    activePublished: "",
    activePaperSummary: "",
    activePaperUrl: "",
    activePaperPdfUrl: "",
    activePaperField: "",
    messages: [],
    pollTimerId: 0,
    pollContext: null,
    lastStatusSignature: "",
    streamAbort: null,
    streamingText: "",
    streamingActive: false,
    loading: false,
    loadingStatus: "",
    aiSidebarEnabled: APP_CONFIG.aiSidebarEnabled !== false,
    chatEnabled: true,
    chatStreaming: false,
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
const aiPanelEnabledToggle = document.getElementById("aiPanelEnabledToggle");
const openAiPanelBtn = document.getElementById("openAiPanelBtn");
const summaryDialog = document.getElementById("summaryDialog");
const summaryDialogBody = document.getElementById("summaryDialogBody");
const summaryDialogSub = document.getElementById("summaryDialogSub");
const summaryDialogNotice = document.getElementById("summaryDialogNotice");
const summaryDialogCloseBtn = document.getElementById("summaryDialogCloseBtn");
const summaryDialogStatus = document.getElementById("summaryDialogStatus");
const summaryThreadSelect = document.getElementById("summaryThreadSelect");
const summaryThreadNewBtn = document.getElementById("summaryThreadNewBtn");
const summaryThreadRenameBtn = document.getElementById("summaryThreadRenameBtn");
const summaryThreadDeleteBtn = document.getElementById("summaryThreadDeleteBtn");
const summaryChatEnabledToggle = document.getElementById("summaryChatEnabledToggle");
const summaryChatForm = document.getElementById("summaryChatForm");
const summaryChatInput = document.getElementById("summaryChatInput");
const summaryChatSendBtn = document.getElementById("summaryChatSendBtn");
const moreWrap = document.getElementById("moreWrap");
const loadMoreBtn = document.getElementById("loadMoreBtn");
let summaryDialogNoticeTimerId = 0;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(line) {
  let html = String(line || "");
  const codeTokens = [];

  html = html.replace(/`([^`\n]+)`/g, (_m, code) => {
    const idx = codeTokens.length;
    codeTokens.push(`<code>${code}</code>`);
    return `@@MD_CODE_${idx}@@`;
  });

  html = html.replace(/\[([^\]]+)\]\((#[a-zA-Z0-9._:-]+)\)/g, (_m, text, hash) => {
    return `<a href="${hash}">${text}</a>`;
  });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, text, url) => {
    return `<a href="${url}" target="_blank" rel="noreferrer">${text}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

  html = html.replace(/@@MD_CODE_(\d+)@@/g, (_m, idx) => codeTokens[Number(idx)] || "");
  return html;
}

function renderMarkdown(text) {
  const source = escapeHtml(String(text || "").replace(/\r\n/g, "\n"));
  if (!source.trim()) return "";

  const codeBlocks = [];
  let body = source.replace(/```([a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    const langAttr = lang ? ` data-lang="${lang}"` : "";
    codeBlocks.push(`<pre class="md-code"><code${langAttr}>${String(code || "").trim()}</code></pre>`);
    return `@@MD_BLOCK_${idx}@@`;
  });

  const lines = body.split("\n");
  const out = [];
  let para = [];
  let inUl = false;
  let inOl = false;

  const flushPara = () => {
    if (!para.length) return;
    out.push(`<p>${para.map((line) => renderInlineMarkdown(line)).join("<br>")}</p>`);
    para = [];
  };
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (const raw of lines) {
    const line = String(raw || "");
    const trimmed = line.trim();

    if (/^@@MD_BLOCK_\d+@@$/.test(trimmed)) {
      flushPara();
      closeLists();
      out.push(trimmed);
      continue;
    }
    if (!trimmed) {
      flushPara();
      closeLists();
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushPara();
      closeLists();
      const level = heading[1].length;
      out.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const ul = trimmed.match(/^[-*]\s+(.+)$/);
    if (ul) {
      flushPara();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${renderInlineMarkdown(ul[1])}</li>`);
      continue;
    }

    const ol = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      flushPara();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${renderInlineMarkdown(ol[1])}</li>`);
      continue;
    }

    const quote = trimmed.match(/^>\s?(.+)$/);
    if (quote) {
      flushPara();
      closeLists();
      out.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      flushPara();
      closeLists();
      out.push("<hr />");
      continue;
    }

    para.push(line);
  }

  flushPara();
  closeLists();

  body = out.join("");
  body = body.replace(/@@MD_BLOCK_(\d+)@@/g, (_m, idx) => codeBlocks[Number(idx)] || "");
  return body;
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

function buildConversationId() {
  return `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDialogMessageId() {
  return `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDialogMessage(raw) {
  if (!raw || typeof raw !== "object") return null;
  const text = clampDialogText(raw.text || "");
  if (!text) return null;
  const role = ["user", "assistant", "system"].includes(String(raw.role || ""))
    ? String(raw.role || "system")
    : "system";
  return {
    id: String(raw.id || buildDialogMessageId()),
    role,
    text,
    ts: String(raw.ts || ""),
  };
}

function buildConversationTitle(meta = {}, fallback = "新会话") {
  const arxivId = extractArxivId(meta.arxivId || "");
  if (arxivId) {
    const title = String(meta.title || "").trim();
    if (title) return `${arxivId} · ${shortText(title, 24)}`;
    return arxivId;
  }
  const raw = String(meta.title || "").trim();
  if (raw) return shortText(raw, 30);
  return fallback;
}

function isPinnedConversation(conv) {
  if (!conv || typeof conv !== "object") return false;
  return conv.pinned === true || String(conv.id || "") === DAILY_PIN_CONVERSATION_ID;
}

function makePinnedDailyConversation() {
  const now = new Date().toISOString();
  return {
    id: DAILY_PIN_CONVERSATION_ID,
    pinned: true,
    customTitle: false,
    title: DAILY_PIN_CONVERSATION_TITLE,
    createdAt: now,
    updatedAt: now,
    activeArxivId: "",
    activeTitle: "",
    activePublished: "",
    activePaperSummary: "",
    activePaperUrl: "",
    activePaperPdfUrl: "",
    activePaperField: "",
    messages: [],
  };
}

function ensurePinnedConversation() {
  let pinned = state.summaryDialog.conversations.find((conv) => isPinnedConversation(conv));
  if (!pinned) {
    pinned = makePinnedDailyConversation();
  } else {
    pinned.id = DAILY_PIN_CONVERSATION_ID;
    pinned.pinned = true;
    pinned.customTitle = false;
    pinned.title = DAILY_PIN_CONVERSATION_TITLE;
    if (!pinned.createdAt) {
      pinned.createdAt = new Date().toISOString();
    }
  }

  const others = state.summaryDialog.conversations.filter((conv) => !isPinnedConversation(conv));
  const kept = others.slice(0, Math.max(0, SUMMARY_CONVERSATION_MAX - 1));
  state.summaryDialog.conversations = [pinned, ...kept];
  return pinned;
}

function getActiveConversation() {
  const id = state.summaryDialog.activeConversationId;
  if (!id) return null;
  return state.summaryDialog.conversations.find((conv) => conv.id === id) || null;
}

function ensureConversationList() {
  if (state.summaryDialog.conversations.length === 0) {
    const now = new Date().toISOString();
    const seed = {
      id: buildConversationId(),
      pinned: false,
      customTitle: false,
      title: "默认会话",
      createdAt: now,
      updatedAt: now,
      activeArxivId: "",
      activeTitle: "",
      activePublished: "",
      activePaperSummary: "",
      activePaperUrl: "",
      activePaperPdfUrl: "",
      activePaperField: "",
      messages: [],
    };
    state.summaryDialog.conversations = [seed];
    state.summaryDialog.activeConversationId = seed.id;
  }

  ensurePinnedConversation();
  const activeExists = state.summaryDialog.conversations.some((conv) => conv.id === state.summaryDialog.activeConversationId);
  if (!activeExists) {
    const fallback = state.summaryDialog.conversations.find((conv) => !isPinnedConversation(conv)) || state.summaryDialog.conversations[0];
    state.summaryDialog.activeConversationId = fallback?.id || "";
  }
}

function activatePinnedDailyConversation() {
  ensureConversationList();
  syncRuntimeToConversation();
  const pinned = ensurePinnedConversation();
  state.summaryDialog.activeConversationId = pinned.id;
  applyConversationToRuntime(pinned);
  persistSummaryDialogMemory();
  renderSummaryDialog();
}

function applyConversationToRuntime(conv) {
  if (!conv) return;
  state.summaryDialog.activeArxivId = String(conv.activeArxivId || "");
  state.summaryDialog.activeTitle = String(conv.activeTitle || "");
  state.summaryDialog.activePublished = String(conv.activePublished || "");
  state.summaryDialog.activePaperSummary = String(conv.activePaperSummary || "");
  state.summaryDialog.activePaperUrl = String(conv.activePaperUrl || "");
  state.summaryDialog.activePaperPdfUrl = String(conv.activePaperPdfUrl || "");
  state.summaryDialog.activePaperField = String(conv.activePaperField || "");
  state.summaryDialog.messages = Array.isArray(conv.messages)
    ? conv.messages
        .map((x) => normalizeDialogMessage(x))
        .filter(Boolean)
        .slice(-SUMMARY_DIALOG_MAX_MESSAGES)
    : [];
}

function syncRuntimeToConversation() {
  ensureConversationList();
  const conv = getActiveConversation();
  if (!conv) return;
  conv.activeArxivId = String(state.summaryDialog.activeArxivId || "");
  conv.activeTitle = String(state.summaryDialog.activeTitle || "");
  conv.activePublished = String(state.summaryDialog.activePublished || "");
  conv.activePaperSummary = String(state.summaryDialog.activePaperSummary || "");
  conv.activePaperUrl = String(state.summaryDialog.activePaperUrl || "");
  conv.activePaperPdfUrl = String(state.summaryDialog.activePaperPdfUrl || "");
  conv.activePaperField = String(state.summaryDialog.activePaperField || "");
  conv.messages = (state.summaryDialog.messages || []).slice(-SUMMARY_DIALOG_MAX_MESSAGES);
  if (conv.messages.length > 0 && !conv.title && !conv.customTitle && !isPinnedConversation(conv)) {
    conv.title = buildConversationTitle({ arxivId: conv.activeArxivId, title: conv.activeTitle }, "会话");
  }
  conv.updatedAt = new Date().toISOString();
}

function createConversation(meta = {}) {
  syncRuntimeToConversation();
  const now = new Date().toISOString();
  const conv = {
    id: buildConversationId(),
    pinned: false,
    customTitle: false,
    title: buildConversationTitle(meta),
    createdAt: now,
    updatedAt: now,
    activeArxivId: String(meta.arxivId || ""),
    activeTitle: String(meta.title || ""),
    activePublished: String(meta.published || ""),
    activePaperSummary: String(meta.paperSummary || ""),
    activePaperUrl: String(meta.paperUrl || ""),
    activePaperPdfUrl: String(meta.paperPdfUrl || ""),
    activePaperField: String(meta.fieldCode || ""),
    messages: [],
  };
  ensurePinnedConversation();
  const insertIndex = state.summaryDialog.conversations.length > 0 && isPinnedConversation(state.summaryDialog.conversations[0]) ? 1 : 0;
  state.summaryDialog.conversations.splice(insertIndex, 0, conv);
  ensurePinnedConversation();
  state.summaryDialog.activeConversationId = conv.id;
  applyConversationToRuntime(conv);
  state.summaryDialog.pollContext = null;
  state.summaryDialog.lastStatusSignature = "";
  return conv;
}

function switchConversation(conversationId) {
  if (!conversationId) return;
  if (conversationId === state.summaryDialog.activeConversationId) return;
  syncRuntimeToConversation();
  const conv = state.summaryDialog.conversations.find((item) => item.id === conversationId);
  if (!conv) return;
  stopSummaryStatusPolling();
  stopRealtimeStream();
  setSummaryLoading(false, "");
  state.summaryDialog.activeConversationId = conv.id;
  applyConversationToRuntime(conv);
  persistSummaryDialogMemory();
  renderSummaryDialog();
}

function deleteActiveConversation() {
  ensureConversationList();
  const active = getActiveConversation();
  if (active && isPinnedConversation(active)) {
    showSummaryDialogNotice("该会话已固定（Pin），不能删除。");
    return false;
  }
  stopSummaryStatusPolling();
  stopRealtimeStream();
  setSummaryLoading(false, "");
  if (state.summaryDialog.conversations.length <= 1) {
    state.summaryDialog.messages = [];
    state.summaryDialog.activeArxivId = "";
    state.summaryDialog.activeTitle = "";
    state.summaryDialog.activePublished = "";
    state.summaryDialog.activePaperSummary = "";
    state.summaryDialog.activePaperUrl = "";
    state.summaryDialog.activePaperPdfUrl = "";
    state.summaryDialog.activePaperField = "";
    syncRuntimeToConversation();
    persistSummaryDialogMemory();
    renderSummaryDialog();
    return true;
  }
  const activeId = state.summaryDialog.activeConversationId;
  const nextList = state.summaryDialog.conversations.filter((conv) => conv.id !== activeId);
  state.summaryDialog.conversations = nextList;
  ensurePinnedConversation();
  state.summaryDialog.activeConversationId = nextList[0]?.id || "";
  const fallback = state.summaryDialog.conversations.find((conv) => !isPinnedConversation(conv)) || state.summaryDialog.conversations[0];
  state.summaryDialog.activeConversationId = fallback?.id || "";
  applyConversationToRuntime(getActiveConversation());
  persistSummaryDialogMemory();
  renderSummaryDialog();
  return true;
}

function persistSummaryDialogMemory() {
  syncRuntimeToConversation();
  try {
    const mem = {
      open: state.summaryDialog.open,
      activeConversationId: state.summaryDialog.activeConversationId,
      conversations: state.summaryDialog.conversations
        .map((conv) => ({
          id: String(conv.id || ""),
          pinned: isPinnedConversation(conv),
          customTitle: conv.customTitle === true,
          title: String(conv.title || ""),
          createdAt: String(conv.createdAt || ""),
          updatedAt: String(conv.updatedAt || ""),
          activeArxivId: String(conv.activeArxivId || ""),
          activeTitle: String(conv.activeTitle || ""),
          activePublished: String(conv.activePublished || ""),
          activePaperSummary: String(conv.activePaperSummary || ""),
          activePaperUrl: String(conv.activePaperUrl || ""),
          activePaperPdfUrl: String(conv.activePaperPdfUrl || ""),
          activePaperField: String(conv.activePaperField || ""),
          messages: Array.isArray(conv.messages)
            ? conv.messages
                .map((x) => normalizeDialogMessage(x))
                .filter(Boolean)
                .slice(-SUMMARY_DIALOG_MAX_MESSAGES)
            : [],
        }))
        .slice(0, SUMMARY_CONVERSATION_MAX),
    };
    localStorage.setItem(SUMMARY_DIALOG_MEMORY_KEY, JSON.stringify(mem));
  } catch (err) {
    console.warn("save summary dialog memory failed", err);
  }
}

function loadSummaryDialogMemory() {
  try {
    const raw = localStorage.getItem(SUMMARY_DIALOG_MEMORY_KEY);
    if (!raw) {
      ensureConversationList();
      applyConversationToRuntime(getActiveConversation());
      return;
    }
    const mem = JSON.parse(raw);
    if (!mem || typeof mem !== "object") {
      ensureConversationList();
      applyConversationToRuntime(getActiveConversation());
      return;
    }
    state.summaryDialog.open = Boolean(mem.open);
    const parsedConversations = [];
    if (Array.isArray(mem.conversations)) {
      mem.conversations.forEach((rawConv, idx) => {
        if (!rawConv || typeof rawConv !== "object") return;
        const conv = {
          id: String(rawConv.id || buildConversationId()),
          pinned: rawConv.pinned === true || String(rawConv.id || "") === DAILY_PIN_CONVERSATION_ID,
          customTitle: rawConv.customTitle === true,
          title: String(rawConv.title || `会话 ${idx + 1}`),
          createdAt: String(rawConv.createdAt || ""),
          updatedAt: String(rawConv.updatedAt || ""),
          activeArxivId: String(rawConv.activeArxivId || ""),
          activeTitle: String(rawConv.activeTitle || ""),
          activePublished: String(rawConv.activePublished || ""),
          activePaperSummary: String(rawConv.activePaperSummary || ""),
          activePaperUrl: String(rawConv.activePaperUrl || ""),
          activePaperPdfUrl: String(rawConv.activePaperPdfUrl || ""),
          activePaperField: String(rawConv.activePaperField || ""),
          messages: Array.isArray(rawConv.messages)
            ? rawConv.messages
                .map((x) => normalizeDialogMessage(x))
                .filter(Boolean)
                .slice(-SUMMARY_DIALOG_MAX_MESSAGES)
            : [],
        };
        parsedConversations.push(conv);
      });
    } else if (Array.isArray(mem.messages) || mem.activeArxivId || mem.activeTitle) {
      // Backward compatible migration from single-conversation storage.
      parsedConversations.push({
        id: buildConversationId(),
        pinned: false,
        customTitle: false,
        title: buildConversationTitle({ arxivId: mem.activeArxivId, title: mem.activeTitle }, "默认会话"),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activeArxivId: String(mem.activeArxivId || ""),
        activeTitle: String(mem.activeTitle || ""),
        activePublished: String(mem.activePublished || ""),
        activePaperSummary: "",
        activePaperUrl: "",
        activePaperPdfUrl: "",
        activePaperField: "",
        messages: Array.isArray(mem.messages)
          ? mem.messages
              .map((x) => normalizeDialogMessage(x))
              .filter(Boolean)
              .slice(-SUMMARY_DIALOG_MAX_MESSAGES)
          : [],
      });
    }
    state.summaryDialog.conversations = parsedConversations.slice(0, SUMMARY_CONVERSATION_MAX);
    ensureConversationList();
    const activeId = String(mem.activeConversationId || "");
    state.summaryDialog.activeConversationId =
      state.summaryDialog.conversations.find((conv) => conv.id === activeId)?.id || state.summaryDialog.conversations[0].id;
    applyConversationToRuntime(getActiveConversation());
  } catch (err) {
    console.warn("load summary dialog memory failed", err);
    ensureConversationList();
    applyConversationToRuntime(getActiveConversation());
  }
}

function persistSummaryUiPrefs() {
  try {
    const payload = {
      aiSidebarEnabled: state.summaryDialog.aiSidebarEnabled,
      chatEnabled: state.summaryDialog.chatEnabled,
    };
    localStorage.setItem(SUMMARY_UI_PREF_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("save summary ui prefs failed", err);
  }
}

function loadSummaryUiPrefs() {
  try {
    const raw = localStorage.getItem(SUMMARY_UI_PREF_KEY);
    if (raw) {
      const payload = JSON.parse(raw);
      if (payload && typeof payload === "object") {
        if (typeof payload.aiSidebarEnabled === "boolean") {
          state.summaryDialog.aiSidebarEnabled = payload.aiSidebarEnabled;
        }
      }
    }
    // Realtime chat is always on by default.
    state.summaryDialog.chatEnabled = true;
  } catch (err) {
    console.warn("load summary ui prefs failed", err);
  }
}

function syncSummaryUiControls() {
  if (aiPanelEnabledToggle) {
    aiPanelEnabledToggle.checked = state.summaryDialog.aiSidebarEnabled;
  }
  const chatEnabled = state.summaryDialog.chatEnabled && state.summaryDialog.aiSidebarEnabled;
  const chatBusy = state.summaryDialog.chatStreaming;
  if (summaryChatInput) {
    summaryChatInput.disabled = !chatEnabled || chatBusy;
  }
  if (summaryChatSendBtn) {
    summaryChatSendBtn.disabled = !chatEnabled || chatBusy;
  }
  if (summaryThreadSelect) {
    summaryThreadSelect.disabled = !state.summaryDialog.aiSidebarEnabled;
  }
  const activeConv = getActiveConversation();
  const pinnedActive = isPinnedConversation(activeConv);
  if (summaryThreadRenameBtn) {
    summaryThreadRenameBtn.disabled = !state.summaryDialog.aiSidebarEnabled || pinnedActive;
  }
  if (summaryThreadDeleteBtn) {
    summaryThreadDeleteBtn.disabled = !state.summaryDialog.aiSidebarEnabled || pinnedActive;
  }
}

function renderConversationSelector() {
  if (!summaryThreadSelect) return;
  ensureConversationList();
  const options = state.summaryDialog.conversations
    .map((conv, idx) => {
      const pinPrefix = isPinnedConversation(conv) ? "📌 " : "";
      const label = `${idx + 1}. ${pinPrefix}${conv.title || "会话"}`;
      return `<option value="${escapeHtml(conv.id)}">${escapeHtml(label)}</option>`;
    })
    .join("");
  summaryThreadSelect.innerHTML = options;
  summaryThreadSelect.value = state.summaryDialog.activeConversationId;
}

function setSummaryDialogOpen(open) {
  const allowed = state.summaryDialog.aiSidebarEnabled;
  state.summaryDialog.open = Boolean(open) && allowed;
  if (summaryDialog) {
    summaryDialog.classList.remove("hidden");
    summaryDialog.classList.toggle("is-open", state.summaryDialog.open);
  }
  document.body.classList.toggle("summary-open", state.summaryDialog.open);
  renderConversationSelector();
  syncSummaryUiControls();
  persistSummaryDialogMemory();
}

function renderSummaryDialog(options = {}) {
  if (!summaryDialog || !summaryDialogBody || !summaryDialogSub) return;
  const prevScrollTop = summaryDialogBody.scrollTop || 0;
  const prevScrollHeight = summaryDialogBody.scrollHeight || 0;
  const prevClientHeight = summaryDialogBody.clientHeight || 0;
  const wasNearBottom = prevScrollHeight - (prevScrollTop + prevClientHeight) <= 36;
  renderConversationSelector();
  const conv = getActiveConversation();
  const convName = conv?.title || "会话";

  const sub = state.summaryDialog.activeArxivId
    ? `${convName} · ${state.summaryDialog.activeArxivId}${state.summaryDialog.activeTitle ? ` · ${state.summaryDialog.activeTitle}` : ""}`
    : `${convName} · 未选择论文`;
  summaryDialogSub.textContent = sub;

  const hasHistory = state.summaryDialog.messages.length > 0;
  const hasStreaming = state.summaryDialog.streamingActive && state.summaryDialog.streamingText;

  if (!hasHistory && !hasStreaming) {
    summaryDialogBody.innerHTML = "";
  } else {
    const historyHtml = state.summaryDialog.messages
      .map((msg) => {
        const role = ["user", "assistant", "system"].includes(msg.role) ? msg.role : "system";
        const msgId = String(msg.id || buildDialogMessageId());
        const isMarkdownRole = role === "assistant" || role === "system";
        const content = isMarkdownRole
          ? renderMarkdown(msg.text || "")
          : escapeHtml(msg.text || "").replace(/\n/g, "<br>");
        return [
          `<article class="summary-msg ${role}" data-msg-id="${escapeHtml(msgId)}">`,
          `<button type="button" class="summary-msg-delete" data-msg-delete="${escapeHtml(msgId)}" aria-label="删除这条消息">删除</button>`,
          `<div class="summary-msg-content">${content}</div>`,
          `</article>`,
        ].join("");
      })
      .join("");

    const streamingHtml = hasStreaming
      ? `<article class="summary-msg assistant">${escapeHtml(state.summaryDialog.streamingText).replace(/\n/g, "<br>")}</article>`
      : "";

    summaryDialogBody.innerHTML = `${historyHtml}${streamingHtml}`;
  }

  const followIfNearBottom = options.followIfNearBottom !== false;
  if (options.stickBottom || (followIfNearBottom && wasNearBottom)) {
    summaryDialogBody.scrollTop = summaryDialogBody.scrollHeight;
  } else if (options.preserveScroll) {
    const newHeight = summaryDialogBody.scrollHeight || 0;
    const delta = newHeight - prevScrollHeight;
    summaryDialogBody.scrollTop = Math.max(0, prevScrollTop + delta);
  } else {
    summaryDialogBody.scrollTop = prevScrollTop;
  }
  renderSummaryDialogStatus();
}

function renderSummaryDialogStatus() {
  if (!summaryDialogStatus) return;
  if (!state.summaryDialog.loading) {
    summaryDialogStatus.classList.add("hidden");
    summaryDialogStatus.innerHTML = "";
    return;
  }
  summaryDialogStatus.classList.remove("hidden");
  summaryDialogStatus.innerHTML = `<span class="summary-spinner" aria-hidden="true"></span><span>${escapeHtml(
    state.summaryDialog.loadingStatus || "正在处理中..."
  )}</span>`;
}

function showSummaryDialogNotice(text) {
  if (!summaryDialogNotice) return;
  const value = String(text || "").trim();
  if (!value) return;

  if (summaryDialogNoticeTimerId) {
    clearTimeout(summaryDialogNoticeTimerId);
    summaryDialogNoticeTimerId = 0;
  }

  summaryDialogNotice.textContent = value;
  summaryDialogNotice.classList.remove("hidden", "is-show");
  void summaryDialogNotice.offsetWidth;
  summaryDialogNotice.classList.add("is-show");

  summaryDialogNoticeTimerId = window.setTimeout(() => {
    summaryDialogNotice.classList.remove("is-show");
    summaryDialogNotice.classList.add("hidden");
    summaryDialogNotice.textContent = "";
    summaryDialogNoticeTimerId = 0;
  }, 1000);
}

function renameActiveConversation() {
  ensureConversationList();
  const conv = getActiveConversation();
  if (!conv) return;
  if (isPinnedConversation(conv)) {
    showSummaryDialogNotice("该会话是固定 Pin 会话，不能重命名。");
    return;
  }
  const initial = String(conv.title || "").trim();
  const next = window.prompt("请输入会话名称（最多30字）", initial);
  if (next === null) return;
  const value = String(next || "").trim().slice(0, 30);
  if (!value) {
    showSummaryDialogNotice("会话名称不能为空。");
    return;
  }
  conv.title = value;
  conv.customTitle = true;
  conv.updatedAt = new Date().toISOString();
  persistSummaryDialogMemory();
  renderSummaryDialog();
  showSummaryDialogNotice("会话名称已更新。");
}

function setSummaryLoading(active, statusText = "") {
  state.summaryDialog.loading = Boolean(active);
  state.summaryDialog.loadingStatus = String(statusText || "").trim();
  renderSummaryDialogStatus();
}

function setAiSidebarEnabled(enabled) {
  state.summaryDialog.aiSidebarEnabled = Boolean(enabled);
  persistSummaryUiPrefs();
  syncSummaryUiControls();
  if (!state.summaryDialog.aiSidebarEnabled) {
    stopSummaryStatusPolling();
    stopRealtimeStream();
    setSummaryDialogOpen(false);
    setSummaryMessage("AI侧边栏已关闭。可重新打开后再使用总结/对话。");
  }
}

function setChatEnabled(enabled) {
  state.summaryDialog.chatEnabled = Boolean(enabled);
  persistSummaryUiPrefs();
  syncSummaryUiControls();
}

function pushSummaryDialogMessage(role, text) {
  const value = clampDialogText(text);
  if (!value) return;
  state.summaryDialog.messages.push(normalizeDialogMessage({
    id: buildDialogMessageId(),
    role,
    text: value,
    ts: new Date().toISOString(),
  }));
  if (state.summaryDialog.messages.length > SUMMARY_DIALOG_MAX_MESSAGES) {
    state.summaryDialog.messages = state.summaryDialog.messages.slice(-SUMMARY_DIALOG_MAX_MESSAGES);
  }
  persistSummaryDialogMemory();
  renderSummaryDialog({ stickBottom: true });
}

function deleteSummaryDialogMessage(messageId) {
  const msgId = String(messageId || "").trim();
  if (!msgId) return false;
  const idx = state.summaryDialog.messages.findIndex((msg) => String(msg.id || "") === msgId);
  if (idx < 0) return false;
  state.summaryDialog.messages.splice(idx, 1);
  persistSummaryDialogMemory();
  renderSummaryDialog({ preserveScroll: true, followIfNearBottom: false });
  return true;
}

function resetMessageDeleteConfirmState(button) {
  if (!button) return;
  const timerId = Number(button.getAttribute("data-confirm-timer") || 0);
  if (timerId) {
    window.clearTimeout(timerId);
  }
  button.removeAttribute("data-confirm-timer");
  button.removeAttribute("data-confirming");
  button.classList.remove("is-confirming");
  button.textContent = "删除";
}

function setActiveSummaryPaper(meta = {}) {
  state.summaryDialog.activeArxivId = String(meta.arxivId || "");
  state.summaryDialog.activeTitle = String(meta.title || "");
  state.summaryDialog.activePublished = String(meta.published || "");
  state.summaryDialog.activePaperSummary = String(meta.paperSummary || "");
  state.summaryDialog.activePaperUrl = String(meta.paperUrl || "");
  state.summaryDialog.activePaperPdfUrl = String(meta.paperPdfUrl || "");
  state.summaryDialog.activePaperField = String(meta.fieldCode || "");
  const conv = getActiveConversation();
  if (conv && !conv.customTitle && !isPinnedConversation(conv)) {
    conv.title = buildConversationTitle(meta, conv.title || "会话");
  }
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
  setSummaryLoading(false, "");
}

function deriveSummaryLoadingStatus(statusPayload) {
  if (!statusPayload || !statusPayload.found || !statusPayload.run) {
    return "等待任务创建...";
  }
  const run = statusPayload.run || {};
  const liveStatus = String(statusPayload?.live_logs?.latest_status || "").trim();
  if (liveStatus) return liveStatus;

  const jobs = Array.isArray(statusPayload.jobs) ? statusPayload.jobs : [];
  for (const job of jobs) {
    const steps = Array.isArray(job.steps) ? job.steps : [];
    const runningStep = steps.find((s) => s.status === "in_progress");
    if (runningStep) {
      return `正在执行：${runningStep.name || "处理中"}`;
    }
  }
  if (run.status === "queued") return "任务排队中...";
  if (run.status === "in_progress") return "任务执行中...";
  if (run.status === "completed") return `任务完成：${run.conclusion || "unknown"}`;
  return "处理中...";
}

async function pollSummaryStatusOnce() {
  const ctx = state.summaryDialog.pollContext;
  if (!ctx) return;
  try {
    const statusPayload = await dispatchWorkerAction("summary_status", {
      client_tag: ctx.clientTag || "",
      arxiv_id: ctx.arxivId || "",
      since_line: Number(ctx.sinceLine || 0),
      max_lines: 90,
    });
    setSummaryLoading(true, deriveSummaryLoadingStatus(statusPayload));
    const liveLogs = statusPayload?.live_logs;
    if (liveLogs && Number.isFinite(Number(liveLogs.total_lines))) {
      ctx.sinceLine = Number(liveLogs.total_lines);
    }

    const run = statusPayload?.run;
    if (!run || run.status !== "completed") {
      return;
    }

    setSummaryLoading(false, "");
    stopSummaryStatusPolling();

    if (run.conclusion !== "success") {
      pushSummaryDialogMessage(
        "system",
        `任务完成但失败：${run.conclusion || "unknown"}\n可在 Actions 查看详情：${run.html_url || SUMMARY_WORKFLOW_PAGE_URL}`
      );
      return;
    }

    if (ctx.type === "one") {
      const finalMarkdown = String(liveLogs?.final_markdown || "").trim();
      if (finalMarkdown) {
        pushSummaryDialogMessage("assistant", finalMarkdown);
      } else if (SUMMARY_PERSIST_RESULTS) {
        const found = await fetchSummaryMarkdown(ctx.meta || {}, true);
        if (found) {
          pushSummaryDialogMessage("assistant", `总结已生成（${found.path}）\n\n${found.text}`);
        } else {
          pushSummaryDialogMessage("system", "任务成功，但未取到总结文本。请稍后再试。");
        }
      } else {
        pushSummaryDialogMessage("system", "任务成功，但日志中未提取到最终文本。请重试一次。");
      }
    } else {
      pushSummaryDialogMessage("system", "批量总结任务已完成。");
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
    setSummaryLoading(true, "状态暂时不可用，正在重试...");
    if (msg !== state.summaryDialog.lastStatusSignature) {
      state.summaryDialog.lastStatusSignature = msg;
    }
  }
}

function startSummaryStatusPolling(context) {
  stopSummaryStatusPolling();
  state.summaryDialog.pollContext = {
    ...context,
    sinceLine: 0,
    lastLiveError: "",
    emptyPollCount: 0,
  };
  state.summaryDialog.streamingActive = false;
  state.summaryDialog.streamingText = "";
  setSummaryLoading(true, "任务已触发，准备执行...");
  renderSummaryDialog();
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
  state.summaryDialog.chatStreaming = false;
  syncSummaryUiControls();
}

function appendStreamingToken(text) {
  if (!text) return;
  state.summaryDialog.streamingActive = true;
  state.summaryDialog.streamingText += text;
  if (state.summaryDialog.streamingText.length > SUMMARY_DIALOG_MAX_TEXT * 4) {
    state.summaryDialog.streamingText = state.summaryDialog.streamingText.slice(-SUMMARY_DIALOG_MAX_TEXT * 4);
  }
  renderSummaryDialog({ stickBottom: true });
}

function finalizeStreamingAsAssistant() {
  if (!state.summaryDialog.streamingText) {
    state.summaryDialog.streamingActive = false;
    state.summaryDialog.streamingText = "";
    renderSummaryDialog({ stickBottom: true });
    return;
  }
  pushSummaryDialogMessage("assistant", state.summaryDialog.streamingText);
  state.summaryDialog.streamingActive = false;
  state.summaryDialog.streamingText = "";
  renderSummaryDialog({ stickBottom: true });
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
        save: SUMMARY_PERSIST_RESULTS,
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

function buildChatContextMessages() {
  const paperPrompt = [];
  if (state.summaryDialog.activeArxivId) {
    paperPrompt.push(`当前讨论论文：${state.summaryDialog.activeArxivId}`);
  }
  if (state.summaryDialog.activeTitle) {
    paperPrompt.push(`标题：${state.summaryDialog.activeTitle}`);
  }
  if (state.summaryDialog.activePublished) {
    paperPrompt.push(`发布时间：${state.summaryDialog.activePublished}`);
  }
  if (state.summaryDialog.activePaperField) {
    paperPrompt.push(`领域：${state.summaryDialog.activePaperField}`);
  }
  if (state.summaryDialog.activePaperSummary) {
    paperPrompt.push(`论文摘要：${state.summaryDialog.activePaperSummary}`);
  }
  if (state.summaryDialog.activePaperUrl || state.summaryDialog.activePaperPdfUrl) {
    paperPrompt.push(
      `参考链接：${[state.summaryDialog.activePaperUrl, state.summaryDialog.activePaperPdfUrl].filter(Boolean).join(" | ")}`
    );
  }

  const history = (state.summaryDialog.messages || [])
    .filter((m) => ["user", "assistant"].includes(m.role))
    .slice(-8)
    .map((m) => ({
      role: m.role,
      content: m.text || "",
    }))
    .filter((m) => m.content.trim());

  if (paperPrompt.length === 0) return history;
  return [
    {
      role: "system",
      content: `${paperPrompt.join("\n")}\n请围绕这篇论文回答用户问题，优先基于可获得的论文正文与上下文。`,
    },
    ...history,
  ];
}

async function streamChatViaWorker(userText) {
  if (!WORKER_TRIGGER_URL) {
    pushSummaryDialogMessage("system", "未配置 Worker，无法使用实时对话。");
    return;
  }
  if (!state.summaryDialog.aiSidebarEnabled) {
    setSummaryMessage("AI侧边栏已关闭，请先开启。");
    return;
  }
  const text = String(userText || "").trim();
  if (!text) return;

  setSummaryDialogOpen(true);
  pushSummaryDialogMessage("user", text);
  setSummaryLoading(true, "AI 正在思考中...");

  stopSummaryStatusPolling();
  stopRealtimeStream();
  const ctrl = new AbortController();
  state.summaryDialog.streamAbort = ctrl;
  state.summaryDialog.streamingActive = true;
  state.summaryDialog.streamingText = "";
  state.summaryDialog.chatStreaming = true;
  syncSummaryUiControls();
  renderSummaryDialog();

  let response;
  try {
    response = await fetch(WORKER_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat_stream",
        messages: buildChatContextMessages(),
        paper_context: {
          arxiv_id: state.summaryDialog.activeArxivId || "",
          title: state.summaryDialog.activeTitle || "",
          paper_url: state.summaryDialog.activePaperUrl || "",
          pdf_url: state.summaryDialog.activePaperPdfUrl || "",
        },
        model: getSelectedSummaryModel(),
        base_url: SUMMARY_BASE_URL,
      }),
      signal: ctrl.signal,
    });
  } catch (err) {
    stopRealtimeStream();
    setSummaryLoading(false, "");
    pushSummaryDialogMessage("system", `实时对话请求失败：${String(err?.message || err)}`);
    return;
  }

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    stopRealtimeStream();
    setSummaryLoading(false, "");
    pushSummaryDialogMessage("system", `实时对话启动失败：HTTP ${response.status} ${detail}`);
    return;
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
          const msg = String(data.message || "").trim();
          if (msg) setSummaryLoading(true, msg);
          continue;
        }
        if (evt.eventName === "token") {
          appendStreamingToken(String(data.text || ""));
          continue;
        }
        if (evt.eventName === "error") {
          finalizeStreamingAsAssistant();
          stopRealtimeStream();
          setSummaryLoading(false, "");
          pushSummaryDialogMessage("system", `对话失败：${String(data.message || "unknown error")}`);
          return;
        }
        if (evt.eventName === "done") {
          finalizeStreamingAsAssistant();
          stopRealtimeStream();
          setSummaryLoading(false, "");
          return;
        }
      }
    }
  } catch (err) {
    if (!ctrl.signal.aborted) {
      finalizeStreamingAsAssistant();
      pushSummaryDialogMessage("system", `对话中断：${String(err?.message || err)}`);
    }
  }
  stopRealtimeStream();
  setSummaryLoading(false, "");
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

function findPaperByArxivId(arxivId) {
  const canonical = extractCanonicalArxivId(extractArxivId(arxivId));
  if (!canonical) return null;
  for (const field of state.fields.values()) {
    for (const paper of field.papers || []) {
      const pid = extractCanonicalArxivId(extractArxivId(paper.id || paper.pdf_url || ""));
      if (pid === canonical) {
        return { paper, fieldCode: field.code };
      }
    }
  }
  return null;
}

function normalizeTitleForMatch(title) {
  return String(title || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "");
}

function collectAllPaperRecords() {
  const records = [];
  state.fields.forEach((field) => {
    (field.papers || []).forEach((paper) => {
      const canonicalId = extractCanonicalArxivId(extractArxivId(paper.id || paper.pdf_url || ""));
      records.push({
        fieldCode: field.code || "",
        paper,
        canonicalId,
        title: String(paper.title || ""),
        titleNorm: normalizeTitleForMatch(paper.title || ""),
      });
    });
  });
  return records;
}

function tokenizeTitleForMatch(title) {
  const base = String(title || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ");
  return [...new Set(base.split(/\s+/).filter(Boolean))];
}

function findPaperRecordByTitle(rawTitle) {
  const query = String(rawTitle || "").trim();
  const queryNorm = normalizeTitleForMatch(query);
  if (!queryNorm || queryNorm.length < 4) return null;
  const records = collectAllPaperRecords();
  if (!records.length) return null;

  const exact = records.find((rec) => rec.titleNorm === queryNorm);
  if (exact) return exact;

  const qTokens = tokenizeTitleForMatch(query);
  let tokenBest = null;
  let tokenBestScore = 0;
  if (qTokens.length > 0) {
    records.forEach((rec) => {
      const rTokens = tokenizeTitleForMatch(rec.title);
      if (!rTokens.length) return;
      let hit = 0;
      qTokens.forEach((t) => {
        if (rTokens.includes(t)) hit += 1;
      });
      const score = hit / Math.max(qTokens.length, rTokens.length, 1);
      if (score > tokenBestScore) {
        tokenBestScore = score;
        tokenBest = rec;
      }
    });
  }
  if (tokenBest && tokenBestScore >= 0.34) return tokenBest;

  let best = null;
  let bestScore = 0;
  records.forEach((rec) => {
    if (!rec.titleNorm) return;
    if (rec.titleNorm.includes(queryNorm) || queryNorm.includes(rec.titleNorm)) {
      const score = Math.min(rec.titleNorm.length, queryNorm.length) / Math.max(rec.titleNorm.length, queryNorm.length);
      if (score > bestScore) {
        bestScore = score;
        best = rec;
      }
    }
  });
  if (best && bestScore >= 0.82) return best;
  return null;
}

function normalizeDialogTitleText(raw) {
  let text = String(raw || "").replace(/\s+/g, " ").trim();
  text = text.replace(/^[•\-*]\s*/, "");
  text = text.replace(/\s*[-–—]\s*\[?\s*arxiv[^\]\n]*未提供\s*\]?$/i, "");
  text = text.replace(/\s*[-–—]\s*URL[:：]\s*未提供\s*(?:（[^）]*）|\([^)]*\))?\s*$/i, "");
  text = text.replace(/\s*URL[:：]\s*未提供\s*(?:（[^）]*）|\([^)]*\))?\s*$/i, "");
  text = text.replace(/\s*\[?\s*arxiv[^\]\n]*未提供\s*\]?$/i, "");
  text = text.replace(/\s*[-–—]\s*https?:\/\/\S+\s*$/i, "");
  text = text.replace(/\s*[-–—]\s*\[左侧定位\]\s*$/i, "");
  return text.trim();
}

function extractDialogTitleCandidate(target) {
  const anchor = target.closest("a");
  if (anchor) {
    const text = normalizeDialogTitleText(anchor.textContent || "");
    if (text) return text;
  }
  const li = target.closest("li");
  if (li) {
    const whole = normalizeDialogTitleText(li.textContent || "");
    if (whole) {
      const parts = whole.split("·").map((x) => x.trim()).filter(Boolean);
      if (parts.length > 1) {
        const longest = parts
          .filter((x) => !/^https?:\/\//i.test(x))
          .sort((a, b) => b.length - a.length)[0];
        if (longest) return normalizeDialogTitleText(longest);
      }
      return whole;
    }
  }
  return "";
}

function extractDialogKeywordContext(target) {
  const sel = window.getSelection ? String(window.getSelection()?.toString() || "").trim() : "";
  if (sel && sel.length <= 80) return sel;
  const li = target.closest("li");
  if (li) {
    const line = normalizeDialogTitleText(li.textContent || "");
    if (!line) return "";
    const prefix = line.split(/[：:]/)[0] || "";
    if (prefix && prefix.length <= 80) return prefix.trim();
    return line.slice(0, 120).trim();
  }
  const anchor = target.closest("a");
  if (anchor) {
    const text = normalizeDialogTitleText(anchor.textContent || "");
    if (text) return text.slice(0, 120).trim();
  }
  const text = normalizeDialogTitleText(target.textContent || "");
  if (!text) return "";
  const short = text.split(/[，,。.!?！？；;：:\n]/)[0] || text;
  return short.slice(0, 120).trim();
}

function findPaperRecordByKeyword(rawKeyword, rawContext = "") {
  const keyword = normalizeDialogTitleText(rawKeyword);
  const queryNorm = normalizeTitleForMatch(keyword);
  const qTokens = tokenizeTitleForMatch(keyword);
  if (!queryNorm && qTokens.length === 0) return null;
  const weakTokens = new Set([
    "paper",
    "model",
    "models",
    "method",
    "approach",
    "learning",
    "training",
    "experiment",
    "experiments",
    "result",
    "results",
    "task",
    "tasks",
    "dataset",
    "robot",
    "robotics",
    "vision",
    "language",
    "policy",
    "evaluation",
    "framework",
  ]);
  if (qTokens.length === 1 && weakTokens.has(qTokens[0])) return null;

  const contextTokens = tokenizeTitleForMatch(rawContext).slice(0, 20);
  const records = collectAllPaperRecords();
  if (!records.length) return null;

  let best = null;
  let bestScore = 0;

  records.forEach((rec) => {
    if (!rec || !rec.titleNorm) return;
    const rTokens = tokenizeTitleForMatch(rec.title);
    if (!rTokens.length) return;

    let score = 0;
    let hit = 0;
    qTokens.forEach((token) => {
      if (rTokens.includes(token)) hit += 1;
    });
    if (hit > 0) {
      score += hit * 2;
      score += hit / Math.max(1, qTokens.length);
    }

    if (queryNorm) {
      if (rec.titleNorm === queryNorm) score += 4;
      else if (rec.titleNorm.includes(queryNorm) || queryNorm.includes(rec.titleNorm)) score += 2.2;
    }

    if (contextTokens.length > 0) {
      let contextHit = 0;
      contextTokens.forEach((token) => {
        if (rTokens.includes(token)) contextHit += 1;
      });
      score += Math.min(2, contextHit * 0.25);
    }

    if (score > bestScore) {
      bestScore = score;
      best = rec;
    }
  });

  if (!best) return null;
  if (qTokens.length <= 1) {
    if (qTokens[0] && qTokens[0].length >= 3 && bestScore >= 2.2) return best;
    if (queryNorm.length >= 4 && bestScore >= 2.2) return best;
    return null;
  }
  return bestScore >= 3 ? best : null;
}

function ensurePaperVisibleForJump(record) {
  if (!record) return;
  if (state.selectedField !== record.fieldCode) {
    state.selectedField = record.fieldCode;
    if (fieldSelect) {
      fieldSelect.value = state.selectedField;
    }
    updateOriginLink();
  }
  if (state.rangeMode !== "month") {
    state.rangeMode = "month";
    updateRangeButtons();
  }
  if (state.keyword) {
    state.keyword = "";
    if (searchInput) searchInput.value = "";
  }
  applyFilters();
  const targetIdx = state.filtered.findIndex(
    (paper) => extractCanonicalArxivId(extractArxivId(paper.id || paper.pdf_url || "")) === record.canonicalId
  );
  if (targetIdx >= 0 && state.visibleCount < targetIdx + 1) {
    state.visibleCount = targetIdx + 20;
    renderStats();
    renderPapersGroupedByDate();
  }
}

async function jumpToPaperByCanonicalId(canonicalId) {
  const clean = extractCanonicalArxivId(extractArxivId(canonicalId));
  if (!clean) return false;
  let card = document.getElementById(`paper-${clean}`);
  if (!card) {
    const recordById = findPaperByArxivId(clean);
    if (recordById) {
      const rec = {
        fieldCode: recordById.fieldCode,
        paper: recordById.paper,
        canonicalId: clean,
        title: String(recordById.paper?.title || ""),
        titleNorm: normalizeTitleForMatch(recordById.paper?.title || ""),
      };
      ensurePaperVisibleForJump(rec);
      card = document.getElementById(`paper-${clean}`);
    }
  }
  if (!card) return false;
  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.remove("paper--ref-highlight");
  void card.offsetWidth;
  card.classList.add("paper--ref-highlight");
  window.setTimeout(() => {
    card.classList.remove("paper--ref-highlight");
  }, 260);
  return true;
}

async function jumpToPaperRecord(record) {
  if (!record) return false;
  ensurePaperVisibleForJump(record);
  const canonical = extractCanonicalArxivId(extractArxivId(record.canonicalId || record.paper?.id || record.paper?.pdf_url || ""));
  if (canonical) {
    return await jumpToPaperByCanonicalId(canonical);
  }
  const titleNorm = normalizeTitleForMatch(record.title || record.paper?.title || "");
  if (!titleNorm) return false;
  const cards = document.querySelectorAll(".paper[data-arxiv-id]");
  for (const card of cards) {
    const titleNode = card.querySelector(".paper-title a");
    const cardTitleNorm = normalizeTitleForMatch(titleNode?.textContent || "");
    if (cardTitleNorm && cardTitleNorm === titleNorm) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.classList.remove("paper--ref-highlight");
      void card.offsetWidth;
      card.classList.add("paper--ref-highlight");
      window.setTimeout(() => {
        card.classList.remove("paper--ref-highlight");
      }, 260);
      return true;
    }
  }
  return false;
}

function sanitizeDailyBriefText(rawText) {
  const lines = String(rawText || "").replace(/\r\n/g, "\n").split("\n");
  const matchedIds = [];
  const out = [];

  lines.forEach((line) => {
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      out.push("");
      return;
    }

    if (/URL[:：]\s*未提供/i.test(trimmed)) {
      const title = normalizeDialogTitleText(trimmed);
      const rec = findPaperRecordByTitle(title);
      if (rec && rec.canonicalId) {
        matchedIds.push(rec.canonicalId);
        const url = String(rec.paper?.id || `https://arxiv.org/abs/${rec.canonicalId}`).trim();
        const displayTitle = String(rec.paper?.title || title || rec.canonicalId).trim();
        out.push(`- [${displayTitle}](#paper-${rec.canonicalId}) · [arXiv](${url})`);
      } else {
        const safeTitle = title || trimmed.replace(/\s*[-–—]?\s*URL[:：].*$/i, "").trim();
        if (safeTitle) out.push(`- ${safeTitle}`);
      }
      return;
    }

    const cleaned = trimmed
      .replace(/\s*[-–—]?\s*URL[:：]\s*未提供\s*(?:（[^）]*）|\([^)]*\))?/gi, "")
      .replace(/\s*[-–—]?\s*arxiv\s*url\s*未提供\s*(?:（[^）]*）|\([^)]*\))?/gi, "")
      .trim();
    out.push(cleaned || "");
  });

  const text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return {
    text,
    matchedIds: [...new Set(matchedIds)],
  };
}

function buildPaperMetaFromRecord(paperRecord, fallback = {}) {
  const paper = paperRecord?.paper || {};
  const fieldCode = paperRecord?.fieldCode || state.selectedField || "";
  const arxivId = extractArxivId(fallback.arxivId || paper.id || paper.pdf_url || "");
  return {
    arxivId,
    title: fallback.title || paper.title || "",
    published: fallback.published || paper.published || "",
    paperSummary: paper.summary || "",
    paperUrl: paper.id || "",
    paperPdfUrl: paper.pdf_url || paper.id || "",
    fieldCode,
  };
}

function startConversationForPaper(meta) {
  if (!state.summaryDialog.aiSidebarEnabled) {
    setSummaryMessage("AI侧边栏已关闭，请先开启。");
    return;
  }
  stopSummaryStatusPolling();
  stopRealtimeStream();
  const conv = createConversation(meta);
  setSummaryDialogOpen(true);
  setActiveSummaryPaper(meta);
  pushSummaryDialogMessage(
    "system",
    `已将论文加入当前会话：${meta.arxivId || "unknown"}${meta.title ? ` · ${meta.title}` : ""}\n现在你可以直接提问。`
  );
  if (summaryThreadSelect) {
    summaryThreadSelect.value = conv.id;
  }
}

function collectLatestDayPapersAcrossFields() {
  const all = [];
  state.fields.forEach((field) => {
    (field.papers || []).forEach((paper) => {
      all.push({
        fieldCode: field.code,
        fieldName: field.name || field.code,
        paper,
      });
    });
  });

  let latestDateKey = "";
  all.forEach((item) => {
    const key = extractDateKey(item.paper?.published || "");
    if (key !== "unknown" && key > latestDateKey) {
      latestDateKey = key;
    }
  });

  if (!latestDateKey) {
    return { latestDateKey: "", items: [] };
  }
  return {
    latestDateKey,
    items: all.filter((item) => extractDateKey(item.paper?.published || "") === latestDateKey),
  };
}

function buildDailyBriefCorpus(items, options = {}) {
  const maxItems = Number(options.maxItems || 120);
  const maxChars = Number(options.maxChars || 70000);
  const lines = [];
  let usedChars = 0;
  let usedCount = 0;

  for (let i = 0; i < items.length; i += 1) {
    if (usedCount >= maxItems) break;
    const entry = items[i];
    const paper = entry.paper || {};
    const title = String(paper.title || "Untitled").trim();
    const categories = Array.isArray(paper.categories) ? paper.categories.slice(0, 3).join(", ") : "";
    const abs = String(paper.summary || "").replace(/\s+/g, " ").trim();
    const arxivUrl = String(paper.id || "").trim();
    const pdfUrl = String(paper.pdf_url || "").trim();
    if (!abs) continue;

    const row = [
      `[${usedCount + 1}]`,
      `field=${entry.fieldCode || "-"}`,
      categories ? `cats=${categories}` : "",
      `title=${title}`,
      arxivUrl ? `arxiv_url=${arxivUrl}` : "",
      pdfUrl ? `pdf_url=${pdfUrl}` : "",
      `abstract=${abs}`,
    ]
      .filter(Boolean)
      .join(" | ");

    if (usedChars + row.length > maxChars) break;
    lines.push(row);
    usedChars += row.length;
    usedCount += 1;
  }

  return {
    corpusText: lines.join("\n"),
    usedCount,
    totalCount: items.length,
    truncated: Math.max(0, items.length - usedCount),
  };
}

function buildDailyBriefMessages(latestDateKey, items) {
  const dateLabel = latestDateKey ? formatDateOnly(`${latestDateKey}T00:00:00Z`) : "未知日期";
  const dist = new Map();
  items.forEach((entry) => {
    const key = entry.fieldCode || "unknown";
    dist.set(key, (dist.get(key) || 0) + 1);
  });
  const fieldDist = [...dist.entries()]
    .map(([k, v]) => `${k}:${v}`)
    .join(", ");

  const corpus = buildDailyBriefCorpus(items);
  const userPayload = [
    `日期: ${dateLabel}`,
    `样本总数: ${corpus.totalCount}`,
    `已纳入总结: ${corpus.usedCount}`,
    corpus.truncated > 0 ? `未纳入（超长截断）: ${corpus.truncated}` : "",
    fieldDist ? `领域分布: ${fieldDist}` : "",
    "",
    "以下是论文摘要列表：",
    corpus.corpusText || "(empty)",
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      role: "system",
      content: [
        "你是我的论文日报助手。",
        "仅基于给定摘要生成中文 Markdown，不要输出思考过程、推理过程、分析草稿。",
        "输出结构必须是：",
        "## 今日问候",
        "## 今日新论文主要类别",
        "## 分类摘要",
        "其中“主要类别”给出 3-6 类；“分类摘要”按类别给小标题并简要总结。",
        "在输出末尾必须追加“## 参考链接”小节；列出你在总结里提到的论文，格式为 Markdown 列表，每条都包含 arXiv URL。",
        "禁止编造；若某类信息不足，直接写“信息不足”。",
      ].join("\n"),
    },
    {
      role: "user",
      content: userPayload,
    },
  ];
}

function extractArxivIdsFromText(rawText) {
  const ids = [];
  const text = String(rawText || "");
  const urlRegex = /https?:\/\/arxiv\.org\/(?:abs|pdf|html)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)(?:\.pdf)?/gi;
  const idRegex = /\b([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)\b/g;
  let m = null;
  while ((m = urlRegex.exec(text)) !== null) {
    if (m[1]) ids.push(m[1]);
  }
  while ((m = idRegex.exec(text)) !== null) {
    if (m[1]) ids.push(m[1]);
  }
  return [...new Set(ids.map((x) => extractCanonicalArxivId(extractArxivId(x))).filter(Boolean))];
}

function buildDailyReferenceAppendix(arxivIds = []) {
  if (!Array.isArray(arxivIds) || arxivIds.length === 0) return "";
  const lines = [""];
  const seen = new Set();
  arxivIds.forEach((id) => {
    const canonical = extractCanonicalArxivId(extractArxivId(id));
    if (!canonical || seen.has(canonical)) return;
    seen.add(canonical);
    const record = findPaperByArxivId(canonical);
    const paper = record?.paper || {};
    const title = String(paper.title || canonical).replace(/\s+/g, " ").trim();
    const url = String(paper.id || `https://arxiv.org/abs/${canonical}`).trim();
    const localRef = `paper-${canonical}`;
    lines.push(`- [${title}](#${localRef}) · [arXiv](${url})`);
  });
  return lines.join("\n");
}

function highlightReferencedPapers(arxivIds = []) {
  if (!Array.isArray(arxivIds) || arxivIds.length === 0) return;
  const wanted = new Set(
    arxivIds
      .map((id) => extractCanonicalArxivId(extractArxivId(id)))
      .filter(Boolean)
  );
  if (!wanted.size) return;

  const cards = document.querySelectorAll(".paper[data-arxiv-id]");
  cards.forEach((card) => {
    const cardId = extractCanonicalArxivId(extractArxivId(card.getAttribute("data-arxiv-id") || ""));
    if (!wanted.has(cardId)) return;
    card.classList.remove("paper--ref-highlight");
    void card.offsetWidth;
    card.classList.add("paper--ref-highlight");
    window.setTimeout(() => {
      card.classList.remove("paper--ref-highlight");
    }, 260);
  });
}

async function generateDailyBriefViaWorker(latestDateKey, items) {
  if (!WORKER_TRIGGER_URL) {
    throw new Error("未配置 Worker 触发地址");
  }
  const messages = buildDailyBriefMessages(latestDateKey, items);
  if (!messages.length) {
    throw new Error("daily brief messages empty");
  }

  const ctrl = new AbortController();
  state.summaryDialog.streamAbort = ctrl;
  state.summaryDialog.chatStreaming = true;
  syncSummaryUiControls();

  const resp = await fetch(WORKER_TRIGGER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "chat_stream",
      messages,
      model: getSelectedSummaryModel(),
      base_url: SUMMARY_BASE_URL,
      omit_reasoning: true,
    }),
    signal: ctrl.signal,
  });

  if (!resp.ok || !resp.body) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${detail}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalText = "";

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
      if (evt.eventName === "token") {
        finalText += String(data.text || "");
        continue;
      }
      if (evt.eventName === "error") {
        throw new Error(String(data.message || "unknown error"));
      }
      if (evt.eventName === "done") {
        return finalText.trim();
      }
    }
  }
  return finalText.trim();
}

async function triggerSummaryDailyViaWorker() {
  if (!triggerSummaryDailyBtn) return;
  if (!state.summaryDialog.aiSidebarEnabled) {
    setSummaryMessage("AI侧边栏已关闭，请先开启后再触发总结。");
    return;
  }
  stopSummaryStatusPolling();
  stopRealtimeStream();
  activatePinnedDailyConversation();
  setSummaryDialogOpen(true);
  triggerSummaryDailyBtn.disabled = true;
  triggerSummaryDailyBtn.textContent = "总结中...";
  setSummaryMessage("正在生成最近1天新文日报...");
  try {
    const latest = collectLatestDayPapersAcrossFields();
    if (!latest.items.length) {
      setSummaryLoading(false, "");
      pushSummaryDialogMessage("system", "最近1天没有可用于总结的论文摘要。");
      setSummaryMessage("没有可总结数据。");
      return;
    }

    setSummaryLoading(true, "正在总结今日最新论文ing～");
    const dailyText = await generateDailyBriefViaWorker(latest.latestDateKey, latest.items);
    setSummaryLoading(false, "");

    if (!dailyText) {
      pushSummaryDialogMessage("system", "日报生成完成，但返回内容为空。");
      setSummaryMessage("日报生成完成（空结果）。");
      return;
    }
    const sanitized = sanitizeDailyBriefText(dailyText);
    const refIds = [...new Set([...extractArxivIdsFromText(sanitized.text), ...sanitized.matchedIds])];
    const appendix = buildDailyReferenceAppendix(refIds);
    const finalText = `${sanitized.text}${appendix}`;
    pushSummaryDialogMessage("assistant", finalText);
    highlightReferencedPapers(refIds);
    setSummaryMessage("最近1天新文日报已生成。");
  } catch (err) {
    console.error(err);
    stopRealtimeStream();
    setSummaryLoading(false, "");
    const msg = String(err?.message || err);
    pushSummaryDialogMessage("system", `最近1天新文日报生成失败：${msg}`);
    setSummaryMessage(`日报生成失败：${msg}`);
  } finally {
    triggerSummaryDailyBtn.disabled = false;
    triggerSummaryDailyBtn.textContent = "一键总结最近1天新文";
    state.summaryDialog.streamAbort = null;
    state.summaryDialog.chatStreaming = false;
    syncSummaryUiControls();
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
      save_result: SUMMARY_PERSIST_RESULTS,
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
  if (!state.summaryDialog.aiSidebarEnabled) {
    setSummaryMessage("AI侧边栏已关闭，请先开启。");
    return;
  }
  setSummaryDialogOpen(true);
  setActiveSummaryPaper(meta);
  pushSummaryDialogMessage("user", `请总结论文：${meta.arxivId}`);
  setSummaryLoading(true, "正在准备总结任务...");

  if (ENABLE_LOCAL_REALTIME && REALTIME_ENDPOINT) {
    setSummaryLoading(true, "正在实时总结...");
    const streamed = await streamSummaryViaRealtime(meta);
    if (streamed) {
      setSummaryLoading(false, "");
      return;
    }
    setSummaryLoading(true, "实时通道不可用，切换后台任务...");
  }

  if (SUMMARY_PERSIST_RESULTS) {
    const found = await fetchSummaryMarkdown(meta);
    if (found) {
      setSummaryLoading(false, "");
      pushSummaryDialogMessage("assistant", `已找到总结（${found.path}）\n\n${found.text}`);
      return;
    }
  }

  setSummaryLoading(true, "正在触发单篇总结任务...");
  const result = await triggerSummaryOneViaWorker(meta.arxivId, btn, { openWorkflowOnError: false });
  if (result.ok) {
    startSummaryStatusPolling({
      type: "one",
      clientTag: result.clientTag,
      arxivId: meta.arxivId,
      meta,
    });
  } else {
    setSummaryLoading(false, "");
    pushSummaryDialogMessage(
      "system",
      "总结任务触发失败。请检查 Worker 部署、仓库 Secret（DASHSCOPE_API_KEY）和 Actions 日志。"
    );
  }
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
  const rawArxivId = extractArxivId(paper.id || paper.pdf_url || "");
  const canonicalArxivId = extractCanonicalArxivId(rawArxivId);
  const arxivId = escapeHtml(rawArxivId);
  const cardAnchorId = escapeHtml(`paper-${canonicalArxivId}`);
  const cardDataArxivId = escapeHtml(canonicalArxivId || rawArxivId);
  const fieldCode = escapeHtml(state.selectedField || "");
  const published = escapeHtml(paper.published || "");
  const title = escapeHtml(paper.title || "Untitled");

  return `
    <article id="${cardAnchorId}" data-arxiv-id="${cardDataArxivId}" class="paper ${isNew ? "paper--new" : ""}" style="animation-delay:${Math.min(index * 35, 420)}ms">
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
        <button type="button" class="paper-link alt js-chat-paper" data-arxiv-id="${arxivId}" data-published="${published}" data-title="${title}" data-field-code="${fieldCode}">加入AI侧栏</button>
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
  loadSummaryUiPrefs();
  loadSummaryDialogMemory();
  renderSummaryDialog();
  setSummaryDialogOpen(state.summaryDialog.open);
  syncSummaryUiControls();

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

  if (summaryThreadSelect) {
    summaryThreadSelect.addEventListener("change", (event) => {
      const target = event.target;
      const nextId = String(target && target.value ? target.value : "");
      switchConversation(nextId);
    });
  }

  if (summaryThreadNewBtn) {
    summaryThreadNewBtn.addEventListener("click", () => {
      createConversation({ title: "新会话" });
      setSummaryDialogOpen(true);
      renderSummaryDialog();
      pushSummaryDialogMessage("system", "已创建新会话，可直接开始提问。");
    });
  }

  if (summaryThreadRenameBtn) {
    summaryThreadRenameBtn.addEventListener("click", () => {
      renameActiveConversation();
    });
  }

  if (summaryThreadDeleteBtn) {
    summaryThreadDeleteBtn.addEventListener("click", () => {
      const deleted = deleteActiveConversation();
      if (deleted) {
        showSummaryDialogNotice("当前会话已删除。");
      }
    });
  }

  if (aiPanelEnabledToggle) {
    aiPanelEnabledToggle.addEventListener("change", (event) => {
      const target = event.target;
      setAiSidebarEnabled(Boolean(target && target.checked));
    });
  }

  if (openAiPanelBtn) {
    openAiPanelBtn.addEventListener("click", () => {
      if (!state.summaryDialog.aiSidebarEnabled) {
        setSummaryMessage("AI侧边栏当前已关闭，请先打开“启用AI侧边栏”。");
        return;
      }
      setSummaryDialogOpen(true);
    });
  }

  if (summaryChatForm) {
    summaryChatForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = summaryChatInput ? summaryChatInput.value : "";
      if (summaryChatInput) summaryChatInput.value = "";
      streamChatViaWorker(text);
    });
  }

  if (summaryDialogBody) {
    summaryDialogBody.addEventListener("click", async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const msgDeleteBtn = target.closest("[data-msg-delete]");
      if (msgDeleteBtn) {
        event.preventDefault();
        const msgId = String(msgDeleteBtn.getAttribute("data-msg-delete") || "").trim();
        if (!msgId) return;
        const msgNode = msgDeleteBtn.closest(".summary-msg");
        if (!msgNode || msgNode.classList.contains("is-removing")) return;
        if (msgDeleteBtn.getAttribute("data-confirming") !== "1") {
          resetMessageDeleteConfirmState(msgDeleteBtn);
          msgDeleteBtn.setAttribute("data-confirming", "1");
          msgDeleteBtn.classList.add("is-confirming");
          msgDeleteBtn.textContent = "确认删除";
          const timerId = window.setTimeout(() => {
            resetMessageDeleteConfirmState(msgDeleteBtn);
          }, SUMMARY_MESSAGE_DELETE_CONFIRM_MS);
          msgDeleteBtn.setAttribute("data-confirm-timer", String(timerId));
          return;
        }
        resetMessageDeleteConfirmState(msgDeleteBtn);
        msgNode.style.maxHeight = `${msgNode.offsetHeight}px`;
        void msgNode.offsetWidth;
        msgNode.classList.add("is-removing");
        window.setTimeout(() => {
          deleteSummaryDialogMessage(msgId);
        }, SUMMARY_MESSAGE_DELETE_FADE_MS);
        return;
      }

      const msgNode = target.closest(".summary-msg");
      if (!msgNode) return;
      const inMsg = target.closest(".summary-msg.assistant, .summary-msg.system");
      if (!inMsg) return;

      const anchor = target.closest("a");
      if (anchor) {
        const href = String(anchor.getAttribute("href") || "").trim();
        if (href.startsWith("#paper-")) {
          event.preventDefault();
          const ok = await jumpToPaperByCanonicalId(href.slice("#paper-".length));
          if (!ok) showSummaryDialogNotice("未在左侧找到对应论文。");
          return;
        }
        if (/^https?:\/\/arxiv\.org\/(?:abs|pdf|html)\//i.test(href)) {
          event.preventDefault();
          const idFromHref = extractCanonicalArxivId(extractArxivId(href));
          if (idFromHref) {
            const ok = await jumpToPaperByCanonicalId(idFromHref);
            if (ok) return;
          }
        }
        // For reference list titles/links, prefer in-page jump instead of opening new URL.
        const maybeTitle = extractDialogTitleCandidate(anchor) || extractDialogTitleCandidate(target);
        if (maybeTitle) {
          event.preventDefault();
          const record = findPaperRecordByTitle(maybeTitle);
          if (record) {
            const ok = await jumpToPaperRecord(record);
            if (!ok) showSummaryDialogNotice("未在左侧找到对应论文。");
            return;
          }
        }
      }

      const titleCandidate = extractDialogTitleCandidate(target);
      let record = titleCandidate ? findPaperRecordByTitle(titleCandidate) : null;
      if (!record) {
        const keywordCandidate = extractDialogKeywordContext(target);
        const contextText = normalizeDialogTitleText(
          target.closest("li")?.textContent || target.closest("p")?.textContent || target.textContent || ""
        );
        record = findPaperRecordByKeyword(keywordCandidate, contextText);
      }
      if (!record) {
        return;
      }
      const ok = await jumpToPaperRecord(record);
      if (!ok) {
        showSummaryDialogNotice("未在左侧找到对应论文。");
      }
    });
  }

  paperGroups.addEventListener("click", (event) => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    const chatTarget = el.closest(".js-chat-paper");
    if (chatTarget) {
      const fallbackMeta = {
        arxivId: chatTarget.getAttribute("data-arxiv-id") || "",
        title: chatTarget.getAttribute("data-title") || "",
        published: chatTarget.getAttribute("data-published") || "",
        fieldCode: chatTarget.getAttribute("data-field-code") || state.selectedField || "",
      };
      const paperRecord = findPaperByArxivId(fallbackMeta.arxivId);
      const meta = buildPaperMetaFromRecord(paperRecord, fallbackMeta);
      startConversationForPaper(meta);
      return;
    }
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
