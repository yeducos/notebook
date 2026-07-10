---
title: UI 复刻工作方法论
description: 在既有 Design Token 系统的项目里系统性复刻第三方 UI 组件的四步法
category: thinking
date: 2026-07-08
---

# UI 复刻工作方法论

> 适用场景：在已有 Design Token 系统的项目里，复刻第三方（如 Linear、Notion、Figma）的 UI 组件。

---

## 核心认知：三个信息源，各司其职

```
信息源          擅长                    不擅长
──────────────────────────────────────────────────────
截图/图片       视觉样式、间距、颜色      交互行为、状态变化
DOM 抓取        交互语义、组件状态        样式（混淆后无意义）
现有代码        Token 映射、复用组件      获取新的设计细节
```

**三者缺一不可，但不能混用职责。**

---

## 为什么不能只靠 DOM 抓取做视觉还原

Linear、Notion 等现代 React 应用，生产环境 CSS 是原子化 + 混淆的：

```css
/* 你以为能拿到的 */
.gpill { border: 1px solid var(--border); border-radius: 9999px; }

/* 实际拿到的 */
.sx-1kxnua { border: 1px solid rgba(0,0,0,0.1); }
.sx-hgvpf6 { border-radius: 9999px; }
```

- class 名全是哈希，语义完全丢失
- 数值是浏览器计算值，不是设计源值（`26.5px` 而非 `28px`）
- AI 无法将这些值映射到你的 Token 系统，只能硬编码或瞎猜
- 引入大量无关 wrapper div 噪音，干扰 AI 注意力

**结论：对混淆 CSS 项目，DOM 做视觉还原比直接看图更差。**

---

## 正确分工

### 图片负责：视觉还原

- 像素级对比两张图的差异
- 确定颜色、间距、圆角、边框
- 确定元素的位置关系和层级
- 图片是渲染终态，是密度最高、最干净的视觉信息源

### DOM 抓取负责：功能还原

```html
<!-- DOM 能告诉你这些有价值的信息 -->
<div role="dialog" aria-modal="true">        ← 弹窗语义
<button data-state="open">                   ← 有开关状态
<div data-radix-collection-item>             ← 用了 Radix UI
<div data-slate-editor>                      ← 描述区是富文本
<input name="name" required>                 ← 字段名和校验规则
<div data-side="bottom" data-align="start">  ← 下拉定位逻辑
```

DOM 抓取的价值点：
- `role` / `aria-*` → 交互语义和无障碍
- `data-state` → 组件状态机（open/closed/loading）
- `data-*` 前缀 → 识别第三方库（Radix、Slate、Floating UI）
- `name` / `type` / `required` → 表单字段和校验
- 抓取**不同状态下**的 DOM 对比 → 还原状态变化逻辑

### 现有代码负责：系统内映射

- 找到可复用的图标、class、组件
- 将新样式值映射到现有 Token
- 保持命名风格一致

---

## 完整工作流（四步）

### Step 1：建立代码地图（读现有代码）

不要从头到尾读，只找以下信息：

```
需要找到的                  怎么找
────────────────────────────────────────
目标函数位置               搜索函数名，如 modalProject()
相关 CSS 的行号范围        搜索 .modal、.gpill 等关键 class
图标库变量名               搜索 const I = 或 const icons =
CSS Token 变量名           搜索 :root { 查看所有 --变量
可复用的组件 class         搜索 .btn、.pill、.badge 等
```

**目标：建立「地图」，知道改哪里、能用什么，而不是读懂所有代码。**

---

### Step 2：差异分析（对比图片）

不描述图2长什么样，只列出图1和图2的 delta：

```
维度          图1（现状）              图2（目标）
──────────────────────────────────────────────────
顶部右侧      YED按钮 + ✕             只有 ✕
Pills数量     4个，无边框              8个，有描边胶囊
描述区        静态 div                可输入的 textarea
Milestones    普通文字行居上           带边框卡片居底
整体布局      固定高度堆叠             flex 纵向撑满
```

**差异分析比全量描述更精准，能防止「改对目标，改坏其他」。**

---

### Step 3：DOM 抓取补充功能细节（按需）

如果涉及交互逻辑，抓取目标页面的 DOM，只关注：

```
关注                          忽略
──────────────────────────────────────────
role / aria-* 属性            所有 class 名
data-state / data-* 属性      style 内联样式的具体数值
input 的 name/type/required   wrapper div 的层级嵌套
识别到的第三方库前缀            计算后的像素值
```

抓取不同状态（默认态/hover/展开/错误）对比，提取状态机逻辑。

---

### Step 4：规划改动范围，精准修改

动手前明确说出：

```
✅ 需要改的 CSS：.milestones-bar（第802行）、.modal.wide .gpill（第796行）
✅ 需要改的函数：modalProject()（第2616行）
✅ 可以复用的：I.plus16、I.noPriority、I.label、var(--border)、.btn
✅ 需要新增的：icoStart SVG、icoTarget SVG、.proj-desc-area 样式
❌ 绝对不动的：modalIssue()、路由函数、侧边栏、图标库 const I
```

用 str_replace 精准替换，不整文件输出。
新增内容紧贴同类代码，命名风格与文件保持一致。

---

## 常见错误模式

| 错误 | 原因 | 正确做法 |
|------|------|----------|
| 用 DOM 做视觉还原 | CSS 混淆，语义丢失 | 用图片做视觉还原 |
| 声称「基于官方真实值」 | 实为训练数据里的印象 | 明确信息来源 |
| 看到目标图就重写全部 | 没有建立代码地图 | 先读代码再做 diff |
| 引入外部库或新 Token | 没有检查现有系统 | 复用优先，新增最小 |
| 整文件输出 | 改动范围不清晰 | str_replace 精准手术 |
| DOM class 名硬编码 | 没做 Token 映射 | 映射到现有变量 |

---

## 信息源选择决策树

```
需要复刻一个 UI 组件
        │
        ├─ 视觉样式（颜色/间距/形状）
        │         └──→ 用截图，像素级 diff
        │
        ├─ 交互行为（点击/展开/状态变化）
        │         └──→ 抓 DOM，看 data-* 和 role
        │
        ├─ 用了什么第三方库
        │         └──→ 抓 DOM，看 data- 前缀特征
        │
        └─ 样式值映射到我的 Token 系统
                  └──→ 读现有代码，找对应变量
```