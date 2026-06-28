# 个人笔记

基于 VitePress 构建的个人笔记站点，用于整理、分类和展示笔记内容。

## 技术栈

- [VitePress](https://vitepress.dev/) — 静态站点生成器
- Markdown — 笔记内容格式
- GitHub Pages — 站点托管
- GitHub Actions — 自动构建与部署

## 功能特性

- 分类清晰的笔记目录结构
- 自动生成页面目录（Table of Contents）
- 支持通过 GitHub 网页端编辑笔记
- 推送至 `main` 分支后自动部署

## 目录结构

```
notebook/
├── docs/                      # VitePress 站点根目录
│   ├── .vitepress/
│   │   └── config.mjs         # 站点配置
│   ├── index.md               # 首页
│   ├── notes/                 # 笔记内容
│   │   ├── index.md           # 笔记总览
│   │   ├── tech/              # 技术笔记
│   │   └── life/              # 生活笔记
│   └── public/                # 静态资源
├── .github/workflows/
│   └── deploy.yml             # GitHub Actions 部署配置
├── package.json               # 项目依赖
├── agent.md                   # AI Agent 全局规范
└── README.md                  # 本文件
```

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run docs:dev
```

然后访问 `http://localhost:5173/notebook/`。

### 构建站点

```bash
npm run docs:build
```

构建产物位于 `docs/.vitepress/dist`。

## 添加笔记

1. 在 `docs/notes/<category>/` 目录下新建 Markdown 文件。
2. 文件顶部添加 frontmatter：

```markdown
---
title: 文章标题
description: 文章描述
category: tech
date: 2024-06-28
---
```

3. 在对应分类的 `index.md` 和 `docs/.vitepress/config.mjs` 的 sidebar 中更新链接。
4. 提交并推送到 `main` 分支，等待自动部署完成。

## 在线编辑

每篇笔记页面底部提供“在 GitHub 上编辑此页”链接，点击即可在浏览器中修改源文件。

## 部署

项目使用 GitHub Actions 自动部署到 GitHub Pages：

- 触发条件：推送代码到 `main` 分支
- 工作流文件：`.github/workflows/deploy.yml`
- 首次部署需在仓库 Settings > Pages 中将 Source 设置为“GitHub Actions”

## 访问地址

部署完成后，站点将可通过以下地址访问：

```
https://yeducos.github.io/notebook/
```

（地址将根据实际 GitHub 用户名/组织名自动生效。）

## 规范

详细的笔记编写、分类管理和 Agent 协作规范请参见 [agent.md](./agent.md)。
