# GatherUp v0.1 数据库 Schema 草案

## 1. 文件位置

当前数据库草案放在：

- [`supabase/schema.sql`](../supabase/schema.sql)
- [`supabase/seed.sql`](../supabase/seed.sql)

`schema.sql` 是 Supabase/PostgreSQL 的建表草案，`seed.sql` 是用于本地演示的示例数据。

## 2. 覆盖范围

Schema 草案覆盖：

- 用户 `users`
- 用户登录身份 `user_auth_identities`
- 活动 `events`
- 活动组织者 `event_organizers`
- 活动订单计数器 `event_order_counters`
- 报名/订单 `registrations`
- 同行人 `registration_attendees`
- 付款 `payments`
- 付款截图历史 `payment_proofs`
- 座位 `seats`
- 座位分配 `seat_assignments`
- 通知 `announcements`
- 审计日志 `audit_logs`

## 3. 已包含的规则

- 用户公开 ID 唯一。
- 用户公开 ID 最多修改两次。
- 用户永久身份和登录方式分离：`users.id` 是 GatherUp 内部用户，邮箱、Google、Apple、手机号、微信等登录方式记录在 `user_auth_identities`。
- 同一个登录身份不能绑定多个用户。
- 活动支持公开/仅链接可见。
- 活动支持唯一公开活动 ID。
- 活动支持多个组织者绑定。
- 活动支持场景和流程模板。
- 活动支持自定义细分标签。
- 活动支持是否允许多人报名。
- 报名订单号在同一活动内唯一。
- 每个报名自动创建付款记录。
- 上传付款截图后自动把付款状态改为待审核。
- 一个座位在同一活动内只能被分配一次。
- 每个同行人最多分配一个座位。
- 新增座位分配后自动把座位状态改为已分配。

## 4. RLS 策略状态

`schema.sql` 包含第一版 Row Level Security 策略草案。

这些策略表达了 v0.1 的权限方向：

- 未登录用户只能读公开活动。
- 参与者只能查看自己的订单、付款和付款截图。
- 组织者只能管理自己创建或被授权协作的活动。
- 付款截图只对订单本人和活动组织者可见。
- 用户只能读取和管理自己的登录身份绑定记录。

实际接入 Supabase Auth 后，还需要根据 `auth.uid()` 和项目里的用户资料创建流程做一次实测和微调。

## 5. 暂未固化的部分

- 同行人 ID 是否必须对应已注册用户。
- Apple / Google / 微信 / 手机号登录回调字段的最终映射。
- 复杂退款流程。
- 多管理员权限。
- 活动审核机制。
