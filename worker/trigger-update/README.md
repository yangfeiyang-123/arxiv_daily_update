# Trigger Update Worker (Cloudflare)

This worker triggers the GitHub Actions workflow `update-cs-ro.yml` via GitHub API.

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
};
```

Commit and push to GitHub Pages.

## Notes

- CORS is restricted by `ALLOWED_ORIGIN` in `wrangler.toml`.
- You can set multiple allowed origins separated by commas.
