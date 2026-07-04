# Yiyi L 的个人博客

欢迎来到我的个人博客仓库！本博客基于 [Jekyll](https://jekyllrb.com/) 搭建，使用了 [JEKYLL YAT THEME](http://jekyllthemes.org/themes/jekyll-theme-yat/) 主题。

[English README](README_en.md)

## 博客简介
这是 Yiyi L 的个人博客，作为一名励志成为 AI 工程师的开发者，我会在这里分享个人开发方法和经验。博客持续完善中，欢迎大家访问！

## 访问链接
你可以通过以下链接访问我的博客：[Yiyi L 的博客](https://611de.github.io/)

## 本地运行

本项目需要安装 Ruby、RubyGems 和 Bundler。确认 Ruby 可用后，在仓库根目录执行：

```bash
gem install bundler -v 2.6.9
bundle install
bundle exec jekyll serve
```

启动完成后，访问 [http://localhost:4000](http://localhost:4000) 查看博客。编辑文章、模板或样式后，Jekyll 会自动重新构建；修改 `_config.yml` 后需要停止并重新启动服务。

如需只生成静态网站而不启动本地服务，可执行：

```bash
bundle exec jekyll build
```

生成结果位于 `_site/` 目录。

### 这些命令分别做什么？

- **Gem**：Ruby 的软件包，类似 Python 的 `pip` 包或 Node.js 的 npm 包。
- **`gem`**：Ruby 自带的包管理命令，用于安装 Bundler 等工具。
- **Bundler / `bundle`**：读取项目的 `Gemfile`，安装并管理项目依赖。
- **Jekyll**：将 Markdown 文章、页面模板和样式生成静态网站。
- **`bundle exec`**：使用当前项目指定的依赖版本执行命令，避免版本冲突。
- **`serve`**：构建网站并启动本地服务，同时监听文件变化。

本地运行流程如下：

```text
gem install bundler       安装依赖管理工具
        ↓
bundle install            安装项目依赖
        ↓
bundle exec jekyll serve  生成网站并启动本地服务
        ↓
http://localhost:4000     在浏览器中查看
```

Jekyll 会把 `_posts/`、模板和样式处理成 HTML、CSS、JavaScript，并输出到 `_site/`。`jekyll build` 只生成文件，`jekyll serve` 则会在生成后继续启动本地服务器。

## 博客搭建过程
如果你对如何搭建类似的博客感兴趣，可以参考以下步骤：
1. **选择主题**：去 Jekyll 官网主题页面（http://jekyllthemes.org/）挑选自己喜欢的主题。我选择的主题是 [JEKYLL YAT THEME](http://jekyllthemes.org/themes/jekyll-theme-yat/)，其 GitHub 地址为 [https://github.com/jeffreytse/jekyll-theme-yat/](https://github.com/jeffreytse/jekyll-theme-yat/)。选好主题后，访问该主题的 GitHub 仓库地址，fork 这个主题，并把仓库名字改成自己的。
2. **设置 Github Page**：进入仓库，点击页面中的 `settings`，在左边可以看到 `Github Page`，进行简单设置即可部署自己的网页。
3. **配置**：仓库中有个 `_config.yml` 文件，用于配置博客信息。你可以将 `title`、`email`、`description`、`favicon` 等信息改成自己的。模板中推荐了一个 `favicon` 在线工具 [Favicon Generator](https://realfavicongenerator.net/)，可以同时生成桌面端、Web 端、IOS 和 Android 端的图标。修改完成后提交改动，Github 会自动重新部署新的内容，部署大概需要一两分钟，你可以在 Github 仓库页面的 `Github Action` 中查看部署的过程和部署历史。
4. **写博客**：在 `_post` 文件夹中使用 `markdown` 格式撰写博客文章。需要注意的是，`.md` 文件的名字格式要遵循 **时间+标题** 的格式。写完后提交改动到 Github 仓库，博客会自动部署更新。

## 原博客模板项目
本博客使用的主题来源于 [JEKYLL YAT THEME](http://jekyllthemes.org/themes/jekyll-theme-yat/)，你可以访问其 [GitHub 仓库](https://github.com/jeffreytse/jekyll-theme-yat/) 了解更多信息。

## 联系我
任何问题：
- **GitHub**：[https://github.com/611de](https://github.com/611de)
- **Email**：[liuyiyi-611@qq.com](mailto:liuyiyi-611@qq.com)
