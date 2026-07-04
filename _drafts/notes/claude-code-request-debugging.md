查看 Claude Code 的请求与回复，核心是拦截 / 代理 API 流量或用专用工具记录日志，下面给你最常用、最省事的几种方案。
一、官方 / 原生方式（最稳）
1. 环境变量开启日志（简单）
在启动 Claude Code 前设置环境变量，让它输出完整请求 / 响应：
bash
运行
# 开启详细日志（含请求体、响应体）
export ANTHROPIC_LOG_LEVEL=debug
# 启动 Claude Code
claude
优点：无需额外工具，直接在终端看原始 JSON
缺点：日志量大、不易阅读，适合快速排查
2. 官方 CLI 内置调试（部分版本）
部分版本支持 --debug 或 --verbose：
bash
运行
claude --debug "你的指令"
会打印请求头、请求体、响应状态与内容。


二、专用工具（可视化，推荐）
1. claude-trace（最流行）
安装：
bash
运行
npm install -g @mariozechner/claude-trace
# 或中文优化版
npm install -g @loki-zhou/claude-trace
使用：
bash
运行
# 启动带追踪的 Claude Code
claude-trace
# 包含所有请求（含预热、Token 计数）
claude-trace --include-all-requests
效果：
自动生成 .claude-trace/ 目录，保存 jsonl 与 html 报告
打开 html 可查看：系统提示词、完整请求 / 响应、工具调用、Token 用量、思考过程
2. CC-Viewer（实时 Web 面板）
安装：
bash
运行
npm install -g cc-viewer
使用：
bash
运行
# 启动监控服务
ccv
# 正常使用 Claude Code
claude
# 浏览器打开：http://localhost:7008
效果：
实时捕获所有 API 请求（含流式响应）
左侧列表：方法、URL、耗时、状态码
右侧详情：Request / Response 完整 JSON、Token 统计、请求差异对比