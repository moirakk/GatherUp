# GatherUp v0.1 技术架构

## 1. 目标

GatherUp v0.1 的技术目标是先做出一个可用、可迭代、适合移动端访问的 Web App。

第一版不追求复杂平台能力，重点是稳定跑通：

活动创建 → 活动广场 → 登录报名 → 订单生成 → 付款截图上传 → 组织者审核 → 付款后选座 → 我的活动 → 导出名单。

## 2. 推荐技术栈

### 前端与应用框架

推荐：

- Next.js
- React
- TypeScript
- CSS design tokens

原因：

- 适合快速搭建 Web App。
- 可以同时服务参与者移动端页面和组织者桌面端工作台。
- 后续部署到 Vercel 成本低。
- TypeScript 有助于把活动、订单、付款、座位等复杂状态管住。
- 当前原型先使用全局 CSS 和设计 token，后续如有需要再评估是否引入 Tailwind CSS。

### 后端与数据库

推荐：

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage

原因：

- PostgreSQL 适合当前关系型数据模型。
- Supabase Auth 可以先支持邮箱登录，后续扩展手机号、微信登录。
- Supabase Storage 可用于付款截图、活动封面、收款码等文件。
- Row Level Security 后续可以保护组织者和参与者的数据边界。

### 部署

推荐：

- Vercel 部署前端。
- Supabase 托管数据库和文件。

## 3. v0.1 实现范围

### 第一版真实开发必须实现

- 用户登录。
- 用户公开 ID。
- 公开 ID 修改次数限制。
- 统一账号模型：同一个账号可以参与活动，也可以创建活动。
- 活动创建。
- 活动场景和流程模板。
- 活动广场。
- 活动详情页。
- 报名和订单生成。
- 多人报名选项。
- 同行人 ID 记录。
- 付款截图上传。
- 组织者付款审核。
- 简单座位图生成。
- 付款确认后选座。
- 我的活动。
- 组织工作台。
- 活动管理台。
- CSV 导出。

### 第一版可以先简化

- 登录先实现邮箱验证码或邮箱密码。
- 微信登录先保留入口，不一定第一批接入。
- 手机号登录先保留入口，不一定第一批接入。
- 付款截图可以先限制图片格式。
- 活动封面可以先使用色块占位。
- 活动广场先做基础筛选，不做推荐算法。

## 4. 应用路由建议

### 公开页面

- `/`：活动广场。
- `/events/[eventId]`：活动详情。

### 参与者页面

- `/login`：登录/注册。
- `/me`：个人中心。
- `/me/events`：我的活动。
- `/events/[eventId]/register`：报名。
- `/orders/[orderId]`：我的报名/订单详情。
- `/orders/[orderId]/payment`：付款截图。
- `/orders/[orderId]/seats`：选座。

### 组织者页面

- `/organizer`：组织工作台。
- `/organizer/events/new`：创建活动。
- `/organizer/events/[eventId]`：活动管理台概览。
- `/organizer/events/[eventId]/registrations`：报名管理。
- `/organizer/events/[eventId]/payments`：付款管理。
- `/organizer/events/[eventId]/seats`：座位管理。
- `/organizer/events/[eventId]/announcements`：通知管理。
- `/organizer/events/[eventId]/exports`：导出。

## 5. 前端模块建议

### 页面模块

- 活动广场。
- 活动详情。
- 报名流程。
- 付款截图流程。
- 选座流程。
- 我的活动。
- 个人中心。
- 组织工作台。
- 创建活动。
- 活动管理台。

### 组件模块

- `EventCard`：活动卡片。
- `StatusBadge`：状态标签。
- `OrderSummaryCard`：订单摘要。
- `PaymentProofUploader`：付款截图上传。
- `SeatMap`：座位图。
- `MetricCard`：组织者指标卡。
- `DataTable`：组织者表格。
- `EmptyState`：空状态。
- `ConfirmDialog`：确认弹窗。

### 样式原则

- 全局使用莫兰迪色系 token。
- 卡片圆角以 8px 为主。
- 避免卡片套卡片。
- 表格和状态标签优先保证可读性。
- 参与者页面移动端优先。
- 组织者页面桌面端信息密度更高。

## 6. 数据库表建议

核心表：

- `users`
- `events`
- `registrations`
- `registration_attendees`
- `payments`
- `seats`
- `seat_assignments`
- `announcements`

辅助表：

- `event_order_counters`
- `payment_proofs`
- `audit_logs`

### `event_order_counters`

用途：

记录每个活动的订单流水号，避免并发报名时编号重复。

字段：

- `event_id`
- `current_number`
- `updated_at`

### `payment_proofs`

用途：

保留付款截图上传历史，便于驳回后重新上传。

字段：

- `id`
- `payment_id`
- `file_url`
- `uploaded_by`
- `created_at`

### `audit_logs`

用途：

记录关键操作，便于组织者回溯。

字段：

- `id`
- `actor_id`
- `event_id`
- `target_type`
- `target_id`
- `action`
- `metadata`
- `created_at`

v0.1 可以先不做完整审计界面，但数据表设计可以预留。

## 7. 关键服务逻辑

### 创建订单

需要在服务端完成：

1. 检查活动是否可报名。
2. 检查人数是否符合活动规则。
3. 检查名额是否足够。
4. 生成订单编号。
5. 创建报名记录。
6. 创建同行人记录。
7. 创建付款记录。

### 上传付款截图

需要在服务端完成：

1. 检查当前用户是否拥有该订单。
2. 上传图片到 Storage。
3. 写入付款截图记录。
4. 将付款状态改为 `submitted`。

### 确认付款

需要在服务端完成：

1. 检查当前用户是否为活动组织者。
2. 检查付款状态是否可审核。
3. 更新付款状态为 `confirmed` 或 `rejected`。
4. 写入审核人和审核时间。

### 选座

需要在服务端完成：

1. 检查付款是否已确认。
2. 检查选择座位数是否等于报名人数。
3. 检查座位是否可选。
4. 在事务中创建座位分配。
5. 避免同一座位被重复分配。

## 8. 权限和安全

### 基础原则

- 未登录用户只能浏览公开内容。
- 参与者只能查看和修改自己的订单。
- 组织者只能管理自己创建的活动。
- 付款截图只对订单本人和活动组织者可见。

### Supabase RLS 建议

每张核心表都应开启 Row Level Security。

第一批重点保护：

- `registrations`
- `payments`
- `payment_proofs`
- `seat_assignments`

## 9. 文件上传

v0.1 文件类型：

- 付款截图。
- 收款码图片。
- 活动封面，后续。

建议限制：

- 文件类型：jpg、png、webp。
- 单文件大小：5MB 以内。
- 付款截图路径：`payment-proofs/{eventId}/{registrationId}/{timestamp}`。

## 10. 导出

v0.1 支持 CSV 导出：

- 报名名单。
- 付款记录。
- 座位分配。

导出由服务端生成，避免前端拿到不该访问的数据。

## 11. 后续扩展预留

- 微信登录。
- 手机号短信登录。
- 小程序。
- 官方支付。
- 退款流程。
- 更多活动场景。
- 分时段预约。
- 套餐库存。
- 活动审核。
- 多管理员权限。
