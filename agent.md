# Agent 全局规范

## 项目定位

本项目是一个基于 **VitePress** 的个人笔记站点，使用 **Markdown** 作为笔记源文件，部署在 **GitHub Pages** 上。站点的核心目标是将用户发送的笔记内容整理后，以清晰的分类、目录结构展示为 HTML 页面，并支持通过 GitHub 网页端进行编辑。

## 技术栈

- **静态站点生成器**：VitePress v1.x
- **内容格式**：Markdown
- **部署平台**：GitHub Pages
- **CI/CD**：GitHub Actions
- **包管理器**：npm

## 项目结构

```
notebook/
├── .github/workflows/deploy.yml   # GitHub Actions 部署工作流
├── docs/                          # VitePress 站点根目录
│   ├── .vitepress/
│   │   └── config.mjs             # VitePress 配置（导航、侧边栏、编辑链接等）
│   ├── index.md                   # 站点首页
│   ├── notes/                     # 所有笔记存放目录
│   │   ├── index.md               # 笔记总览页
│   │   ├── tech/                  # 技术分类
│   │   │   ├── index.md           # 技术笔记索引
│   │   │   └── example.md         # 示例笔记
│   │   └── life/                  # 生活分类
│   │       └── index.md           # 生活笔记索引
│   └── public/                    # 静态资源（图片、文件等）
├── package.json                   # 项目依赖与脚本
├── README.md                      # 项目说明
└── agent.md                       # 本文件
```

## 笔记文件规范

### 文件位置

- 所有笔记必须存放在 `docs/notes/<category>/` 目录下。
- 每篇笔记对应一个 Markdown 文件。
- 不要在 `docs/` 根目录下直接存放笔记页面（首页除外）。

### 文件命名

- 使用小写英文字母、数字和短横线 `-`。
- 文件名应简洁、语义化，例如：`vue-router-guide.md`、`reading-notes-2024.md`。
- 避免使用空格、下划线或特殊字符。

### 文件头部（Frontmatter）

每篇笔记必须在文件顶部包含以下 frontmatter：

```markdown
---
title: 文章标题
description: 文章简短描述
category: 分类标识（如 tech / life）
date: YYYY-MM-DD
---
```

- `title`：必填，显示在页面标题、浏览器标签和导航中。
- `description`：必填，用于 SEO 和页面描述。
- `category`：必填，对应分类目录名。
- `date`：必填，格式为 `YYYY-MM-DD`，表示创建或更新日期。

### 正文规范

- 使用 Markdown 语法编写。
- 文章主标题使用一个 `#`，即对应 `title` 的内容。
- 使用 `##`、`###` 等层级标题组织内容，VitePress 会自动生成右侧目录。
- 图片统一存放在 `docs/public/images/` 目录下，引用路径使用绝对路径 `/images/xxx.png`。
- 代码块标注语言，便于语法高亮。

## 分类管理规则

### 新增分类

1. 在 `docs/notes/` 下创建新的分类目录，例如 `docs/notes/study/`。
2. 在该目录下创建 `index.md` 作为分类索引页。
3. 打开 `docs/.vitepress/config.mjs`：
   - 在 `nav` 的“分类”下拉菜单中添加新分类入口。
   - 在 `sidebar` 的 `/notes/` 配置中添加新分类分组和文章链接。

### 新增笔记

1. 将 Markdown 文件放入对应分类目录下。
2. 确保文件命名符合规范，frontmatter 完整。
3. 在分类的 `index.md` 中手动添加该笔记的链接（若希望展示在分类目录中）。
4. 在 `docs/.vitepress/config.mjs` 的 `sidebar` 中更新侧边栏条目。

## 编辑与提交流程

### 浏览器内编辑

- 每篇生成的 HTML 页面底部都有“在 GitHub 上编辑此页”链接。
- 点击后跳转到 GitHub 仓库中对应 Markdown 文件的编辑界面。
- 修改后提交 commit，推送到 `main` 分支即可自动触发部署。

### 本地编辑

1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run docs:dev`
3. 在浏览器中访问 `http://localhost:5173/notebook/` 预览。
4. 修改 Markdown 文件后保存，页面会自动热更新。
5. 确认无误后提交并推送到 `main` 分支。

### 部署触发

- 任何推送到 `main` 分支的变更都会触发 `.github/workflows/deploy.yml` 工作流。
- 工作流会自动构建 VitePress 站点并部署到 GitHub Pages。
- 首次部署需要在 GitHub 仓库 Settings > Pages 中选择“GitHub Actions”作为 Source。

## 常用操作 Checklist

### 添加一篇新笔记

- [ ] 文件放入 `docs/notes/<category>/` 目录
- [ ] 文件名使用小写和短横线
- [ ] 文件顶部包含完整 frontmatter
- [ ] 在分类 `index.md` 中更新目录链接
- [ ] 在 `docs/.vitepress/config.mjs` 的 sidebar 中添加条目
- [ ] 本地运行 `npm run docs:dev` 预览确认
- [ ] 推送到 `main` 分支后检查部署状态

### 修改一篇笔记

- [ ] 定位到对应 Markdown 源文件
- [ ] 修改内容并保存
- [ ] 如标题或分类变更，同步更新 sidebar 和分类索引
- [ ] 本地预览确认
- [ ] 提交并推送

### 新增一个分类

- [ ] 创建 `docs/notes/<new-category>/` 目录
- [ ] 在该目录下创建 `index.md`
- [ ] 在 `docs/.vitepress/config.mjs` 中更新 nav 和 sidebar
- [ ] 在 `docs/notes/index.md` 中添加新分类入口

### 排查构建问题

- [ ] 运行 `npm run docs:build` 查看错误信息
- [ ] 检查 Markdown 文件 frontmatter 格式是否正确
- [ ] 检查 sidebar 中链接是否指向存在的文件
- [ ] 检查图片路径是否以 `/images/` 开头且文件存在于 `docs/public/images/`

## 注意事项

- 不要修改 `.vitepress/dist` 和 `.vitepress/cache` 目录下的内容，这些会被 `.gitignore` 忽略。
- 不要在 `package.json` 中随意升级 VitePress 大版本，避免主题或配置不兼容。
- 保持 `agent.md` 和 `README.md` 的同步更新，当项目结构或流程发生变化时及时调整。
