---
layout: post
title: DeepSeek Harness 使用与社区插件记录
subtitle: 从运行 DSH、理解 Cordis 到安装社区插件
categories: 教程与踩坑
tags: [DeepSeek Harness, DSH, pnpm, Claude Agent SDK, Cordis, Koishi]
updated: 2026-08-19
environment: Node.js、pnpm、Python 3
versions: DeepSeek Harness、Claude Agent SDK Python
use_case: 初次运行 DeepSeek Harness、开发本地插件或选择社区插件
---

本文记录 DeepSeek Harness 的基本运行方法，并介绍 pnpm、Claude Agent SDK、Cordis、Koishi、本地插件开发和 DSH 社区插件。Claude Agent SDK 只保留一个 Python 入门示例，其余内容重点放在 DSH 插件生态。

## 运行 DeepSeek Harness

DeepSeek Harness 可以直接通过 npm 运行，也可以从源码运行。

### 通过 npm 运行

先安装 Node.js，再执行：

```bash
npx @deepseek-ai/dsh web
```

### 从源码运行

克隆仓库，安装依赖并完成构建：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```

安装过程中还可以看到 Codex 和 Claude Code SDK 相关内容：

![DeepSeek Harness 安装过程](/assets/images/posts/deepseek-harness/install.png)

DSH 运行后的首页如下：

![DSH 运行首页](/assets/images/posts/deepseek-harness/home.png)

## pnpm 是什么

pnpm 是一个快速、节省磁盘空间的 JavaScript 和 Node.js 包管理器，作用类似于 npm 和 Yarn。

它主要用于：

- 安装项目依赖：`pnpm install`
- 添加依赖：`pnpm add axios`
- 删除依赖：`pnpm remove axios`
- 执行项目脚本：`pnpm run dev`
- 管理 Monorepo 多包项目：`pnpm workspace`

pnpm 将依赖包保存在全局内容寻址存储中，各个项目通过链接复用。因此，它通常比 npm 更节省空间，安装速度也更快。pnpm 还采用更严格的依赖隔离，可以减少项目误用未声明依赖的问题。

常见安装方式：

```bash
npm install -g pnpm
```

简单来说，pnpm 是 npm 的兼容替代品，尤其适合依赖较多或使用 Monorepo 的项目。

## Claude Agent SDK Python 示例

Claude Code SDK 现使用 `claude-agent-sdk` 包。Python 版的核心接口是异步的 `query()`。

### 安装

创建项目和虚拟环境，然后安装 SDK：

```bash
mkdir claude-agent-demo
cd claude-agent-demo

python3 -m venv .venv
source .venv/bin/activate

pip install claude-agent-sdk
```

也可以使用 `uv`：

```bash
uv init
uv add claude-agent-sdk
```

配置 API Key：

```bash
export ANTHROPIC_API_KEY="你的-api-key"
```

### 最小对话示例

创建 `main.py`：

```python
import asyncio

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    query,
)


async def main():
    options = ClaudeAgentOptions(
        max_turns=1,
        tools=[],  # 不开放文件、终端等工具
    )

    async for message in query(
        prompt="请用一句中文介绍 Python。",
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text)


if __name__ == "__main__":
    asyncio.run(main())
```

运行：

```bash
python main.py
```

### 常用参数

- `cwd`：Agent 操作的项目目录。
- `max_turns`：最多执行多少轮。
- `tools`：Agent 可以看到和使用的工具。
- `allowed_tools`：可以不经确认直接执行的工具。
- `permission_mode="acceptEdits"`：自动接受文件修改。

如果只想分析项目，可以开放 `Read`、`Glob` 和 `Grep`。需要创建文件时再加入 `Write` 和 `Edit`；需要执行命令时再加入 `Bash`。

## DeepSeek Harness Python SDK

### 安装 SDK

克隆仓库以使用其中可以直接运行的示例，然后创建虚拟环境，安装 SDK 及其同版本的内置运行时：

```bash
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
python -m venv .venv
. .venv/bin/activate
python -m pip install deepseek-harness-sdk
```

安装后的运行时不需要系统提供 Node.js。需要从源码构建运行时或 wheel 包的仓库贡献者，应使用 [Python 贡献者工作流](https://github.com/deepseek-ai/deepseek-harness/blob/master/python/development.md)。

### 运行仓库内置示例

先在环境中设置凭据。如果模型不是由默认 DeepSeek 端点提供，而是通过 OpenAI 兼容代理提供，还需要设置 `DEEPSEEK_BASE_URL`：

```bash
export DEEPSEEK_API_KEY=sk-your-key-here
# export DEEPSEEK_BASE_URL=http://127.0.0.1:8000/v1
# export DSH_MODEL=deepseek-v4-flash
# export DSH_SYSTEM_PROMPT='You are a helpful software engineer assistant.'
```

针对隔离的 workspace 和会话目录运行一个任务：

```bash
python examples/jsonrpc-agent/minimal.py \
  --workspace /absolute/path/to/workspace \
  --session-root /absolute/path/to/sessions \
  --session-id example-001 \
  "Inspect the repository and fix the failing tests."
```

脚本会打印 assistant 的最终回复。会话目录会收到 JSONL 日志，其中包含组装后的模型请求与工具调用。

### 在自己的程序中使用 SDK

仓库内置示例是下面这段 SDK 调用的轻量包装：

```python
from pathlib import Path

from deepseek_harness import DeepSeekHarness

config = Path("examples/jsonrpc-agent/minimal.cordis.yml").resolve()
workspace = Path("/absolute/path/to/workspace").resolve()
sessions = Path("/absolute/path/to/sessions").resolve()

with DeepSeekHarness(
    provider="deepseek-official",
    model="deepseek-v4-flash",
    max_tokens=49_152,
    cwd=str(workspace),
    session_root=str(sessions),
    cordis=str(config),
) as harness:
    result = harness.run(
        "Inspect the repository and fix the failing tests.",
        session_id="example-001",
    )

print(result.final_response)
```

`DeepSeekHarness` 会延迟启动内置运行时，并持续复用，直到退出上下文管理器。复用同一个 harness 和 session id，会保留该会话拥有的 Bash 进程，包括其工作目录、已导出的变量和 shell 函数。

独立任务应使用新的 session id。只有下一次调用需要延续同一段持久化对话时，才复用原有 id。

## 创建第一个 Harness 插件

下面创建一个最小的 Harness 插件，并将它加载到 Web UI。开始前，需要先按前文步骤从源码运行 DeepSeek Harness。

### 创建本地项目

在 DeepSeek Harness 仓库根目录创建本教程使用的临时项目：

```bash
mkdir -p scratch-plugin/src
```

### 创建插件文件

创建 `scratch-plugin/src/my-plugin.ts`：

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello-plugin'

export function apply(ctx: Context) {
  // Required dependencies are ready before apply runs.
  console.log('[hello-plugin] plugin loaded!')
}
```

### 注册到 `cordis.yml`

在仓库根目录运行 `pwd`，取得当前仓库的绝对路径。然后创建 `scratch-plugin/cordis.yml`，将它作为插入本地插件的 Web 覆盖层：

```yaml
- insert:
    - id: hello
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```

需要把 `/absolute/path/to/deepseek-harness` 替换为 `pwd` 输出的路径。

插件路径必须是绝对路径。patch 文件只提供配置，不会改变 loader 解析模块路径时使用的 profile 目录。

### 启动并验证

使用该覆盖层启动 Web UI：

```bash
pnpm dsh web --patch ./scratch-plugin/cordis.yml
```

打开 <http://127.0.0.1:3080>。启动期间，终端会打印：

```text
[hello-plugin] plugin loaded!
```

## Cordis 是什么

Cordis 是一个面向 Node.js 和 TypeScript 的插件化框架。它基于上下文和依赖注入工作，是 Koishi 生态的底层组件之一，主要负责服务、插件生命周期和事件管理。

Cordis 类似于 轻量 Spring 容器 + PF4J 插件机制 + Spring 事件系统。

Cordis 不是 Web 框架，而是一套组织和运行应用的机制。它适合以下场景：

- 聊天机器人及其插件系统，例如 Koishi
- 支持第三方扩展的 CLI 工具
- 模块化后端服务
- 游戏服务器或自动化程序
- 可以动态启用、禁用和重载插件的长期运行应用
- 在测试环境中替换服务和隔离依赖

### Cordis 主要解决的问题

#### 插件管理

每项功能都可以封装成独立插件，入口文件不需要了解插件的内部实现：

```ts
ctx.plugin(databasePlugin)
ctx.plugin(loggerPlugin)
ctx.plugin(httpPlugin)
```

#### 生命周期管理

插件可能创建定时器、监听器、网络连接或子进程。Cordis 可以在插件卸载时集中清理资源：

```ts
function plugin(ctx: Context) {
  const timer = setInterval(() => {
    console.log('working')
  }, 1000)

  ctx.on('dispose', () => {
    clearInterval(timer)
  })
}
```

这对插件重载和长期运行的应用很重要。

#### 服务与依赖注入

例如，一个业务插件同时需要数据库和日志服务：

```text
Context
├── LoggerService
├── DatabaseService
└── UserPlugin
    ├── 使用 LoggerService
    └── 使用 DatabaseService
```

插件不用自己创建所有依赖，而是从当前上下文取得服务。这样容易替换数据库实现，也方便测试。

#### 事件驱动通信

插件可以通过事件协作，减少直接依赖：

```ts
ctx.on('user-created', (user) => {
  console.log('新用户：', user)
})

ctx.emit('user-created', {
  id: 1,
  name: 'Alice',
})
```

在 TypeScript 项目中，通常还要为自定义事件补充类型声明。

#### 插件隔离和作用域

Cordis 可以创建不同的上下文作用域，让插件只在特定条件或配置下生效。Koishi 正是通过这种能力管理机器人平台、频道、数据库和各种插件。

简单来说，Express 和 Koa 主要解决 HTTP 请求处理；Cordis 主要解决大型应用中的插件、服务依赖和生命周期管理。简单脚本通常不需要 Cordis；需要大量可插拔模块、动态重载和统一资源清理时，Cordis 更合适。

### Cordis 小 demo

先安装依赖：

```bash
mkdir cordis-demo
cd cordis-demo
pnpm init
pnpm add cordis
pnpm add -D typescript tsx @types/node
```

创建 `index.ts`：

```ts
import { Context } from 'cordis'

const ctx = new Context()

function helloPlugin(ctx: Context) {
  console.log('[hello] 插件已加载')

  ctx.on('ready', () => {
    console.log('[hello] 应用已启动')
  })

  const timer = setInterval(() => {
    console.log('[hello] 插件正在运行')
  }, 1000)

  ctx.on('dispose', () => {
    clearInterval(timer)
    console.log('[hello] 插件正在销毁')
  })
}

ctx.plugin(helloPlugin)

async function main() {
  await ctx.start()

  setTimeout(async () => {
    await ctx.stop()
    console.log('应用已关闭')
  }, 3000)
}

main().catch(console.error)
```

运行：

```bash
pnpm tsx index.ts
```

这个例子展示了插件注册、应用启动和资源清理。

## Koishi 是什么

Koishi 是一个使用 TypeScript 开发的开源聊天机器人框架。它可以用一套代码连接 QQ、Telegram、Discord 等多个聊天平台，并通过插件扩展功能。

Cordis、Koishi 和插件的关系如下：

```text
Cordis：底层插件、服务和生命周期系统
   ↓
Koishi：增加机器人、消息和数据库等能力
   ↓
插件：签到、问答、管理、AI 对话和游戏等功能
```

Koishi 常见用途包括：

- QQ、Telegram、Discord 等平台机器人
- 群聊管理、关键词回复和定时通知
- AI 聊天机器人
- 签到、抽奖、积分和小游戏
- 消息转发及跨平台同步
- 企业或社区自动化工具

一个简单的 Koishi 插件如下：

```ts
import { Context } from 'koishi'

export const name = 'hello'

export function apply(ctx: Context) {
  ctx.command('hello')
    .action(() => '你好，世界！')

  ctx.command('echo <message:text>')
    .action((_, message) => message)
}
```

用户发送 `hello`，机器人回复“你好，世界！”。发送 `echo 测试消息`，机器人回复“测试消息”。如果目标是开发聊天机器人，通常直接使用 Koishi；如果要构建自己的插件式应用框架，可以直接使用 Cordis。

## DSH 插件的八大业务平面

DSH 插件可以分为八类：

| 类型 | 作用 | 典型场景 |
| --- | --- | --- |
| Model（模型） | LLM 适配器，接入不同模型提供商 | 切换 DeepSeek、OpenAI、Anthropic 或本地 vLLM，支持近 40 家 |
| Tool（工具） | 模型可见、可调用的函数 | 文件编辑、Shell 执行、搜索和数据库操作等 |
| Skill（技能） | 预设能力包或工作流模板 | 编码规范、代码审查和特定领域任务流程 |
| Session（会话） | 会话持久化、上下文管理和压缩策略 | 历史记录存储，token 溢出时自动摘要 |
| Sandbox（沙箱） | 隔离代码执行环境 | Shell 执行器、文件系统提供者和权限边界 |
| Storage（存储） | 记忆和数据后端 | 向量库、KV 存储和会话日志落盘 |
| Loop（主循环） | Agent 决策循环，决定下一步做什么 | 替换推理策略，自定义 ReAct 或 Plan-and-Execute |
| Scheduling（调度） | 子 Agent 调度与任务编排 | 多 Agent 分工和并行任务分发 |

例如，要开发一个会对会话事件作出反应的小宠物，可以使用 Session 插件。

## DSH 社区生态

### 安装前置说明

社区插件统一使用下面的命令安装：

```bash
dsh plugin --profile web add "github:owner/repo#main"
```

启动 Web UI 时需要加入 `--patch`，否则很多插件不会生效：

```bash
npx @deepseek-ai/dsh web --patch
```

### 第一梯队：主要界面与能力插件

#### 1. dsh-web-ui：界面全家桶

仓库：`zhu1090093659/dsh-web-ui`，原稿记录为 4.2k+ Star。

```bash
dsh plugin --profile web add "github:zhu1090093659/dsh-web-ui#main"
```

默认的 `dsh web` 是一个简单聊天界面。这个插件增加五列任务看板、真实会话任务执行、cron 定时、Git 图谱、实时 Token 统计、皮肤中心、移动端远程 UI 和桌面宠物。如果只安装一个社区插件，可以先装它。

#### 2. dsh-better-sidebar：IDE 风格工作台

仓库：`omdsh-dev/DSH-better-sidebar`，原稿记录为 680+ Star。

```bash
dsh plugin --profile web add "github:omdsh-dev/DSH-better-sidebar#main"
```

它给 Web UI 增加类似 VS Code 或 Codex 的侧边栏，包括文件树、代码编辑器、内置终端、Git Diff 和子 Agent 状态面板。它与 `dsh-web-ui` 不冲突：前者增强工作区，后者调整整体界面，可以一起安装。

#### 3. dsh-at-file：@ 引用文件

仓库：`omdsh-dev/dsh-at-file`。

```bash
dsh plugin --profile web add "github:omdsh-dev/dsh-at-file#main"
```

在输入框输入 `@` 后，会自动显示工作区文件列表。选中文件后，文件内容会附加到提示词，不再需要手动复制。

#### 4. ModLens：给纯文本模型增加视觉能力

仓库：`liustack/modlens`，原稿记录为 900+ Star。

```bash
dsh plugin --profile web add "@liustack/modlens@3.17.2"
```

DeepSeek 是纯文本模型，不能直接看图。ModLens 通过视觉模型把截图、设计稿和流程图转成结构化文本证据，再交给 DeepSeek。它可以处理报错截图，也可以根据 UI 设计稿辅助还原界面。原稿特别注明要锁定版本号，不要使用 `@latest`。

### 第二梯队：按需求安装

#### 5. dsh-context-doctor：查看 Token 占用

仓库：`Zhenyu98/dsh-context-doctor`。

```bash
dsh plugin --profile web add "github:Zhenyu98/dsh-context-doctor#main"
```

它会分别统计系统提示词、技能目录和工具 schema 的 Token 占用，检测重复和冲突并给出裁剪建议。整个过程只读，不会修改配置。Token 消耗过快时，可以先用它排查。

#### 6. dsh-agent-teams：多 Agent 团队协作

仓库：`NanmiCoder/dsh-agent-teams`。

```bash
dsh plugin --profile web add "github:dsh-external/dsh-agent-teams#main"
```

它可以用自然语言创建一个多 Agent 团队：创建队长、加入成员、拆分带依赖的任务，并让成员直接收发消息。Web UI 右上角会显示实时团队活动，适合市场调研、技术选型和多维度报告等复杂任务。

#### 7. dsh-plan-execute：双模型降本

仓库：`dsh-external/dsh-plan-execute`。

```bash
dsh plugin --profile web add "github:dsh-external/dsh-plan-execute#main"
```

它让推理模型负责规划，经济模型负责执行。复杂任务先由强模型拆解，子任务再交给便宜模型执行。安装后，设置页会增加“规划模型”和“执行模型”配置。

#### 8. dsh-TUI：终端界面

仓库：`ccch1mneyyy/dsh-TUI`，原稿记录为 790+ Star。

```bash
dsh plugin --profile web add "github:ccch1mneyyy/dsh-TUI#main"
```

安装后执行：

```bash
dsh --profile cc-tui
```

它提供全屏终端界面，可以在同一个视图中查看流式输出、上下文用量、Token 速度、键盘快捷键和回滚操作，适合习惯 Claude Code 或 Codex CLI 的用户。

#### 9. dsh-browser：操作真实 Chrome

仓库：`Lum1104/dsh-browser`。

```bash
curl -fsSL https://raw.githubusercontent.com/Lum1104/dsh-browser/refs/heads/main/scripts/install.sh | bash
```

它不是截图分析工具，而是通过 Chrome 扩展桥接，读取真实页面内容并执行交互操作。处理需要登录状态的网站、后台或内网系统时，比纯截图方案更合适。

### 第三梯队：其他按需插件

| 插件 | 解决的问题 | 安装方式或来源 |
| --- | --- | --- |
| `dsh-turn-rewind` | 保存会话和工作区快照，随时回退，防止文件改错后无法恢复 | `github:Anionex/dsh-turn-rewind#main` |
| `dsh-automation` | 录制并编排重复任务，建立自动化 Agent 流水线 | `github:titanwings/dsh-automation#main` |
| `dsh-data-agent` | 连接 MySQL、PostgreSQL、SQLite、Oracle 和 Hive，让 Agent 查看表结构、编写并执行 SQL | `github:omdsh-dev/dsh-data-agent` |
| `dsh-report-studio` | 将会话生成日报、周报、交接文档或文章 | 在社区搜索 `dsh-report-studio` |
| `dsh-genui` | 在回复中渲染图表、表单、Mermaid 和 3D 场景等交互组件 | `git+https://github.com/omdsh-dev/dsh-genui.git` |
| `dsh-vision-toolkit` | 图片问答、长截图 OCR、UI 重建和像素对比 | `@anionex/dsh-vision-toolkit` |
| `graph-memory` / `mnemon` | 跨会话长期记忆、图谱关系检索和向量搜索 | 查看各自仓库 |
| `dsh-market` / `dsh-plugin-hub` | 在 UI 中搜索和安装其他插件 | `dshmarket` |
| `whale-girl` / `dsh-dafeiyu` | 会对会话事件作出反应的桌面宠物 | `github:vlln/whale-girl#main` |

### 按用户类型选择插件

| 用户类型 | 推荐组合 |
| --- | --- |
| 只想用它完成日常任务 | `dsh-web-ui` + `dsh-at-file` + `ModLens` |
| 想要 Codex 风格界面 | `dsh-better-sidebar` + `dsh-at-file` + `ModLens` |
| 纯终端用户 | `dsh-TUI` + `ModLens` |
| 不想安装 Node.js | `deepseek-harness-desktop`，Electron 桌面端，双击即用 |
| 复杂任务或多 Agent | 基础组合 + `dsh-agent-teams` + `dsh-plan-execute` |
| 成本敏感 | 基础组合 + `dsh-context-doctor` + `dsh-plan-execute` |
| 需要操作浏览器或后台 | 基础组合 + `dsh-browser` |

### 查找更多插件

- Awesome 列表：`github.com/awesome-dsh-plugin/awesome-dsh-plugin`，原稿记录有 218 个精选插件。
- Oh-My-DSH 聚合：`github.com/like-study1/Oh-My-DSH`，原稿记录收录了 1117 个插件。
- GitHub 话题：搜索 `dsh-plugin` topic。
- 插件市场：`dsh.so`、`dsh-plugins.top`。

### 试用 dsh-web-ui

`dsh-web-ui` 提供任务看板、Git、手机远程访问和 SSH 等功能。下面是任务看板界面：

![dsh-web-ui 任务看板](/assets/images/posts/deepseek-harness/task-board.png)

## 总结

DeepSeek Harness 与 VS code 像，可用性强，比 Claude 格局大


## PI Agent

| 对比维度 | Pi Agent | OpenCode |
|---|---|---|
| 设计哲学 | 原语（Primitives）而非功能（Features）——给你积木，你自己搭 | 终端里的全功能 IDE——开箱即用，功能完整 |
| 核心工具数 | 仅 4 个：`read`、`write`、`edit`、`bash` | 20+ 内置工具，包含 LSP 集成、多文件编辑、规划 Agent、记忆系统等 |
| 系统提示词 | 约 200–1,000 Tokens（极致精简） | 10K+ Tokens（功能越多，提示越重） |
| 安装复杂度 | 中（需要理解设计哲学，自己写扩展） | 低（一条命令安装，几分钟配好） |
| GitHub Stars | 约 15K–32K | 140K+（社区人气王） |
| 开发者 | Mario Zechner（libGDX 作者） | AnomalyCo（SST 团队） |
| 编程语言 | TypeScript | Go |


### Pi 插件

pi install npm:pi-subagents          # 子代理
pi install npm:pi-mcp-adapter       # MCP 支持
pi install npm:pi-web-access        # 网页搜索
pi install npm:context-mode         # 极致上下文节省
pi install npm:pi-hermes-memory     # 记忆扩展

### 总结

在未来的趋势，模式训练会针对 Agent 能力做训练（ToolBench， AgentBench 基准测试）基础编程提示会嵌入模型训练中