# GatherUp UI 设计规范 · v3「iOS 原生」

> v3 依据用户反馈调整：v2「安静的美术馆」风格 AI 模板味过重，改向 iOS App Store 的统一原生视觉靠拢——系统字体、白卡片、单强调色、无装饰元素。v2 概念稿（v2-home.html / v2-detail.html）保留作历史参考，不再代表当前方向。

## 核心原则

- 只靠字号 + 字重区分层级，不用衬线字体、不用装饰性插画
- 全站一个强调色，克制使用
- 白卡片 + 浅灰底 + hairline 边框，无花哨阴影
- 动作入口用系统样式 chevron（›），不用装饰按钮

## 字体

系统字体栈（无外部字体加载）：

```
-apple-system, BlinkMacSystemFont, "PingFang SC", "SF Pro Text", "Helvetica Neue", sans-serif
```

## 配色板

| 角色 | 色值 | 用途 |
|---|---|---|
| 页面底 | `#F2F2F7` | iOS systemGroupedBackground |
| 卡片 | `#FFFFFF` | 全部卡片统一白色 |
| hairline | `#E5E5EA` | 卡片边框、分隔线 |
| 主文字 | `#1C1C1E` | 标题、正文 |
| 次要文字 | `#8E8E93` | iOS secondaryLabel |
| 淡文字 | `#AEAEB2` | 占位、chevron |
| 强调色 | `#A97A5B` | 柔化陶土，全站唯一强调（CTA 按钮、进度条） |
| 搜索框底 | `rgba(118,118,128,0.12)` | iOS searchBar fill |

## 字阶表

| 层级 | 字号 | 字重 | 用途 |
|---|---|---|---|
| display | 28px | 700 | 页面大标题（letter-spacing -0.02em） |
| title | 17px | 600 | 卡片标题、价格（iOS body semibold） |
| body | 15px | 400–600 | 正文、tab、信息主行 |
| caption | 13px | 400 | 辅助信息、标签（iOS footnote） |

## 间距表（8pt 网格，沿用）

| 数值 | 用途 |
|---|---|
| 8px | 元素内小间距 |
| 16px | 卡片内边距、卡片之间、页面左右留白 |
| 24px | tab 列间距、悬浮条离底距离 |
| 32–48px | 区块之间、页首上留白 |

## 组件样式

- 卡片：白底、圆角 14px、1px `#E5E5EA` 边框、无阴影
- 列表组（票档、活动信息）：整组一张白卡，行间 hairline 分隔（iOS inset grouped list）
- tab：下划线式，激活项 2px 墨色下划线 + semibold
- 搜索框：iOS 圆角灰底样式（10px 圆角）
- 详情页悬浮 CTA：白色毛玻璃条（backdrop-blur）+ 陶土胶囊按钮
- 卡片动作入口：右侧居中灰色 chevron（›），无圆形按钮

## 历史版本

- v1（direction-a/b/c.html）：三方向探索，已否定
- v2（v2-home.html / v2-detail.html）：安静美术馆风（衬线标题 + 粉彩三色轮换 + 陶土圆钮），用户反馈 AI 味过重，已由 v3 取代
