---
layout: post
title: 如何在 README 中加入 Star History
subtitle: 一行代码引入 Star History 图
categories: blog
tags: [blog]
---

# 如何在 README中 加入 Star History

在开源项目的README文件中展示Star History图表，能够让访问者快速了解项目的热度变化趋势，增加项目的吸引力和可信度。那么，如何将这一实用的可视化内容添加到README中呢？

## 使用 Markdown 语法嵌入图表

在项目的 README 文件中，添加以下 Markdown 代码：
```markdown
[![Star History Chart](https://api.star-history.com/svg?repos=你的用户名/你的仓库名&type=Date)](https://star-history.com/#你的用户名/你的仓库名&Date)
```
这段代码分为两部分：
- `[![Star History Chart](https://api.star-history.com/svg?repos=你的用户名/你的仓库名&type=Date)]`：用于插入图片。其中`https://api.star-history.com/svg?repos=你的用户名/你的仓库名&type=Date`是 Star History 提供的API接口，它会生成 SVG 格式的星标趋势图，`repos`参数为项目路径，`type=Date`表示按时间排序。
- `(https://star-history.com/#你的用户名/你的仓库名&Date)`：点击图片后跳转的 Star History 官网链接，在这里可以展示交互式图表，方便访问者进一步查看详细数据。

例如，若你的项目路径是`MyUsername/MyRepo`，则代码应修改为：
```markdown
[![Star History Chart](https://api.star-history.com/svg?repos=MyUsername/MyRepo&type=Date)](https://star-history.com/#MyUsername/MyRepo&Date)
```

## 自定义图表样式
如果你希望对图表样式进行调整，Star History API 也支持额外参数，以下是一些常用的自定义选项：
- **主题设置**：添加`&theme=dark`可生成深色主题图表（默认是浅色主题）。
- **尺寸调整**：通过`&width=800&height=400`等参数，自定义图表的宽度和高度。
- **图表类型**：`type`参数除了`Date`（时间趋势），还可选`Interval`（区间统计）等类型。
比如，想要生成深色主题且自定义尺寸的图表，代码可修改为：
```markdown
[![Star History Chart](https://api.star-history.com/svg?repos=你的用户名/你的仓库名&type=Date&theme=dark&width=800&height=400)](https://star-history.com/#你的用户名/你的仓库名&Date)
```

## 例子（[awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps)）
![Star History Chart](https://api.star-history.com/svg?repos=Shubhamsaboo/awesome-llm-apps)