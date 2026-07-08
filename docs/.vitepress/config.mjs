import { defineConfig } from 'vitepress'

const repoUrl = 'https://github.com/yeducos/notebook'

export default defineConfig({
  lang: 'zh-CN',
  title: '个人笔记',
  description: '整理与分享个人学习、生活与思考',
  base: '/notebook/',
  srcDir: '.',
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '笔记', link: '/notes/' },
      {
        text: '分类',
        items: [
          { text: '技术', link: '/notes/tech/' },
          { text: '生活', link: '/notes/life/' },
          { text: '思考', link: '/notes/thinking/' },
        ]
      }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '笔记总览',
          link: '/notes/'
        },
        {
          text: '技术',
          collapsed: false,
          items: [
            { text: '技术笔记索引', link: '/notes/tech/' },
            { text: '示例笔记', link: '/notes/tech/example' }
          ]
        },
        {
          text: '生活',
          collapsed: false,
          items: [
            { text: '生活笔记索引', link: '/notes/life/' }
          ]
        },
        {
          text: '思考',
          collapsed: false,
          items: [
            { text: '思考笔记索引', link: '/notes/thinking/' },
            { text: '图尔敏论证模型', link: '/notes/thinking/toulmin-argument-model' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: repoUrl }
    ],

    editLink: {
      pattern: `${repoUrl}/edit/main/docs/:path`,
      text: '在 GitHub 上编辑此页'
    },

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024-present'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    outline: {
      label: '目录'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题'
  }
})
