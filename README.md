# GatherUp

GatherUp 是一个面向小型线下活动组织者的流程管理工具。

第一版聚焦线下观影活动，帮助组织者在同一个平台里完成报名、付款截图确认、选座、通知和导出名单。

## 当前内容

- [Web App 工程骨架](./src)
- [产品框架](./docs/product-v0.1.md)
- [页面信息架构](./docs/information-architecture-v0.1.md)
- [视觉方向](./docs/visual-direction-v0.1.md)
- [数据模型与业务规则](./docs/data-rules-v0.1.md)
- [数据库 Schema 草案](./docs/database-schema-v0.1.md)
- [原型页面说明](./docs/prototype-screens-v0.1.md)
- [技术架构](./docs/technical-architecture-v0.1.md)
- [MVP 开发任务清单](./docs/mvp-backlog-v0.1.md)
- [静态原型](./prototype)
- [Supabase SQL 草案](./supabase)

## 静态原型

本地预览：

```bash
cd prototype
python3 -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173
```

当前原型用于确认 v0.1 的信息架构、核心流程和视觉方向，不包含真实后端、登录、上传或支付能力。

## Web App 骨架

当前仓库已包含 Next.js/App Router 工程骨架，先使用 mock 数据复刻核心流程。

安装依赖后运行：

```bash
npm install
npm run dev
```

然后打开：

```text
http://localhost:3000
```

当前 Web App 骨架包含：

- 活动广场
- 活动详情
- 我的活动
- 组织工作台
- 创建活动
- 活动管理台
