# GatherUp

线下活动运营平台 —— 从报名、审核、签到到复盘，给主办方一条完整可追溯的运营链路。

组织过线下活动的人都知道，麻烦从来不在"发布活动"那一刻，而在之后：报名信息散落在表单和聊天记录里，转账截图要一张张人工核对，现场签到靠喊名字，活动结束后想复盘收支和到场率，发现数据根本对不上。市面上的活动工具大多只做了"报名"这一层，后面的运营环节全靠主办方自己拿 Excel 硬扛。

GatherUp 把这条链路完整地搬进一个工作台：主办方创建活动、管理协作者权限，参与者报名并上传付款凭证，主办方审核、锁座、现场签到、处理退款，最后导出财务和运营数据。核心是一套带审计日志的 PostgreSQL RPC 层——报名、审核、锁座、签到、退款这些涉及钱和状态的操作全部走事务边界，每一次状态变更都被记录、可回溯；权限则由 Postgres RLS 在数据库层强制执行，付款凭证存放在路径受限的私有 Storage。当前为 Commercial v0.1 预商业化阶段，数据库与权限地基已完成并在真实 Supabase 环境验证中。

## 核心功能

- **主办方工作台**：活动创建与配置、协作者角色权限、报名与候补管理、付款凭证审核、座位锁定与分配、现场签到、退款流程、财务导出
- **参与者端**：报名、上传付款凭证、跟踪订单 / 座位 / 签到 / 退款状态
- **审计日志 RPC**：20+ 个事务性 RPC 覆盖全部关键状态变更，每次操作写入带风险等级的审计记录
- **数据库层安全**：Postgres RLS 策略 + 私有 Storage 桶 + 契约测试守护 API 与 Schema 边界

## Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)

## 快速开始

需要 Node.js 22 和 npm。

```bash
npm install
npm run dev:webpack -- --hostname 127.0.0.1 --port 3000
```

打开 `http://127.0.0.1:3000`。接入 Supabase 时复制 `.env.example` 为 `.env.local` 并填写配置（切勿提交 service-role key）；未配置时可使用本地 demo 模式开发界面。

本地质量门禁：

```bash
npm run verify   # lint + test + typecheck
npm run build
```

更多设计决策与运行手册见 [docs/](./docs/index-v0.1.md)。本仓库公开供审阅与协作，但现阶段不是开源项目，参与前请先与仓库所有者沟通（[LICENSE](./LICENSE.md) · [CONTRIBUTING](./CONTRIBUTING.md) · [SECURITY](./SECURITY.md)）。

---

<sub>涉及钱和状态的每一步，都应该经得起回放。</sub>
