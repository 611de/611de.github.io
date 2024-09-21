---
layout: post
title: how to show UI icon in windows-nvim
subtitle: nerd forts install in windows
categories: nvim, vim
tags: [vim, nerd fonts, icon]
---

<!-- how to show image in terminnal? -->

1. download nerd forts
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
