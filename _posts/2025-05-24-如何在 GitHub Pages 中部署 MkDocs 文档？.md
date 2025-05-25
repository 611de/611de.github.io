---
layout: post
title: 如何在 GitHub Pages 中部署 MkDocs 文档？
subtitle: 配置 Github Aciton 自动触发打包和部署 MkDocs
categories: Docs
tags: [docs]
---

# 如何在 GitHub Pages 中部署 MkDocs 文档
想把用 MkDocs 写好的文档部署到 GitHub Pages 上，方便分享和展示？按下面步骤操作，轻松搞定。

## 一、准备工作
### 1. 准备 MkDocs 文档
先整理好项目目录：
```
项目根目录/
├── .github/
│   └── workflows/
│       └── deploy.yml  # 部署配置文件
├── docs/
│   ├── mkdocs.yml  # MkDocs 配置文件
│   ├── site/  # mkdocs build 生成的静态文件会放在这里（一开始是空的）
│   └── 其他文档.md  # 存放你的 Markdown 文档
└── ...
```
`mkdocs.yml` 用来设置文档的主题、导航等；`deploy.yml` 是 GitHub Actions 的工作流配置文件，决定怎么部署。

### 2. 安装依赖
在项目的 Python 环境里，打开命令行，进入项目目录，运行下面命令，安装 MkDocs 及其插件：
```bash
python -m pip install --upgrade pip
pip install mkdocs
pip install mkdocs-material  # 好看的主题
pip install 其他插件  # 根据需要安装，比如代码文档生成插件
```

### 3. 本地测试
python 依赖安装完成后，在本地查看效果使用下面的命令
```bash
mkdocs serve
```


## 二、配置 GitHub Actions 工作流
打开 `.github/workflows/deploy.yml` 文件，写入以下内容：
```yaml

name: Deploy Docs to GitHub Pages  # 工作流名字

on:
  push:
    branches:
      - main  # 当 main 分支有代码推送时，触发这个工作流

permissions:
  contents: read  # 读取仓库内容
  pages: write  # 写入 GitHub Pages
  id-token: write  # 获取身份令牌

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest  # 在最新的 Ubuntu 环境运行
    steps:
      - name: Checkout code  # 拉取代码
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Set up Python  # 安装 Python 环境
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'  # 选个合适的 Python 版本
          
      - name: Install dependencies  # 安装依赖
        working-directory: docs
        run: |
          python -m pip install --upgrade pip
          pip install mkdocs==1.6.1
          pip install mkdocs-material==9.6.14
          pip install mkdocstrings==0.29.1
          pip install mkdocstrings-python==1.16.10
          pip install mkdocs-autorefs==1.4.2
          pip install mkdocs-jupyter==0.25.1
         
      - name: Build docs  # 构建文档
        working-directory: docs
        run: mkdocs build
      - name: Upload artifact  # 上传构建产物
        uses: actions/upload-pages-artifact@v3
        with:
          path: './docs/site' 
      - name: Deploy to GitHub Pages   # 部署到 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```
这个配置的意思是：当 `main` 分支有代码推送，就启动工作流。先拉取代码，安装 Python 环境和依赖，然后用 MkDocs 构建文档，把生成的文件上传，最后部署到 GitHub Pages。

## 三、部署和检查
把代码推送到 GitHub 仓库的 `main` 分支，GitHub Actions 会自动运行刚刚配置的工作流。

等工作流跑完，去仓库的 **Settings > Pages** 页面，稍等一会儿，看到提示 “Your site is live at https://你的用户名.github.io/你的仓库名/” ，点击链接，就能看到部署好的 MkDocs 文档了。

要是部署失败，去 GitHub Actions 里点击工作流的运行记录，查看日志，根据报错信息找问题，比如权限不够、依赖没装好等等。

按照这些步骤，你就能把 MkDocs 文档部署到 GitHub Pages 上，随时分享给别人看啦！ 


---
引用 [豆包](https://www.doubao.com)