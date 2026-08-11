Chat Completions 到 Responses

POST /v1/chat/completions 为聊天设计

{
  "model": "gpt-4",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant"
    },
    {
      "role": "user",
      "content": "解释一下什么是微服务架构"
    }
  ],
  "temperature": 0.7
}

![alt text](image.png)

completions 的问题




POST /v1/responses