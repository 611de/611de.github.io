// 引入 fetch API（大多数现代浏览器已内置）
// 确保在 HTML 中添加了相应的 API 密钥
const apiKey = document.querySelector('meta[name="dashscope-api-key"]')?.content;

// 历史消息数组，用于维护对话上下文
const messageHistory = [];

// 获取机器人回复（使用 LLM API）
async function getBotResponse(userText) {
    try {
        // 显示正在思考的提示
        showTypingIndicator();
        
        // 构建消息历史
        messageHistory.push({
            role: 'user',
            content: userText
        });
        
        // 调用 LLM API
        const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'qwen-turbo',
                messages: messageHistory
            })
        });
        
        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        const botResponse = data.choices[0].message.content;
        
        // 将机器人回复添加到历史
        messageHistory.push({
            role: 'assistant',
            content: botResponse
        });
        
        // 移除打字指示器
        const typingIndicator = document.querySelector('#chat-messages > div:last-child');
        if (typingIndicator) {
            chatMessages.removeChild(typingIndicator);
        }
        
        return botResponse;
    } catch (error) {
        console.error('获取 LLM 回复时出错:', error);
        
        // 移除打字指示器
        const typingIndicator = document.querySelector('#chat-messages > div:last-child');
        if (typingIndicator) {
            chatMessages.removeChild(typingIndicator);
        }
        
        // 返回默认回复
        return "抱歉，我暂时无法回答这个问题。请稍后再试。";
    }
}

// // 初始化消息历史
// function initializeMessageHistory() {
//     // 添加系统消息，设置机器人行为
//     messageHistory.push({
//         role: 'system',
//         content: '你是一个友好的博客助手，帮助用户了解博客内容、最新文章和联系方式。保持简洁明了的回答。'
//     });
// }

// // 页面加载时初始化
// window.addEventListener('DOMContentLoaded', () => {
//     initializeMessageHistory();
// });

// 等待元素出现的辅助函数
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) return resolve(element);
        
        const observer = new MutationObserver(mutations => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 设置超时
        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within timeout`));
        }, timeout);
    });
}

// 修改后的初始化函数
async function initializeMessageHistory() {
    try {
        // 根据您的博客结构选择合适的内容容器
        const mainContent = document.querySelector('.post-content') || 
                            document.querySelector('.article-content') || 
                            document.querySelector('main') || 
                            document.body;
        
        // 获取文本内容并限制长度
        const maxLength = 2000; // 根据模型调整
        const blogContent = mainContent.textContent.trim();
        const truncatedContent = blogContent.length > maxLength
            ? blogContent.slice(0, maxLength) + '...'
            : blogContent;
        
        // 构建系统消息
        const systemMessage = `
你是一个友好的博客助手，帮助用户了解博客内容。以下是当前页面的内容摘要：

---
${truncatedContent}
---

请基于以上内容回答用户问题。如果内容不足，请基于一般知识回答，但需明确说明。保持简洁明了的回答。
`;
        
        // 添加系统消息到消息历史
        messageHistory.push({
            role: 'system',
            content: systemMessage
        });
        console.log('已成功添加博客内容作为上下文');
    } catch (error) {
        console.error('添加系统消息时出错:', error);
        // 添加默认系统消息
        messageHistory.push({
            role: 'system',
            content: '你是一个友好的博客助手，帮助用户了解博客内容、最新文章和联系方式。保持简洁明了的回答。'
        });
    }
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 如果内容是异步加载的，等待特定元素出现
        await waitForElement('.post-content', 3000);
    } catch (error) {
        console.log('使用默认内容初始化，未找到特定元素:', error);
    } finally {
        await initializeMessageHistory();
    }
});