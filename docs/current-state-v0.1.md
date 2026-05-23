# GatherUp v0.1 当前项目总览

## 1. 项目定位

GatherUp 是一个综合线下活动组织平台，不局限于线下观影或生咖。

目标是让活动组织者在同一个平台里完成：

- 活动创建。
- 数调。
- 地点投票。
- 报名和订单编号。
- 付款截图收集。
- 组织者确认付款。
- 付款确认后选座。
- 支出记账和收支统计。
- 场地经验查询。
- 参与者历史活动查看。

长期方向是覆盖：

- 同好活动：线下观影、生咖、粉丝聚会。
- 校园活动：社团招新、讲座、比赛。
- 会议会务：论坛、闭门会、品牌活动。
- 好友聚会：聚餐、旅行、私下小聚。
- 工作坊、市集、快闪等其他活动。

## 2. 当前技术状态

当前是 v0.1 前端原型阶段。

已使用：

- Next.js App Router。
- TypeScript。
- React。
- 全局 CSS。
- lucide-react 图标。
- mock 数据。
- Supabase JavaScript 客户端依赖。
- Supabase SQL 草案。

暂未接入：

- 真实数据库读写。
- Supabase Auth。
- 邮箱验证码服务。
- 图片上传和存储。
- 正式支付。
- 正式权限校验。
- 服务端真实 API。

## 3. 本地运行

推荐使用 webpack dev 模式，当前比 Turbopack dev 更稳定：

```bash
npm run dev:webpack -- --hostname 127.0.0.1 --port 3000
```

打开：

```text
http://127.0.0.1:3000
```

检查命令：

```bash
npm run typecheck
npm run build
```

演示账号：

```text
邮箱：miki@gatherup.local
密码：gatherup123
```

## 4. 已完成的前端页面

账号：

- `/login`：登录、注册、验证码、找回入口原型。
- `/onboarding`：首次资料补全。
- `/me`：我的活动和账号中心。
- `/me/orders/[orderNumber]`：订单详情。

参与者侧：

- `/`：活动广场。
- `/events/[eventId]`：活动详情。
- `/events/[eventId]/register`：报名、数调、地点投票、付款截图、选座流程原型。

组织者侧：

- `/organizer`：组织工作台。
- `/organizer/events/new`：创建活动分步向导。
- `/organizer/events/[eventId]`：活动管理台。
- `/organizer/events/[eventId]/finance`：活动财务中心。

平台公共模块：

- `/venues`：场地情报库。
- `/venues/[venueId]`：场地详情。

## 5. 已确定的产品规则

账号：

- 所有核心内容都需要登录后查看。
- 不区分参与者账号和组织者账号。
- 同一个账号既可以参与活动，也可以创建活动。
- 邮箱是全球账号底座。
- Google / Apple 是全球快捷登录方向。
- 微信 / 手机号是地区化增强入口。
- GatherUp ID 最多允许修改两次。

活动：

- 每个活动有内部 ID 和公开活动 ID。
- 公开活动 ID 用于搜索、分享、现场核对和客服查询。
- 一个活动可以绑定多个组织者。
- 组织者角色包括主办、联合主办、财务、现场协作和只读。
- 活动类型使用“活动场景 + 流程模板 + 自定义标签”。
- 线下观影、生咖不是平台边界，只是同好活动下的细分标签。

报名和付款：

- 参与者先登录。
- 先数调和地点投票，再正式报名付款。
- 每条报名生成订单编号。
- 是否允许多人报名由活动创建者决定。
- 多人报名需要记录同行人 GatherUp ID。
- v0.1 付款方式是付款截图加组织者确认。
- 必须先付款并被确认，之后才能选座。

财务：

- 活动支持免费、收费、AA 记账三种费用模式。
- 收入第一版来自报名订单和付款状态。
- 组织者可以手动添加支出。
- 支出可按场地费、物料、餐饮、设备、交通、宣传、其他分类。
- 财务中心展示确认收入、待审核收入、总支出、预计结余和人均成本。

场地库：

- 场地库是平台级公共模块。
- 记录各城市哪些影院、咖啡馆、会议室等空间可以承接活动。
- 场地状态包括确认可办、可能可办、暂不支持、未知待确认。
- 场地详情展示价格备注、联系建议、优势、注意事项和体验评分。

## 6. 当前数据和文档

核心 mock 数据：

- `src/lib/mock-data.ts`

账号逻辑：

- `src/lib/auth.ts`

数据库草案：

- `supabase/schema.sql`
- `supabase/seed.sql`

Supabase 接入：

- `src/lib/supabase/client.ts`
- `.env.example`
- `docs/supabase-setup-v0.1.md`

主要文档：

- `docs/product-v0.1.md`：产品框架。
- `docs/account-system-v0.1.md`：账号系统。
- `docs/activity-taxonomy-v0.1.md`：活动类型体系。
- `docs/information-architecture-v0.1.md`：页面信息架构。
- `docs/visual-direction-v0.1.md`：视觉方向。
- `docs/data-rules-v0.1.md`：数据模型和业务规则。
- `docs/database-schema-v0.1.md`：数据库说明。
- `docs/supabase-setup-v0.1.md`：Supabase 接入准备。
- `docs/prototype-screens-v0.1.md`：原型页面说明。
- `docs/technical-architecture-v0.1.md`：技术架构。
- `docs/venue-intelligence-v0.1.md`：场地情报库。
- `docs/mvp-backlog-v0.1.md`：MVP 任务清单。

## 7. 已知限制

当前仍是原型，不是正式可上线产品。

限制包括：

- 注册账号保存在浏览器 localStorage，只用于原型验证。
- 登录状态使用 cookie 模拟。
- 付款截图和支出凭证没有真实上传。
- 创建活动分步向导还没有真实保存。
- 报名、付款、选座还没有写入数据库。
- 权限规则目前主要在文档和 SQL 草案里，前端没有真实后端校验。
- 场地库数据是示例数据，不是真实审核后的数据。

## 8. 推荐下一步

第一优先级：

- 接入 Supabase Auth 和 users 表。
- 把当前 demo auth 替换成真实账号。
- 保留现有统一账号模型。

第二优先级：

- 把活动创建、报名、订单和付款审核接到数据库。
- 让创建活动分步向导真实保存草稿和发布状态。
- 实现真实图片上传。
- 实现真实组织者权限。

第三优先级：

- 场地库提交和审核流。
- 财务凭证上传。
- 通知和导出。
- 移动端细节打磨。

## 9. 当前 Git 状态说明

截至本文件整理时，最近完成模块包括：

- 账号注册原型。
- 场地情报库。
- 活动 ID 和多组织者绑定。
- 组织者财务中心。

如果本地 `main` 显示领先远端，需要在 GitHub Desktop 中点击 `Push origin` 同步。
