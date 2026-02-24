# Trigger Worker (Cloudflare)

This worker triggers GitHub Actions workflows via GitHub API.

Supported actions from website:

- `update` -> `update-cs-ro.yml`
- `summarize_new` -> `summarize-papers.yml` (latest-day batch summaries)
- `summarize_one` -> `summarize-papers.yml` (one paper by `arxiv_id`)

## 1) Prerequisites

- Cloudflare account
- Node.js 18+
- GitHub PAT with repository `Contents` + `Workflows/Actions` write permission

## 2) Deploy

```bash
cd worker/trigger-update
npm i -g wrangler
wrangler login
wrangler secret put GITHUB_TOKEN
wrangler deploy
```

`wrangler secret put GITHUB_TOKEN` prompts you to paste PAT.

## 3) Configure website button

After deploy, copy worker URL, for example:

- `https://arxiv-trigger-update.<your-subdomain>.workers.dev/trigger`

Then edit `site/config.js`:

```js
window.MYARXIV_CONFIG = {
  triggerEndpoint: "https://arxiv-trigger-update.<your-subdomain>.workers.dev/trigger",
  openActionsAfterTrigger: true,
  openSummaryActionsAfterTrigger: false,
  summaryDailyMode: "fast",
  summaryOneMode: "deep",
  summaryBaseUrl: "https://coding.dashscope.aliyuncs.com/v1",
  summaryModel: "qwen3-coder-plus",
};
```

Commit and push to GitHub Pages.

## Notes

- CORS is restricted by `ALLOWED_ORIGIN` in `wrangler.toml`.
- You can set multiple allowed origins separated by commas.
- Add repository secret `DASHSCOPE_API_KEY` for summary workflow.
