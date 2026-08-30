deepseek harness

1. 使用

Run from npm
Install Node.js, then run:

npx @deepseek-ai/dsh web


2. Run from source
To run from a repository checkout:

git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web

pnpm 是什么？
pnpm 是一个快速、节省磁盘空间的 JavaScript/Node.js 包管理器，作用类似于 npm 和 Yarn。
它主要用于：
安装项目依赖：pnpm install
添加依赖：pnpm add axios
删除依赖：pnpm remove axios
执行项目脚本：pnpm run dev
管理 Monorepo 多包项目：pnpm workspace
pnpm 的特点是：依赖包只在全局内容寻址存储中保存一份，各项目通过链接复用，因此通常比 npm 更省空间，安装也更快。它还采用更严格的依赖隔离，可以减少项目误用未声明依赖的问题。
常见安装方式：
npm install -g pnpm
简单来说：pnpm 是 npm 的兼容替代品，尤其适合依赖较多或使用 Monorepo 的项目。


安装过程记录：
安装时还有 codex 和 claude code sdk
![alt text](image-1.png)



claude code sdk 如何使用？

python版本演示：
Python 版使用 `claude-agent-sdk`，核心接口是异步的 `query()`。

## 1. 安装

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

## 2. 最小对话 demo

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

## 3. 分析当前项目

下面这个 Agent 可以读取和搜索当前项目，但不能修改文件：

```python
import asyncio
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ResultMessage,
    TextBlock,
    query,
)


async def main():
    options = ClaudeAgentOptions(
        cwd=Path.cwd(),
        max_turns=5,

        # 严格限制可以使用的工具
        tools=["Read", "Glob", "Grep"],

        # 这些工具可以直接执行，无需确认
        allowed_tools=["Read", "Glob", "Grep"],
    )

    prompt = """
    分析当前项目：

    1. 判断项目使用了什么技术
    2. 介绍主要目录及其作用
    3. 找出可能存在的问题
    4. 给出三个改进建议

    只进行分析，不要修改任何文件。
    """

    async for message in query(prompt=prompt, options=options):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text)

        elif isinstance(message, ResultMessage):
            print(f"\n执行结果：{message.subtype}")


if __name__ == "__main__":
    asyncio.run(main())
```

## 4. 让 Agent 创建文件

```python
import asyncio
from pathlib import Path

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    TextBlock,
    query,
)


async def main():
    options = ClaudeAgentOptions(
        cwd=Path.cwd(),
        max_turns=8,
        tools=["Read", "Glob", "Write", "Edit"],
        allowed_tools=["Read", "Glob", "Write", "Edit"],
        permission_mode="acceptEdits",
    )

    async for message in query(
        prompt="""
        在当前目录创建 hello.html。

        要求：
        - 页面标题为 Claude Agent SDK Demo
        - 页面中央显示“Hello Claude”
        - 使用简洁、现代的 CSS
        """,
        options=options,
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if isinstance(block, TextBlock):
                    print(block.text)


if __name__ == "__main__":
    asyncio.run(main())
```

主要参数：

- `cwd`：Agent 操作的项目目录。
- `max_turns`：最多执行多少轮。
- `tools`：Agent 实际能看到和使用的工具。
- `allowed_tools`：哪些工具可以不经确认自动执行。
- `permission_mode="acceptEdits"`：自动接受文件修改。

建议一开始只开放 `Read`、`Glob` 和 `Grep`。确认行为符合预期后，再加入 `Write`、`Edit` 或 `Bash`。



DSH 运行首页 :
![alt text](image-2.png)



第一个插件
本教程会创建一个最小的 Harness 插件，并将其加载到 Web UI 中。请从已完成从源码运行路径的仓库检出开始。

创建本地项目
在仓库根目录创建本教程使用的临时项目：


mkdir -p scratch-plugin/src

创建插件文件
创建 scratch-plugin/src/my-plugin.ts：


import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello-plugin'

export function apply(ctx: Context) {
  // Required dependencies are ready before apply runs.
  console.log('[hello-plugin] plugin loaded!')
}
注册到 cordis.yml
在仓库根目录运行 pwd，然后创建 scratch-plugin/cordis.yml，作为插入本地插件的 Web 覆盖层。请将下文的 /absolute/path/to/deepseek-harness 替换为命令打印的路径：


- insert:
    - id: hello
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
插件路径必须是绝对路径。patch 文件只贡献配置，不会改变 loader 解析模块路径时使用的 profile 目录。

使用该覆盖层启动 Web UI：


pnpm dsh web --patch ./scratch-plugin/cordis.yml
打开 http://127.0.0.1:3080。启动期间，终端会打印 [hello-plugin] plugin loaded!。


## Cordis  是什么？

Cordis（Node.js/TypeScript 框架）：一个基于上下文和依赖注入的插件化框架，是 Koishi 生态的底层组件之一，用于管理服务、插件生命周期和事件。 一个小demo看一下

## cordis 可以用来做什么?

Cordis 主要用于构建插件化、模块化的 Node.js/TypeScript 应用。它不是 Web 框架，而是一套应用组织和运行时管理机制。
典型用途包括：
聊天机器人及其插件系统，例如 Koishi
支持第三方扩展的 CLI 工具
模块化的后端服务
游戏服务器或自动化程序
可动态启用、禁用、重载插件的长期运行应用
测试环境中的服务替换和依赖隔离

### 主要解决以下问题：
它主要解决以下问题：
插件管理
ctx.plugin(databasePlugin);
ctx.plugin(loggerPlugin);
ctx.plugin(httpPlugin);
每项功能都可以封装成独立插件，入口文件不需要了解其内部实现。
生命周期管理
插件可能会创建定时器、监听器、网络连接或子进程。Cordis 可以在插件被卸载时集中清理这些资源：
function plugin(ctx: Context) {
  const timer = setInterval(() => {
    console.log("working");
  }, 1000);

  ctx.on("dispose", () => {
    clearInterval(timer);
  });
}
这对插件重载和长期运行的应用非常重要。
服务与依赖注入
例如业务插件需要数据库和日志服务：
Context
├── LoggerService
├── DatabaseService
└── UserPlugin
    ├── 使用 LoggerService
    └── 使用 DatabaseService
插件不必自己创建所有依赖，而是从当前上下文获取服务。这样更容易替换数据库实现，也更方便测试。
事件驱动通信
插件之间可以通过事件协作，减少直接依赖：
ctx.on("user-created", (user) => {
  console.log("新用户：", user);
});

ctx.emit("user-created", {
  id: 1,
  name: "Alice",
});
在 TypeScript 项目中，通常还会为自定义事件补充类型声明。
插件隔离和作用域
Cordis 可以创建不同的上下文作用域，使某个插件只在特定条件或配置下生效。Koishi 正是利用这种能力管理机器人平台、频道、数据库和各种插件。



### 简单来说
Express、Koa 主要解决 HTTP 请求处理；Cordis 主要解决大型应用中的插件、服务依赖和生命周期管理。

如果只是写一个简单脚本，通常不需要 Cordis；如果应用需要很多可插拔模块、动态重载以及统一的资源清理机制，它会比较合适。
## Koishi 是什么？
Koishi 是一个使用 TypeScript 开发的开源聊天机器人框架，可以用一套代码连接多个聊天平台，并通过插件扩展功能。
它和 Cordis 的关系可以简单理解为：
Cordis：底层插件、服务和生命周期系统
   ↓
Koishi：在 Cordis 上增加机器人、消息、数据库等能力
   ↓
插件：签到、问答、管理、AI 对话、游戏等具体功能
Koishi 常见用途包括：
QQ、Telegram、Discord 等平台机器人
群聊管理、关键词回复和定时通知
AI 聊天机器人
签到、抽奖、积分和小游戏
消息转发及跨平台同步
自定义企业或社区自动化工具




## DSH 插件可以有哪些 八大业务平面插件
表格
类型	作用	典型场景
Model（模型）	LLM 适配器，接入不同模型提供商	切换 DeepSeek / OpenAI / Anthropic / 本地 vLLM，支持近 40 家
Tool（工具）	模型可见、可调用的函数	文件编辑、Shell 执行、搜索、数据库操作等
Skill（技能）	预设能力包 / 工作流模板	编码规范、代码审查、特定领域任务流程
Session（会话）	会话持久化、上下文管理、压缩策略	历史记录存储、token 溢出时自动摘要
Sandbox（沙箱）	代码执行环境隔离	Shell 执行器、文件系统提供者、权限边界
Storage（存储）	记忆 / 数据后端	向量库、KV 存储、会话日志落盘
Loop（主循环）	Agent 决策循环，决定 "下一步做什么"	替换推理策略、自定义 ReAct / Plan-and-Execute
Scheduling（调度）	子 Agent 调度与任务编排	多 Agent 分工、并行任务分发


### 开发一个小宠物

使用 session 插件



## 社区生态

安装前置说明
所有插件统一安装命令：
bash
dsh plugin --profile web add "github:owner/repo#main"

启动 Web UI 时必须加 --patch，否则很多插件不生效：
bash
npx @deepseek-ai/dsh web --patch



1. dsh-web-ui — 界面全家桶
仓库：zhu1090093659/dsh-web-ui | ⭐ 4.2k+
bash
dsh plugin --profile web add "github:zhu1090093659/dsh-web-ui#main"
默认 dsh web 就是个纯聊天框（毛坯房）。装上直接变精装：任务看板（五列看板，卡片可交给真实会话执行，支持 cron 定时）、Git 图谱、实时 Token 统计、皮肤中心、移动端远程 UI、甚至内置了桌面宠物。如果只装一个，就装它。
2. dsh-better-sidebar — IDE 风格工作台
仓库：omdsh-dev/DSH-better-sidebar | ⭐ 680+
bash
dsh plugin --profile web add "github:omdsh-dev/DSH-better-sidebar#main"
给 Web UI 加一个 VSCode/Codex 风格的侧边栏：文件树、代码编辑器、内置终端、Git Diff、子 Agent 状态面板。和 dsh-web-ui 不冲突 —— 前者管功能增强，后者管布局，可以一起装。
3. dsh-at-file — @ 引用文件
仓库：omdsh-dev/dsh-at-file
bash
dsh plugin --profile web add "github:omdsh-dev/dsh-at-file#main"
输入框打 @ 自动弹出工作区文件列表，选中后文件内容自动附加到提示词。不用再手动复制粘贴，体验追平 Codex。
4. ModLens — 给纯文本模型装眼睛
仓库：liustack/modlens | ⭐ 900+
bash
dsh plugin --profile web add "@liustack/modlens@3.17.2"
DeepSeek 是纯文本模型，看不了图。ModLens 通过视觉模型把截图 / 设计稿 / 流程图转成结构化文本证据，再喂给 DeepSeek。贴报错截图、丢 UI 设计稿让它还原都靠它。注意锁版本号，别用 @latest。
第二梯队：强烈推荐（按需求装）
5. dsh-context-doctor — 看清 Token 账单
仓库：Zhenyu98/dsh-context-doctor
bash
dsh plugin --profile web add "github:Zhenyu98/dsh-context-doctor#main"
逐项量化系统提示词 / 技能目录 / 工具 schema 各占多少 Token，自动检测重复冲突，给裁剪建议。全程只读，不影响配置。Token 烧得快时先装它排查。
6. dsh-agent-teams — 多 Agent 团队协作
仓库：NanmiCoder/dsh-agent-teams
bash
dsh plugin --profile web add "github:dsh-external/dsh-agent-teams#main"
一句自然语言驱动一个多 Agent 团队：创建队长 → 拉成员 → 拆任务声明依赖 → 成员间直接收发消息。Web 右上角有实时团队活动面板。适合市场调研、技术选型、多维度报告这类复杂任务。
7. dsh-plan-execute — 双模型降本
仓库：dsh-external/dsh-plan-execute
bash
dsh plugin --profile web add "github:dsh-external/dsh-plan-execute#main"
规划用推理模型，执行用经济模型。复杂任务先让强模型拆解规划，子任务交给便宜模型执行。脑子和手脚分开用，装完设置页会多出 "规划 / 执行模型" 配置行。
8. dsh-TUI — 终端党专属
仓库：ccch1mneyyy/dsh-TUI | ⭐ 790+
bash
dsh plugin --profile web add "github:ccch1mneyyy/dsh-TUI#main"
装完执行 dsh --profile cc-tui 进入全屏终端界面，流式输出、上下文用量、Token 速度、键盘快捷键、回滚操作全在一个视图里。习惯 Claude Code/Codex CLI 风格的必装。
9. dsh-browser — 操控真实 Chrome
仓库：Lum1104/dsh-browser
bash
curl -fsSL https://raw.githubusercontent.com/Lum1104/dsh-browser/refs/heads/main/scripts/install.sh | bash
不是截图分析，是通过 Chrome 扩展桥接真实读取页面内容、交互操作。需要登录态的网站（后台、内网系统）用这个比纯截图方案靠谱得多。
第三梯队：按需选装
表格
插件	解决什么	安装
dsh-turn-rewind	会话回滚快照，保存工作区状态随时回退，防止改错文件无法复原	github:Anionex/dsh-turn-rewind#main
dsh-automation	录制编排重复任务，自动化 Agent 流水线	github:titanwings/dsh-automation#main
dsh-data-agent	连接 MySQL/PostgreSQL/SQLite/Oracle/Hive，Agent 直接看表结构写 SQL 执行	github:omdsh-dev/dsh-data-agent
dsh-report-studio	一键把会话变成日报 / 周报 / 交接文档 / 文章	社区搜索 dsh-report-studio
dsh-genui	回复里渲染交互式组件（图表 / 表单 / Mermaid/3D 场景）	git+https://github.com/omdsh-dev/dsh-genui.git
dsh-vision-toolkit	图片问答、长截图 OCR、UI 重建、像素对比	@anionex/dsh-vision-toolkit
graph-memory / mnemon	跨会话长期记忆，图谱关系检索 + 向量搜索	见各自仓库
dsh-market / dsh-plugin-hub	可视化插件市场，装完它在 UI 里搜其他插件	dshmarket
whale-girl / dsh-dafeiyu	桌面宠物，会对会话事件做出反应（刚好对应你上一个问题）	github:vlln/whale-girl#main
按用户类型的组合建议
表格
你是哪种用户	推荐组合
只想用它干活	dsh-web-ui + dsh-at-file + ModLens
想要 Codex 风格界面	dsh-better-sidebar + dsh-at-file + ModLens
纯终端党	dsh-TUI + ModLens
不想装 Node.js	deepseek-harness-desktop（Electron 桌面端，双击即用）
复杂任务 / 多 Agent	上面基础 + dsh-agent-teams + dsh-plan-execute
成本敏感	上面基础 + dsh-context-doctor + dsh-plan-execute
需要操作浏览器 / 后台	上面基础 + dsh-browser
找更多插件的地方
Awesome 列表：github.com/awesome-dsh-plugin/awesome-dsh-plugin（218 个精选）
Oh-My-DSH 聚合：github.com/like-study1/Oh-My-DSH（1117 个收录）
GitHub 话题：搜索 dsh-plugin topic
插件市场站：dsh.so、dsh-plugins.top


### 试用 dsh-web-ui 
任务，看板，git， 远程手机，ssh
![alt text](image-3.png)