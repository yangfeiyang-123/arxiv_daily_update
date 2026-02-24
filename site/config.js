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
  // Qwen OpenAI-compatible endpoint:
  summaryBaseUrl: "https://coding.dashscope.aliyuncs.com/v1",
  // Default summary model for UI input.
  summaryModel: "qwen3-coder-plus",
};
