核心是：用 **Ollama 本地部署模型** 当后端，通过 **LiteLLM Proxy** 转成 Claude 兼容的 API 格式，让 Claude Code 调用本地模型。

### 关键步骤（3步搞定）
1. **启动 Ollama 并拉取模型**（先确保 Ollama 已安装）：
   ```bash
   ollama pull llama3  # 拉取你想用的模型（如llama3、mistral等）
   ollama run llama3  # 测试模型是否能正常启动（可选，启动后可直接对话验证）
   ```

2. **配置 LiteLLM Proxy 对接 Ollama**：
   创建配置文件 `config.yaml`（放在 LiteLLM 虚拟环境目录下）：
   ```yaml
   model_list:
     - model_name: claude-3-opus-20240229  # 伪装成 Claude 模型名（让 Claude Code 识别）
       litellm_params:
         model: ollama/llama3  # 对应 Ollama 本地模型（格式：ollama/模型名）
         api_base: http://localhost:11434  # Ollama 默认接口地址
   ```

3. **启动 LiteLLM Proxy 并让 Claude Code 连接**：
   - 激活之前创建的 LiteLLM 虚拟环境：`source ~/litellm-venv/bin/activate`
   - 启动代理：`litellm proxy --config config.yaml --port 8000`（端口8000可自定义）
   - Claude Code 中配置 API：
     - API 地址：`http://localhost:8000`
     - API Key：随便填一个非空值（如 `test-key`，LiteLLM 无验证时可忽略）
     - 模型选择：选刚才配置的 `claude-3-opus-20240229`（或其他伪装的 Claude 模型名）

### 验证与调试
- 代理启动后，用 curl 测试接口是否通：
  ```bash
  curl http://localhost:8000/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-key" \
    -d '{"model":"claude-3-opus-20240229","messages":[{"role":"user","content":"写一段Python排序代码"}]}'
  ```
- 若 Claude Code 报错，查看 LiteLLM 代理终端的日志，确认模型名、端口是否匹配。

需要我帮你生成 **完整的配置文件+启动脚本**，或排查 Claude Code 连接失败的问题吗？