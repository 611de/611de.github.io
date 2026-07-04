---
layout: post
title: VS Code Claude Code 插件如何手动配置国内大模型
subtitle: 不依赖切换工具，通过环境变量完成模型映射
categories: LLM 应用开发
tags: [VSCode, Claude Code, 国内模型, 配置, 通义千问, DeepSeek]
featured: true
updated: 2026-07-03
environment: VS Code 与 Claude Code 扩展
versions: 模型名称和平台接口可能变化，请以服务商控制台为准
use_case: 不安装第三方切换工具，直接将 Claude Code 扩展接入兼容模型
---

Claude Code 的 VS Code 扩展可以通过环境变量指定 API 地址和不同档位对应的模型。对于提供 Anthropic 兼容接口的模型平台，可以直接修改 VS Code 的 `settings.json`，不必额外安装模型切换工具。

本文将介绍一种**纯手动配置方案**，只需修改 VSCode 的 `settings.json`，即可实现 Claude Code 对接国内大模型，无需任何第三方工具。

## 为什么选择手动配置？
手动配置的依赖更少，关键参数也更加透明，适合只使用一个模型平台或希望明确控制模型映射的场景。如果需要频繁切换多个平台，使用专门的配置管理工具会更方便。

## 核心原理：三个关键环境变量

Claude Code 插件通过以下三个环境变量控制模型选择：

| 环境变量 | 对应插件选项 | 用途 |
|---------|-------------|------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus | 高性能档位 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Default/Sonnet | 默认档位 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku | 轻量档位 |

当你在插件中切换模型时，它会读取对应的环境变量值作为实际调用的模型名。

## 配置步骤

### 第一步：获取模型平台 API Key

以通义千问为例：
1. 访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. 开通服务并创建 API Key
3. 记录下 API Key 和模型名称

### 第二步：修改 VS Code settings.json

打开 VSCode 设置（`Ctrl+,` / `Cmd+,`），搜索「Claude Code: Environment Variables」，点击「Edit in settings.json」。

添加以下配置：

```json
{
  "claudeCode.environmentVariables": [
    {
      "name": "ANTHROPIC_BASE_URL",
      "value": "https://dashscope.aliyuncs.com/apps/anthropic"
    },
    {
      "name": "ANTHROPIC_AUTH_TOKEN",
      "value": "YOUR_API_KEY"
    },
    {
      "name": "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "value": "qwen3.5-120b"
    },
    {
      "name": "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "value": "qwen3.5-72b"
    },
    {
      "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      "value": "qwen3.5-7b"
    }
  ],
  "claudeCode.disableLoginPrompt": true,
  "claudeCode.selectedModel": "default"
}
```

### 第三步：验证配置是否生效

1. 保存配置后重启 VS Code（或执行「Developer: Reload Window」）
2. 打开 Claude Code 插件面板
3. 点击「Switch Model」，选择不同档位测试
![Claude Code 插件的模型切换菜单，当前选择 qwen3.5_123](/assets/images/posts/vscode-claude-code/model-switch.png)
![Claude Code 调用不存在的 qwen3.5_123 模型时返回 400 错误](/assets/images/posts/vscode-claude-code/model-error.png)

## 主流平台配置模板

### 通义千问（阿里云）

```json
{
  "claudeCode.environmentVariables": [
    { "name": "ANTHROPIC_BASE_URL", "value": "https://dashscope.aliyuncs.com/apps/anthropic" },
    { "name": "ANTHROPIC_AUTH_TOKEN", "value": "YOUR_API_KEY" },
    { "name": "ANTHROPIC_DEFAULT_OPUS_MODEL", "value": "qwen3.5-120b" },
    { "name": "ANTHROPIC_DEFAULT_SONNET_MODEL", "value": "qwen3.5-72b" },
    { "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL", "value": "qwen3.5-7b" }
  ],
  "claudeCode.disableLoginPrompt": true
}
```
其他平台的配置思路相同，但接口地址、认证字段和可用模型名称必须以对应平台的文档为准。


## 总结

通过手动配置 `ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU_MODEL` 三个环境变量，我们可以：

1. **无需第三方工具**：直接在 VSCode 中完成配置
2. **安全可靠**：API Key 只保存在本地
3. **灵活切换**：三个档位可分别映射不同的国内模型

关键配置项速查：
- `ANTHROPIC_BASE_URL`：国内模型的 Anthropic 兼容接口地址
- `ANTHROPIC_AUTH_TOKEN`：你的 API Key
- `ANTHROPIC_DEFAULT_SONNET_MODEL`：默认使用的模型（最常用）

---
## 引用
[Claude Code 模型配置](https://code.claude.com/docs/en/model-config#checking-your-current-model)
