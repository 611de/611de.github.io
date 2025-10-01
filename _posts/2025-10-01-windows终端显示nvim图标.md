---
layout: post
title: windows 终端显示 nvim 图标
subtitle: 终端设置字体
categories: nvim
tags: [nvim, wsl]
---
在 Windows 终端中安装 Nerd Font 字体并解决图标乱码问题，可按以下步骤操作：

### 步骤 1：下载 Nerd Font 字体
1. 访问 Nerd Fonts 官方网站：[https://www.nerdfonts.com/font-downloads](https://www.nerdfonts.com/font-downloads)
2. 推荐下载以下常用字体（点击即可下载）：
   - FiraCode Nerd Font（编程友好，兼容性好）
   - Hack Nerd Font（简洁清晰）
   - JetBrains Mono Nerd Font（适合开发者）
3. 下载后得到一个压缩包（如 `FiraCode.zip`）

### 步骤 2：安装字体到 Windows 系统
1. 解压下载的字体压缩包
2. 找到 `.ttf` 或 `.otf` 格式的字体文件（通常在 `ttf` 文件夹中）
3. 选中所有字体文件 → 右键 → 选择「安装」（或「为所有用户安装」）

### 步骤 3：配置 Windows 终端使用 Nerd Font
1. 打开 Windows 终端
2. 点击顶部菜单栏的下拉箭头 → 选择「设置」
3. 在左侧导航栏中，选择你使用的 WSL 分发版（如 Ubuntu）
4. 选择「外观」选项卡
5. 在「字体」下拉菜单中，选择你刚刚安装的 Nerd Font（名称通常包含 "Nerd Font" 后缀，如 `FiraCode Nerd Font`）
6. 点击「保存」按钮

### 步骤 4：验证字体是否生效
1. 重启 Windows 终端
2. 再次运行测试命令：
   ```bash
   echo -e "\uf120 \uf07b \uf111"
   ```
3. 如果显示的是三个图标（而非方框或乱码），说明字体安装成功

### 补充说明
- 如果仍显示乱码，尝试更换其他 Nerd Font 字体（部分字体对特定图标支持可能不同）
- 确保 Windows 终端已更新到最新版本（设置 → 关于 → 检查更新）
- 对于 Neovim，无需额外配置字体（它会使用终端的默认字体）

完成以上步骤后，Neovim 中的图标应该就能正常显示了。

> from doubao