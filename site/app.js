const dataUrl = window.location.pathname.includes("/site/")
  ? "../data/latest_cs_daily.json"
  : "./data/latest_cs_daily.json";
const DISPLAY_TIMEZONE = "UTC";
const DISPLAY_TIMEZONE_LABEL = "UTC";

const state = {
  fields: new Map(),
  selectedField: "",
  papers: [],
  filtered: [],
  sortBy: "published",
  keyword: "",
  rangeMode: "month",
  windowDays: 30,
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

function byDateDesc(key) {
  return (a, b) => {
    const ta = new Date(a[key]).getTime() || 0;
    const tb = new Date(b[key]).getTime() || 0;
    return tb - ta;
  };
}

function extractDateKey(raw) {
  if (!raw) return "unknown";
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : "unknown";
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

  state.filtered = list;

  renderStats();
  renderPapersGroupedByDate();
}

function renderStats() {
  const currentField = getCurrentField();
  const paperCount = state.filtered.length;
  const allCount = state.papers.length;
  const dateGroups = groupByPublishedDate(state.filtered).length;
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
      <div class="stat-value">${paperCount} / ${allCount}</div>
    </article>
    <article class="stat">
      <div class="stat-label">时间范围 / 日期分组</div>
      <div class="stat-value">${escapeHtml(rangeLabel)} / ${dateGroups}</div>
    </article>
  `;
}

function renderPaperCard(paper, index) {
  const categories = (paper.categories || []).slice(0, 3);
  const chips = categories
    .map((cat) => `<span class="chip">${escapeHtml(cat)}</span>`)
    .join("");

  const arxivUrl = escapeHtml(paper.id || "#");
  const pdfUrl = escapeHtml(paper.pdf_url || paper.id || "#");

  return `
    <article class="paper" style="animation-delay:${Math.min(index * 35, 420)}ms">
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
      </div>
    </article>
  `;
}

function renderPapersGroupedByDate() {
  paperGroups.innerHTML = "";

  if (!state.filtered.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  const groups = groupByPublishedDate(state.filtered);
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
}

function bindEvents() {
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

async function loadData() {
  try {
    const resp = await fetch(`${dataUrl}?t=${Date.now()}`);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const payload = await resp.json();
    const fields = normalizePayload(payload);
    state.fields = new Map(fields.map((field) => [field.code, field]));
    state.selectedField = fields[0]?.code || "";
    state.windowDays = Number(payload.window_days) > 0 ? Number(payload.window_days) : 30;
    state.rangeMode = "month";

    renderFieldOptions();
    updateRangeButtons();
    updateOriginLink();
    fetchedAt.textContent = `最近更新：${formatDateTime(payload.fetched_at)}（数据窗口：最近${state.windowDays}天）`;

    applyFilters();
  } catch (err) {
    console.error(err);
    errorState.classList.remove("hidden");
  }
}

bindEvents();
loadData();
