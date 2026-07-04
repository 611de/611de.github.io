# 前端页面 + 轻量 Node.js 服务器 + 打包成 EXE（完美方案）
我给你**最简单、最稳、一次成功**的方案：

**最终效果：**
- 一个 exe 文件
- 双击运行 → **自动启动 Node 后端服务** + **自动打开前端页面**
- 无依赖、免安装、发给别人直接用

## 技术栈
- 前端：React + Vite
- 后端：**Express 超轻量 Node 服务器**（10 行代码）
- 打包工具：**pkg** 或 **nexe**（最简单用 **pkg**）

---

# 一、先做：轻量 Node 服务器（托管前端）
## 1. 在项目根目录新建 `server.js`
```javascript
const express = require('express');
const path = require('path');
const app = express();
const port = 23568; // 随便写一个端口

// 托管前端打包后的 dist 文件夹
app.use(express.static(path.join(__dirname, 'dist')));

// 解决前端路由刷新 404
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 启动服务
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  
  // 自动打开浏览器（可选）
  const { exec } = require('child_process');
  exec(`start http://localhost:${port}`);
});
```

## 2. 安装 express
```bash
npm install express
```

---

# 二、前端打包
```bash
npm run build
```
会生成 `dist` 静态页面文件夹。

---

# 三、测试服务器是否可用
```bash
node server.js
```
如果能打开页面 → 服务正常 ✅

---

# 四、把 Node + 前端 一起打包成 EXE（关键）
## 1. 安装打包工具 pkg
```bash
npm install -g pkg
```

## 2. 在 package.json 加配置
```json
{
  "name": "my-app",
  "main": "server.js",
  "bin": "server.js",
  "pkg": {
    "assets": "dist/**/*",
    "targets": ["node18-win-x64"]
  }
}
```

## 3. 开始打包 EXE
```bash
pkg . --output my-app.exe
```

**完成！**
会生成一个 **my-app.exe**

---

# 五、最终使用方法
1. 把 `my-app.exe` 复制到任何电脑
2. **双击运行**
3. 自动启动服务
4. 自动打开浏览器访问前端页面

**完全绿色、无依赖、免安装！**

---

# 我给你总结（超简单）
1. 写一个 **express 服务器** 托管前端 dist
2. 前端执行 `npm run build` 生成 dist
3. 用 `pkg` 把 **node + dist** 打包成 exe
4. 双击 exe → 自动运行服务 + 打开网页

---

## 你要我直接给你
**一键打包脚本 + 完整可直接使用的模板** 吗？
我可以直接给你一套**开箱即用**的代码，你复制就能打包 EXE！