---
layout: post
title: GitHub 主页统计卡总裂开？用 GitHub Actions 自己生成，一劳永逸
subtitle: 深挖 github-readme-stats 报错根因：共享 IP、匿名配额、PAT_1，以及 Self-hosted 的正确姿势
categories: 教程与踩坑
tags: [github actions, github profile, lowlighter metrics, github]
---

> 上一篇[《把 GitHub 主页从"炫酷"改回"极简"，我踩过的坑》](/2026/08/31/把GitHub主页从炫酷改回极简我踩过的坑/)里说过："主页上每一个外部 URL，都是一个别人随时可能关掉的灯"。话音刚落，灯就灭了——这次把根因挖到底，并给出终极解法。

## 现象：图又裂了

极简版主页刚上线没几天，GitHub Stats 两张卡变成了这样：

```text
Something went wrong! file an issue at https://git.io/JJmN9
Maximum retries exceeded
Please add an env variable called PAT_1 with your github token in vercel
```

这已经不是官方实例第一次出事了。此前奖杯墙返回 402（实例欠费停用）、官方 stats 返回 503（`DEPLOYMENT_PAUSED`），当时我换了社区镜像，测试全部 200 正常——结果几天后镜像也挂了。

## 根因：一条"公共实例死于配额"的因果链

**第一步：这类图不是预先算好的。**
`github-readme-stats` 的原理是：每次有人打开你的主页，它部署在 Vercel 上的服务端函数**实时**调用 GitHub GraphQL API 拉取你的数据，现场渲染成 SVG 返回。

**第二步：GitHub API 的配额规则。**
- 匿名请求（无 token）：**每个来源 IP 每小时 60 次**
- 带个人访问令牌（PAT）：每小时 5000 次

**第三步：Vercel 免费实例跑在共享 IP 池上。**
Vercel 的 serverless 函数出口 IP 是成千上万个项目共享的。这个实例调 GitHub API 时，用的是"整个出口 IP"的 60 次/小时匿名额度——而这些额度早被共享同一 IP 的其他项目（包括其他 github-readme-stats 部署）抢光了。函数内部重试几次都拿不到数据，于是放弃：**Maximum retries exceeded**。

**第四步：报错文案其实是说给部署者听的。**
"Please add an env variable called PAT_1" 意思是：实例的主人没在 Vercel 里配置自己的 GitHub token。配了 token，配额从 60/小时跳到 5000/小时。所以三个镜像里只有一个活得好——它的主人配了 token。另外 GitHub 的 PAT 是有有效期的，"之前好好的突然挂了"很多时候就是 token 到期没人续。

**官方实例为什么 503？** 同理但更极端：它被几百万个 README 引用，Vercel 免费版的带宽直接打爆，部署被平台暂停。奖杯墙的 402 也是一样——实例欠费停用。

## 为什么 HTTP 200 却是张错误图？

这是排查时最容易踩的坑：这类服务是被 `<img>` 标签嵌在 README 里的，没法弹 HTML 错误页，所以作者**把报错故意渲染成一张 SVG 错误卡片**，HTTP 状态码照样返回 200。

我一开始只测了状态码就宣布"镜像正常"，结果被现实教育了。正确姿势是检查返回内容：

```bash
body=$(curl -s "https://某个镜像/api?username=你的用户名")
echo "$body" | grep -q "Something went wrong" && echo "其实挂了" || echo "真活着"
```

## 终极解法：让渲染发生在自己的 CI 里

不想再赌任何人的实例，有两条 Self-hosted 路线：

1. **自己部署 stats 实例**：fork 仓库 → Vercel 部署 → 配上自己的 token。5 分钟，但依然多一个要养的线上服务。
2. **Action 生成、提交进仓库**：渲染发生在 GitHub Actions 里，产物是仓库里的静态 SVG 文件，谁也不依赖。贪吃蛇（Platane/snk）就是这个模式，实测一直稳如老狗。

这次选了路线 2，用 [lowlighter/metrics](https://github.com/lowlighter/metrics)（15k+ star）生成统计卡。它在自己仓库的 CI 里运行，用仓库自带的 `GITHUB_TOKEN` 调 API——认证配额 5000 次/小时，而且出口 IP 是自己的 runner，彻底绕开共享 IP 的坑。

`.github/workflows/metrics.yml`：

```yaml
name: Generate Metrics
on:
  schedule:
    - cron: "30 0 * * *"   # 每天刷新
  workflow_dispatch:
  push:
    branches: [main]
permissions:
  contents: write
jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - name: General stats
        uses: lowlighter/metrics@latest
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          user: 你的用户名
          filename: metrics/metrics.svg
          base: header, activity, community, repositories, metadata
          config_timezone: Asia/Shanghai
      - name: Languages
        uses: lowlighter/metrics@latest
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          user: 你的用户名
          filename: metrics/languages.svg
          base: ""
          plugin_languages: yes
          plugin_languages_limit: 8
          config_timezone: Asia/Shanghai
```

README 里直接引用仓库本地文件（不用再拼 raw.githubusercontent 的长 URL）：

```html
<img src="./metrics/metrics.svg" alt="github metrics" />
```

推上去后 Action 自动跑一次（约 1 分钟），机器人会把生成的 SVG commit 进仓库。之后每天定时刷新，语言占比、提交数永远是新的，但**渲染这件事已经和任何第三方服务的生死无关了**。

## 复盘三条

1. **"返回 200"不等于"正常"**。凡是把输出当 `<img>` 嵌入的服务，错误信息都会伪装成一张正常的图。测活要验内容，不是状态码。
2. **共享免费实例的稳定性上限，取决于部署者的 token 配置**。它是个公共善缘，挂了别抱怨，换个思路绕开它。
3. **"Action 生成 + 提交进仓库"是 GitHub 主页组件的最优解**：渲染时你有完整的认证配额，产物有 Git 历史兜底，页面加载走 GitHub 自己的 CDN。代价只是每天多跑一分钟 CI。

至此主页上的图片组件全部 Self-hosted：统计卡和贪吃蛇由自己的 CI 生成并提交进仓库，唯一剩下的外部请求只有 skillicons 的静态图标。这一轮之后，应该真的不用再管它了。
