# 直接给你：**Claude Code 极简暗色·干净商务风 TUI**
改掉 Textual 默认花里胡哨、彩色边框、大标题；做成 **黑底、白字、极简分割、流式聊天、清爽无花哨**，跟 Claude Code 终端一模一样。

## 核心改造思路（Claude Code 风格关键点）
1. 全黑/深灰背景，**无花哨彩色边框**
2. 去掉大 Header、花里胡哨装饰
3. 左右极简分区：对话区 + 日志/工具区
4. 文字素雅，只用浅灰/白/一点点蓝做高亮
5. 流式输出感，干净留白，不堆样式

---

## 一、直接可用成品（纯 Claude Code 冷淡风）
新建 `claude_style_tui.py`
```python
from textual.app import App, ComposeResult
from textual.widgets import Static, Input, Label, Log
from textual.containers import Horizontal, Vertical
from textual.widgets import Footer

# Claude Code 核心素雅 CSS（关键）
CLAUDE_CSS = """
Screen {
    background: #121212;
    color: #E5E5E5;
}

#left_chat {
    width: 70%;
    height: 100%;
    background: #171717;
    border-right: solid #2a2a2a;
    padding: 1;
}

#right_info {
    width: 30%;
    height: 100%;
    background: #141414;
    padding: 1;
}

.chat_msg {
    margin-bottom: 1;
    padding: 0 1;
}

.user {
    color: #9CDCFE;
}

.assistant {
    color: #DCDCAA;
}

Input {
    background: #1f1f1f;
    color: #f0f0f0;
    border: solid #333333;
}

Footer {
    background: #0c0c0c;
    color: #666666;
}

.title-text {
    color: #888888;
    font-size: 1;
}
"""

class ClaudeCodeLikeTUI(App):
    CSS_PATH = None
    CSS = CLAUDE_CSS
    TITLE = ""   # 删掉顶部花哨标题
    SUB_TITLE = ""

    def compose(self) -> ComposeResult:
        # 左右分栏：聊天主区 + 右侧日志/工具区
        with Horizontal():
            with Vertical(id="left_chat"):
                yield Label("Claude Code · 会话", classes="title-text")
                yield Static("你好，我是本地 AI 助手", classes="chat_msg assistant")
                yield Static("可以直接输入指令，执行代码、查日志、运维操作", classes="chat_msg assistant")
                # 输入框（底部聊天）
                yield Input(placeholder="输入指令... /exit 退出")

            with Vertical(id="right_info"):
                yield Label("运行日志", classes="title-text")
                yield Log(max_lines=50)

        yield Footer()

    async def on_input_submitted(self, event: Input.Submitted):
        text = event.value.strip()
        if not text:
            return
        if text == "/exit":
            self.exit()

        # 追加用户消息
        chat_area = self.query("#left_chat")
        msg_user = Static(f"你: {text}", classes="chat_msg user")
        await chat_area.mount(msg_user)

        # 模拟 AI 回复
        msg_ai = Static(f"AI: 收到指令 → {text}", classes="chat_msg assistant")
        await chat_area.mount(msg_ai)

        # 右侧日志写入
        log = self.query_one(Log)
        log.write_line(f"[CMD] {text}")

        # 清空输入
        event.input.value = ""

if __name__ == "__main__":
    ClaudeCodeLikeTUI().run()
```

---

## 二、运行
```bash
pip install textual
python claude_style_tui.py
```

效果：
- 🖤 纯黑底，完全不花里胡哨
- 🧊 极简分割线，无彩色大边框
- 💬 左侧聊天（Claude 那种对话流）
- 📜 右侧运行日志面板
- ✍️ 底部输入框，像真实 Claude Code 打字交互

---

## 三、教你关键调参（自己微调成更像原版）
### 1 彻底关掉所有花哨装饰
```python
# App 里加：
DEFAULT_CSS = ""
TITLE = ""
show_clock = False   # 删掉右上角时钟
```

### 2 配色复刻 Claude Code
- 背景：`#121212` 极致黑
- 侧边栏：`#171717` 深灰
- 用户字：浅蓝 `#9CDCFE`
- AI 字：淡黄 `#DCDCAA`
- 分割线：超淡灰 `#2a2a2a`

### 3 去掉圆角、阴影、亮色按钮
把所有：
```
border-radius
box-shadow
bright color button
```
全删掉，只留纯色平铺。

---

## 四、对比总结
- 默认 Textual：彩色、圆角、花哨按钮、大标题 → 土
- 上面这个版本：黑底素雅、分区干净、流式聊天 → **完全 Claude Code 质感**

---

需要我再帮你加：
1. 代码块高亮（像 Claude 贴代码那种灰块）
2. 工具调用折叠面板
3. 流式逐字输出（打字动画）

直接说，我给你无缝升级！