---
layout: post
title: How to Show UI Icon in Windows-nvim
subtitle: Nerd Forts Install in Windows
categories: Nvim
tags: [vim, nerd fonts, icon]
---
Windows 中使用 直接使用 nvim 会缺少图标，Neovim 的许多插件（如 `nvim-tree`、`lualine`）依赖图标增强可视化效果。这个时候会用到 **Nerd Fonts**，但需手动安装才能在终端中正确显示图标

1. Download Nerd Forts
get a list of possible font names
```bash
# get a list of possible font names
& ([scriptblock]::Create((iwr 'https://to.loredo.me/Install-NerdFont.ps1'))) -List All
# cascadia is created by Microsoft
& ([scriptblock]::Create((iwr 'https://to.loredo.me/Install-NerdFont.ps1'))) -Name cascadia-code
```

2. change default fonts in terminnal
- open terminnal
- `<Ctrl> + ,` go to settings -> 默认值 -> 外观 -> 字体 —> 选 cascadia -> save


Link:

- nerd-fonts-github: https://github.com/ryanoasis/nerd-fonts?tab=readme-ov-file#option-3-unofficial-chocolatey-or-scoop-repositories
- nerd-fonts: https://www.nerdfonts.com/
