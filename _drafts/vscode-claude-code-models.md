# 实战经验：VS Code Claude Code 插件切换国内大模型全攻略
在使用 VS Code 中的 Claude Code 插件对接国内大模型（如通义千问、智谱 GLM 等）时，多数开发者会遇到「模型名不匹配」「配置不生效」「切换模型无响应」等问题。本文基于实际测试总结出 Claude Code 插件适配国内大模型的核心配置逻辑和实操方案，帮你彻底解决 API 调用报错、模型切换失效等问题。

## 一、核心痛点：官方配置逻辑不兼容国内模型
Claude Code 插件默认面向 Anthropic 官方 Claude 模型（Opus/Sonnet/Haiku）设计，直接配置国内模型的 API Key 和 Base URL 会出现两类核心问题：
1. 插件硬编码调用 `claude-opus-4-6`/`claude-sonnet-4-6` 等官方模型名，国内平台不识别导致 400 参数错误；
2. 仅配置 `ANTHROPIC_MODEL` 无法覆盖插件内置的模型切换逻辑，切换模型时仍调用默认官方模型。

## 二、实测生效的配置方案（通义千问为例）
经过多次测试，Claude Code 插件的模型切换逻辑与 `ANTHROPIC_DEFAULT_*_MODEL` 系列环境变量强绑定，而非单一的 `ANTHROPIC_MODEL`。以下是完整的可直接复用配置：

### 1. 基础配置结构
打开 VS Code 设置（`Ctrl+,`/`Cmd+,`）→ 搜索 `Claude Code: Environment Variables` → 编辑 `settings.json`，粘贴以下配置并替换为自己的信息：
```json
{
  "claudeCode.environmentVariables": [
    // 国内模型的 API 基础地址（以阿里云通义千问为例）
    {
      "name": "ANTHROPIC_BASE_URL",
      "value": "https://dashscope.aliyuncs.com/apps/anthropic"
    },
    // 你的国内模型 API Key
    {
      "name": "ANTHROPIC_AUTH_TOKEN",
      "value": "YOUR_API_KEY"
    },
    // Opus 档位映射国内模型（对应插件中 Opus 选项）
    {
      "name": "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "value": "glm-5" // 替换为你的 Opus 档位目标模型名
    },
    // Sonnet 档位映射国内模型（对应插件中 Default/Sonnet 选项）
    {
      "name": "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "value": "qwen3.5-120b" // 通义千问 3.5 旗舰版示例
    },
    // Haiku 档位映射国内模型（对应插件中 Haiku 选项）
    {
      "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      "value": "qwen3.5-7b" // 通义千问 3.5 轻量版示例
    }
  ],
  // 关闭插件的 Anthropic 登录提示（国内模型无需登录）
  "claudeCode.disableLoginPrompt": true,
  // 端口转发（可选，解决网络代理问题）
  "remote.autoForwardPortsSource": "hybrid",
  // 初始选中默认模型（对应 Sonnet 档位）
  "claudeCode.selectedModel": "default"
}
```

### 2. 关键配置说明
| 配置项 | 作用 | 注意事项 |
|--------|------|----------|
| `ANTHROPIC_BASE_URL` | 国内模型的 Anthropic 兼容接口地址 | 不同平台地址不同（如 DeepSeek 为 `https://api.deepseek.com/anthropic`） |
| `ANTHROPIC_AUTH_TOKEN` | 国内模型平台的 API Key | 需从对应平台控制台获取（如阿里云百炼、智谱开放平台） |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 插件「Opus」模型选项映射的国内模型名 | 需与平台支持的模型名完全一致（区分大小写） |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 插件「Default/Sonnet」模型选项映射的国内模型名 | 配置后会自动出现在插件「Custom Model」列表中 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 插件「Haiku」模型选项映射的国内模型名 | 建议填轻量版模型（如 qwen3.5-7b、deepseek-coder-light） |
| `claudeCode.selectedModel` | 插件启动时默认选中的模型档位 | 可选值：`default`（Sonnet）、`opus`、`haiku` |

## 三、模型切换逻辑（实测验证）
配置完成后重启 VS Code，在 Claude Code 插件面板点击「Switch Model」切换模型时，逻辑如下：
1. 选择「Default」→ 调用 `ANTHROPIC_DEFAULT_SONNET_MODEL` 配置的模型（如 qwen3.5-120b）；
2. 选择「Opus」→ 调用 `ANTHROPIC_DEFAULT_OPUS_MODEL` 配置的模型（如 glm-5）；
3. 选择「Haiku」→ 调用 `ANTHROPIC_DEFAULT_HAIKU_MODEL` 配置的模型（如 qwen3.5-7b）；
4. Sonnet 档位配置的模型会自动同步到「Custom Model」列表中，可直接选中使用。

## 四、避坑指南
### 1. 模型名必须精准匹配
国内模型平台的模型名严格区分大小写和格式，例如：
- 通义千问：`qwen3.5-7b`/`qwen3.5-120b`（非 qwen3.5_123、qwen3.5_qwerq）；
- 智谱 GLM：`glm-4`/`glm-4-flash`（非 glm-5）；
- DeepSeek：`deepseek-coder-v2`/`deepseek-coder-light`。

### 2. 配置生效的前提
- 保存 `settings.json` 后必须重启 VS Code（或执行「Reload Window」）；
- 禁用并重新启用 Claude Code 插件（避免缓存覆盖配置）；
- 检查系统环境变量，删除 `ANTHROPIC_*` 相关全局变量（防止优先级覆盖）。

### 3. 验证配置是否生效
打开 VS Code「输出」面板 → 选择「Claude Code」日志，查看是否有以下内容：
```
[INFO] Using model: qwen3.5-120b
[INFO] Using API URL: https://dashscope.aliyuncs.com/apps/anthropic
```
若日志中显示配置的国内模型名，说明配置生效。

## 五、主流国内模型配置模板
### 1. 通义千问
```json
{
  "claudeCode.environmentVariables": [
    {
      "name": "ANTHROPIC_BASE_URL",
      "value": "https://dashscope.aliyuncs.com/apps/anthropic"
    },
    {
      "name": "ANTHROPIC_AUTH_TOKEN",
      "value": "你的通义千问API Key"
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

### 2. DeepSeek 代码模型
```json
{
  "claudeCode.environmentVariables": [
    {
      "name": "ANTHROPIC_BASE_URL",
      "value": "https://api.deepseek.com/anthropic"
    },
    {
      "name": "ANTHROPIC_AUTH_TOKEN",
      "value": "你的DeepSeek API Key"
    },
    {
      "name": "ANTHROPIC_DEFAULT_OPUS_MODEL",
      "value": "deepseek-coder-v2"
    },
    {
      "name": "ANTHROPIC_DEFAULT_SONNET_MODEL",
      "value": "deepseek-coder-v1"
    },
    {
      "name": "ANTHROPIC_DEFAULT_HAIKU_MODEL",
      "value": "deepseek-coder-light"
    }
  ],
  "claudeCode.disableLoginPrompt": true,
  "claudeCode.selectedModel": "default"
}
```

## 总结
1. Claude Code 插件切换国内模型的核心是通过 `ANTHROPIC_DEFAULT_OPUS/SONNET/HAIKU_MODEL` 三个环境变量，分别映射插件的三个模型档位；
2. 插件「Switch Model」中选择不同档位，会对应调用上述三个配置项的模型名，Default 档位对应 Sonnet 配置；
3. 配置生效的关键是精准匹配国内模型名、重启插件/VS Code、清除全局环境变量冲突。

按照本文的配置逻辑，可完美解决「模型名不支持」「切换无响应」等问题，让 Claude Code 插件无缝对接国内大模型。
