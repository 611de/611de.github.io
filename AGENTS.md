# Repository Guidelines

## Writing Blog Posts（用户说"写blog"时遵循）

当用户要求写博客（"写blog"、"写篇文章"、"把这个写成博客"等）时：

1. **位置与命名**：新文章写到 `_posts/`，文件名 `YYYY-MM-DD-标题.md`，日期用当天，标题可用中文并含英文关键词，参考同目录现有文件的命名风格。
2. **先读再写**：动笔前先读 `_posts/` 里最近 2~3 篇同类文章，对齐语气（第一人称、口语化、可用 emoji）、结构和标题风格。
3. **Front matter 必填**：`layout: post`、`title`、`subtitle`、`categories`、`tags`。`categories` 从现有文章中选用（如：教程与踩坑、LLM 应用开发、开发环境、项目案例），不要随意发明新分类。
4. **站内互链**：引用站内文章用 `](/YYYY/MM/DD/标题/)` 格式，以 `_posts` 里现有写法为准。
5. **图片**：静态图片放 `assets/images/posts/<文章短名>/`，用仓库相对路径 `/assets/images/...` 引用。
6. **验证**：写完必须运行 `bundle exec jekyll build`，确认无报错且 `_site` 中生成了对应文件，再向用户报告。
7. **提交**：除非用户明确要求，写完不要自动 commit/push，先让用户确认。

## Project Structure & Module Organization

This repository is a Jekyll-based personal blog using the YAT theme. Blog posts live in `_posts/`; start new articles from `_templates/post.md` and name them `YYYY-MM-DD-title.md`. Unfinished writing belongs in `_drafts/`, standalone pages in `demos/`, and notebooks in `examples/`. Shared page templates are in `_layouts/`, reusable fragments in `_includes/`, site data in `_data/`, and Sass sources in `_sass/`. Static images, styles, and scripts belong under `assets/`. Configure site-wide metadata, navigation, and theme behavior in `_config.yml`.

## Build, Test, and Development Commands

Install Ruby and Bundler, then run:

```bash
bundle install
bundle exec jekyll serve
bundle exec jekyll build
```

`bundle install` resolves the gems declared by `Gemfile` and the theme gemspec. `jekyll serve` builds the site and serves it locally, normally at `http://localhost:4000`; restart it after changing `_config.yml`. `jekyll build` generates the production site in `_site/` and is the primary pre-commit validation. Pushes to `master` trigger the GitHub Pages deployment workflow.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF line endings, two-space indentation, a final newline, and no trailing whitespace (Markdown may preserve intentional trailing spaces). Use YAML front matter at the top of posts and pages. Keep Liquid expressions readable and reuse existing layouts/includes instead of duplicating markup. Use lowercase, descriptive asset names and repository-relative URLs, for example `/assets/images/banners/home.jpeg`.

## Testing Guidelines

There is currently no automated test framework or coverage requirement. Before submitting changes, run `bundle exec jekyll build` and resolve all errors or warnings. For visual changes, inspect the affected pages locally in both desktop and mobile widths; also verify links, images, code blocks, categories, tags, and dark mode where relevant.

## Commit & Pull Request Guidelines

Recent history generally uses short Conventional Commit-style subjects such as `feat: add ...`, `fix: update ...`, and `style: change ...`. Use an imperative, scoped summary and keep each commit focused. Pull requests should describe the change, list validation performed, and link related issues. Include before/after screenshots for layout, styling, or rendered-content changes.

## Security & Configuration

Never commit API keys, access tokens, email credentials, or other secrets in posts, HTML, JavaScript, `_config.yml`, or workflow files. Use GitHub Actions secrets for deployment credentials and placeholders in documentation examples.
