# myArxiv: 多领域每日论文网站

这个项目会自动抓取 arXiv 中以下分类最近 30 天论文，并在一个高颜值网页中展示：

- `cs.RO` (Robotics)
- `cs.CV` (Computer Vision)
- `cs.CL` (Computation and Language)
- `cs.SY` (Systems and Control)

网页支持：领域切换、关键词搜索、排序、按日期分组浏览，并可一键切换到最近 1 天（最新日期）。

## 功能

- 每日抓取四个分类最近 30 天全部论文（按时间窗口，不按数量上限）
- 默认增量更新：优先复用上次结果，仅拉新增论文，速度更快
- 可选全量刷新：`--full-refresh`
- 生成本地数据文件：`data/latest_cs_daily.json`
- 响应式网页展示（桌面 + 手机）
- 在网页中切换领域查看对应论文
- 一键切换 `最近30天` / `最近1天`
- 网页内 `一键触发更新`（触发 GitHub Actions）
- 按标题/作者/关键词搜索
- 按发布时间、更新时间、标题排序
- 结果按日期自动分组展示
- 分批渲染 + `加载更多`，提升刷新速度
- 一键跳转 arXiv 页面和 PDF

## 目录结构

```text
.
├── .github/workflows/update-cs-ro.yml   # 每日自动更新数据（可选）
├── data/latest_cs_daily.json            # 抓取后的论文数据
├── scripts/fetch_cs_ro.py               # arXiv 抓取脚本（多领域、按时间窗口）
└── site/
    ├── app.js                           # 前端逻辑（领域+日期分组+快速时间范围）
    ├── index.html                       # 页面结构
    └── styles.css                       # 页面样式
```

## 本地使用

1. 抓取最新论文数据（默认最近 30 天，增量模式）

```bash
python3 scripts/fetch_cs_ro.py
```

2. 若需要强制全量刷新（会更慢）

```bash
python3 scripts/fetch_cs_ro.py --full-refresh
```

3. 启动本地静态服务器

```bash
python3 -m http.server 8000
```

4. 浏览器访问

- [http://localhost:8000/site/index.html](http://localhost:8000/site/index.html)

你也可以用更短命令：

```bash
make update
make update-fast
make serve
```

## 每日自动更新（GitHub Actions）

项目内置工作流：`/.github/workflows/update-cs-ro.yml`

- 每天 UTC `02:30` 自动执行抓取
- 数据有变化时自动提交 `data/latest_cs_daily.json`

把仓库推送到 GitHub 并保持 Actions 开启即可。

## 部署到 GitHub Pages（github.io）

项目已内置自动部署工作流：

- `/.github/workflows/deploy-pages.yml`：代码变更后自动部署
- `/.github/workflows/update-cs-ro.yml`：每日更新数据后自动部署

你只要做一次仓库配置：

1. 在 GitHub 创建新仓库（例如 `myArxiv`）
2. 把本地项目推到该仓库（`main` 或 `master` 分支）
3. 进入仓库 Settings -> Pages
4. 在 Build and deployment 中选择 `Source: GitHub Actions`
5. 回到 Actions 页面，等待 `Deploy Website to GitHub Pages` 运行完成
6. 打开网址：
   - `https://<你的GitHub用户名>.github.io/<仓库名>/`

之后你每次 push，或每天定时更新数据，网站都会自动更新。

### 网页内一键任务（可选）

网站上支持三类按钮：

- `一键触发更新`：刷新论文数据
- `一键总结最近1天新文`：对最新一天论文做批量全文总结 + 生成每日报告
- `AI总结此文`（每篇卡片里）：对单篇论文做全文深度总结

未配置 Worker 时会打开 GitHub Actions 页面；已配置 Worker 时可直接触发，无需手动进入 GitHub 页面。

#### 配置方法二（Cloudflare Worker 中转）

1. 部署 Worker

```bash
cd /Users/yangfeiyang/Desktop/Work_Space/myArxiv/worker/trigger-update
npm i -g wrangler
wrangler login
wrangler secret put GITHUB_TOKEN
wrangler deploy
```

2. 编辑网站配置文件 `site/config.js`，填入 Worker 地址

```js
window.MYARXIV_CONFIG = {
  triggerEndpoint: "https://arxiv-trigger-update.<your-subdomain>.workers.dev/trigger",
  openActionsAfterTrigger: false,
  openSummaryActionsAfterTrigger: false,
  summaryDailyMode: "fast",
  summaryOneMode: "deep",
  summaryBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  summaryModel: "qwen3.5-397b-a17b",
};
```

3. 提交并推送后，网站按钮即可直接触发

4. 在 GitHub 仓库配置 Secret（用于总结工作流）

- Settings -> Secrets and variables -> Actions -> New repository secret
- Name: `DASHSCOPE_API_KEY`
- Value: 你的 Qwen API Key

### 一次性推送命令（最短）

```bash
cd /Users/yangfeiyang/Desktop/Work_Space/myArxiv
git add .
git commit -m "feat: deploy myArxiv site"
git remote add origin https://github.com/<你的用户名>/<你的仓库名>.git
git push -u origin main
```

如果你已经设置过 `origin`，把 `git remote add origin ...` 换成：

```bash
git remote set-url origin https://github.com/<你的用户名>/<你的仓库名>.git
```

## 可调参数

抓取脚本支持：

- `--window-days`：抓取最近 N 天（默认 `30`）
- `--batch-size`：每次请求拉取条数（默认 `200`）
- `--request-interval`：请求间隔秒数（默认 `3.0`）
- `--categories`：自定义分类列表（逗号分隔）
- `--output`：输出文件路径（默认 `data/latest_cs_daily.json`）
- `--full-refresh`：忽略缓存，强制全量刷新窗口数据

示例：

```bash
python3 scripts/fetch_cs_ro.py \
  --window-days 30 \
  --categories cs.RO,cs.CV,cs.CL,cs.SY \
  --batch-size 200 \
  --request-interval 1.0 \
  --output data/latest_cs_daily.json
```

## 全文大模型总结（新）

新增脚本：`scripts/arxiv_fulltext_summarizer.py`

能力：

- 读取本地 JSON/SQLite 论文列表（无需每次手动贴 URL）
- 自动优先抓取 arXiv HTML，全量失败再回退 PDF
- **硬性全文检查**（长度 + Method/Experiments 章节信号），不满足则拒绝总结
- 长文自动分块、分层总结，再合成最终结构化报告
- 支持：
  - 批量最新 N 篇：`summarize_new`
  - 指定单篇：`summarize_one`
  - 批量“最新一天”全部论文：`--latest-day-only`
  - 可选生成“每日汇总报告”：`--daily-report`

### 安装

```bash
cd /Users/yangfeiyang/Desktop/Work_Space/myArxiv
python3 -m pip install -r requirements.txt
```

### 环境变量（Qwen 推荐）

```bash
export DASHSCOPE_API_KEY="你的key"
export LLM_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export LLM_MODEL_FAST="qwen-plus-latest"
export LLM_MODEL_DEEP="qwen3.5-397b-a17b"
```

可选：

- `FULLTEXT_MIN_CHARS`（默认 `30000`）
- `FULLTEXT_CHUNK_MAX_CHARS`（默认 `12000`）
- `OPENAI_BASE_URL`（兼容变量名，仍可用）
- `LLM_API_KEY` / `OPENAI_API_KEY`（兼容变量名，仍可用）

### 用法

1. 批量总结最新 N 篇（成本优先）

```bash
python3 scripts/arxiv_fulltext_summarizer.py summarize_new \
  --input data/latest_cs_daily.json \
  --n 10 \
  --mode fast
```

2. 批量总结“最新一天”并生成“每日报告”（推荐给网页按钮）

```bash
python3 scripts/arxiv_fulltext_summarizer.py summarize_new \
  --input data/latest_cs_daily.json \
  --n 300 \
  --mode fast \
  --latest-day-only \
  --daily-report
```

3. 指定 arXiv ID 深度总结

```bash
python3 scripts/arxiv_fulltext_summarizer.py summarize_one \
  --input data/latest_cs_daily.json \
  --arxiv_id 2401.12345 \
  --mode deep
```

4. 指定列表索引深度总结（按最新排序，0 开始）

```bash
python3 scripts/arxiv_fulltext_summarizer.py summarize_one \
  --input data/latest_cs_daily.json \
  --index 0 \
  --mode deep
```

### 输出

- 每篇 Markdown：`outputs/summaries/{date}_{arxiv_id}.md`
- 记录文件 JSON：`outputs/summaries/{timestamp}_{command}_records.json`
  - 字段：`arxiv_id`, `summary_path`, `status`, `error`

如果无法拿到合格全文，记录会返回：

- `Full text not available; cannot summarize.`
