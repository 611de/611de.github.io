---
layout: post
title: 从 Chat Completions 到 Responses：看懂 OpenAI 新一代统一接口
subtitle: 用简单的例子说明两个接口的区别、迁移方式和选型建议
categories: LLM 应用开发
tags: [OpenAI, Responses API, Chat Completions, Agent, API 设计]
series: OpenAI API
updated: 2026-08-12
environment: OpenAI API
versions: 接口更新较快，请以 OpenAI 官方文档为准
use_case: 正在开发 OpenAI 应用，或准备把 Chat Completions 迁移到 Responses API
---

OpenAI 目前有两个常见的文本生成接口：`/v1/chat/completions` 和 `/v1/responses`。前者仍然可用，后者更适合新项目。

简单地说：**Chat Completions 围绕消息列表设计；Responses 围绕不同类型的输入、输出和工具调用设计。**

我还做了一个[交互式演示页](/demos/api-playground.html)，改参数就能实时对照两种接口的请求体、curl 和 Python SDK 写法，建议配合本文一起看。

## Chat Completions 是什么

Chat Completions 使用 `messages` 表示对话。每条消息都有一个角色，例如 `system`、`user` 或 `assistant`。

```http
POST /v1/chat/completions
```

```json
{
  "model": "YOUR_MODEL",
  "messages": [
    {
      "role": "system",
      "content": "你是一个耐心的技术助手。"
    },
    {
      "role": "user",
      "content": "什么是微服务架构？"
    }
  ]
}
```

它的返回结果通常从下面的位置读取：

```text
choices[0].message.content
```

这个接口结构简单，已有项目也广泛使用。

## Responses API 改了什么

Responses API 使用 `input` 接收输入。最简单的请求可以只传一个字符串：

```http
POST /v1/responses
```

```json
{
  "model": "YOUR_MODEL",
  "instructions": "你是一个耐心的技术助手。",
  "input": "什么是微服务架构？"
}
```

在官方 SDK 中，可以直接读取生成的文本：

```text
response.output_text
```

如果需要处理工具调用、推理信息或多模态结果，则应遍历 `response.output`，并根据每个 Item 的 `type` 分别处理。

## 从 Message 到 Item

两个接口最重要的区别，是数据组织方式不同。

Chat Completions 的基本单位是 Message。Responses 的基本单位是 Item。Message 只是 Item 的一种，函数调用、函数返回值和推理信息也可以是独立的 Item。

| 对比项 | Chat Completions | Responses |
|---|---|---|
| 请求字段 | `messages` | `input`，也可配合 `instructions` |
| 返回内容 | `choices` 中的 Message | `output` 中的多个 Item |
| 获取纯文本 | `choices[0].message.content` | SDK 的 `output_text` 辅助字段 |
| 多轮状态 | 通常由应用保存消息历史 | 可手动传递 Item，也可使用 `previous_response_id` |
| 内置工具 | 不支持原生托管工具 | 支持网页搜索、文件搜索、代码解释器等工具 |
| 多候选结果 | 支持 `n` | 每次请求只生成一个结果 |

Responses 的优势主要体现在复杂任务中：模型可以在一次请求内调用多个工具，输入和输出也不必都塞进普通消息里。

## 多模态输入

Responses 的 `content` 可以由不同类型的内容组成。例如，同时传入文字和图片：

```json
{
  "model": "YOUR_MODEL",
  "input": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": "请说明图片中的内容。"
        },
        {
          "type": "input_image",
          "image_url": "https://example.com/image.png"
        }
      ]
    }
  ]
}
```

需要注意，多模态能力最终取决于所选模型。Responses 是统一的交互入口，但并不表示 Embeddings、音频和所有媒体生成接口都已经被它取代。

## 结构化输出

两个接口都支持 Structured Outputs，但参数位置不同。Chat Completions 使用 `response_format`，Responses 使用 `text.format`。

```json
{
  "model": "YOUR_MODEL",
  "input": "从下面文字中提取姓名和年龄：小李今年 28 岁。",
  "text": {
    "format": {
      "type": "json_schema",
      "name": "person",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "age": { "type": "integer" }
        },
        "required": ["name", "age"],
        "additionalProperties": false
      }
    }
  }
}
```

这比让模型“尽量返回 JSON”更可靠，也省去了许多文本解析工作。

## 多轮对话怎么处理

Chat Completions 通常由应用保存完整的 `messages`，下一次请求时再全部发送。

Responses 有三种常见做法：

1. 使用 `previous_response_id` 连接前后两次响应；
2. 自己保存并传回之前的 `output` Item；
3. 使用 Conversations API 管理持久会话。

使用 `previous_response_id` 可以少写一些上下文管理代码，但之前的输入 Token 仍会计费。顶层 `instructions` 也不会自动继承，通常需要在后续请求中再次传入。

## 旧接口会被淘汰吗

OpenAI 当前仍支持 Chat Completions，同时建议新项目优先使用 Responses API。因此没有必要为了“接口马上失效”而仓促重写稳定系统。

更实际的选择是：

- 已有项目只做简单对话，并且运行稳定：可以继续使用 Chat Completions；
- 新项目需要推理模型、多轮状态、内置工具或 Agent 流程：优先使用 Responses；
- 旧项目准备迁移：先迁移一条简单文本链路，再处理工具、流式输出和上下文状态。

迁移时最容易出错的地方包括：仍然读取 `choices`、把每个 `output` 都当成文本、继续使用 `response_format`，以及沿用旧的流式事件解析代码。

## API 聚合平台怎么设计

如果要同时接入 OpenAI、Claude、Gemini 等服务，不建议简单地把所有厂商请求都强行转换成 OpenAI Responses 格式。不同厂商的工具、状态和多模态能力并不完全一致，硬转换容易丢失信息。

更稳妥的做法是：

```text
客户端接口
    ↓
平台内部的中立数据模型
    ↓
各 Provider 适配器
    ├── OpenAI Responses
    ├── OpenAI Chat Completions
    ├── Claude
    └── Gemini
```

外部可以继续提供 `/v1/chat/completions` 兼容接口，也可以增加 `/v1/responses`。内部则用自己的 Item、Tool Call 和 Usage 定义保存完整信息，再由适配器处理各家的差异。

## 总结

Chat Completions 仍是可用的聊天接口，Responses 则是 OpenAI 面向新项目推荐的统一生成接口。它的重点不是把所有 AI API 合并成一个端点，而是用统一的 Item 模型组织文本、多模态内容、状态和工具调用。

简单对话不必急着迁移；新项目或 Agent 类应用，可以直接从 Responses 开始。

参考资料：[OpenAI Responses API 迁移指南](https://developers.openai.com/api/docs/guides/migrate-to-responses)
