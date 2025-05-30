要将 `mkdocs-chatgpt` 插件与 Ollama 本地大语言模型服务集成，需要进行一些自定义配置。虽然该插件默认支持 OpenAI API，但我们可以通过修改其请求逻辑来适配 Ollama 的 API 格式。以下是具体实现方法：


### 一、核心思路

`mkdocs-chatgpt` 插件通过 JavaScript 与后端 API 通信。我们需要：
1. 创建一个自定义插件扩展
2. 重写 API 请求逻辑，指向 Ollama 服务
3. 适配 Ollama 的响应格式


### 二、实现步骤

#### 1. 安装必要依赖
```bash
pip install mkdocs-chatgpt
```

#### 2. 创建自定义插件扩展

在项目根目录下创建 `mkdocs_ollama_plugin` 目录，并添加以下文件：

```python
# mkdocs_ollama_plugin/__init__.py
from mkdocs.plugins import BasePlugin
from mkdocs.config import config_options
import json
import requests

class OllamaChatGPTPlugin(BasePlugin):
    config_scheme = (
        ('ollama_base_url', config_options.Type(str, default='http://localhost:11434')),
        ('model', config_options.Type(str, default='llama2')),
    )

    def on_post_build(self, config):
        # 修改 chatgpt-widget.js，替换 API 端点
        widget_js_path = f"{config['site_dir']}/assets/javascripts/chatgpt-widget.js"
        
        try:
            with open(widget_js_path, 'r') as f:
                content = f.read()
            
            # 替换 OpenAI API 为 Ollama API
            content = content.replace(
                'https://api.openai.com/v1/chat/completions',
                f"{self.config['ollama_base_url']}/api/generate"
            )
            
            # 修改请求格式适配 Ollama
            content = content.replace(
                '{"model":"gpt-3.5-turbo","messages":messages,"temperature":0.7}',
                self._get_ollama_payload()
            )
            
            with open(widget_js_path, 'w') as f:
                f.write(content)
                
        except Exception as e:
            print(f"Error modifying chatgpt-widget.js: {e}")
    
    def _get_ollama_payload(self):
        # Ollama 请求格式
        return json.dumps({
            "model": self.config['model'],
            "prompt": "{{PROMPT}}",
            "stream": false
        })
```

#### 3. 配置 `mkdocs.yml`

添加自定义插件和静态资源路径：

```yaml
plugins:
  - search
  - ollama_chatgpt:  # 注册自定义插件
      ollama_base_url: http://localhost:11434  # Ollama 服务地址
      model: llama2  # 使用的模型

extra_javascript:
  - assets/javascripts/chatgpt-widget.js  # 确保加载修改后的脚本
```

#### 4. 创建前端适配脚本

在 `docs/` 目录下创建 `assets/javascripts/chatgpt-widget.js` 文件：

```javascript
// 重写 ChatGPT 插件的 API 请求逻辑
(function() {
    // 原始 widget 代码...
    
    // 替换为 Ollama API
    const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
    
    // 修改请求函数
    async function callChatGPT(messages) {
        const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
        
        try {
            const response = await fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama2',  // 使用的 Ollama 模型
                    prompt: prompt,
                    stream: false
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                choices: [{
                    message: {
                        content: data.response  // 适配 Ollama 响应格式
                    }
                }]
            };
        } catch (error) {
            console.error('Error calling Ollama API:', error);
            throw error;
        }
    }
    
    // 其他原始 widget 代码...
})();
```


### 三、使用方法

1. 启动 Ollama 服务：
   ```bash
   ollama serve
   ```

2. 在文档中嵌入聊天组件：
   ```markdown
   # 获取帮助

   <chatgpt-widget></chatgpt-widget>
   ```

3. 构建并运行 MkDocs：
   ```bash
   mkdocs serve
   ```


### 四、注意事项

1. **跨域问题**：
   - 如果 Ollama 服务不在本地运行，需要配置 CORS 允许 MkDocs 域名访问
   - 可以使用代理中间件解决跨域问题

2. **响应格式适配**：
   - Ollama 和 OpenAI 的响应格式略有不同，需要确保正确解析

3. **模型选择**：
   - 根据需要在配置中指定不同的 Ollama 模型
   - 确保模型已在 Ollama 中下载并可用


这种方法通过修改插件的前端脚本实现了与 Ollama 的集成，避免了直接修改插件源代码。如果需要更深入的定制，可以考虑 fork 原始插件仓库并进行针对性开发。