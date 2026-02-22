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

### 网页内一键触发更新（可选）

网站上有 `一键触发更新` 按钮，不需要 PAT。

- 点击后会打开仓库的 `update-cs-ro.yml` 页面
- 在 GitHub 页面点一次 `Run workflow` 即可触发更新

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
