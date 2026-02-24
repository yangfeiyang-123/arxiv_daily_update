window.MYARXIV_CONFIG = {
  // Set after deploying Worker, e.g. https://arxiv-trigger-update.<subdomain>.workers.dev/trigger
  triggerEndpoint: "https://arxiv-trigger-update.yangfeiyang-arxiv-daily.workers.dev/trigger",
  // Set false to avoid opening GitHub Actions page after successful trigger.
  openActionsAfterTrigger: false,
  // Set true to open summary workflow page after summary triggers.
  openSummaryActionsAfterTrigger: false,
  // Optional: fast or deep
  summaryDailyMode: "fast",
  // Optional: deep or fast
  summaryOneMode: "deep",
  // Qwen OpenAI-compatible endpoint (general models):
  summaryBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  // Default summary model for UI input.
  summaryModel: "qwen3.5-397b-a17b",
  // Optional realtime backend for streaming single-paper summaries.
  // Example: "http://127.0.0.1:8788"
  realtimeEndpoint: "http://127.0.0.1:8788",
};
