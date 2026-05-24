# GatherUp v0.1 Supabase 接入准备

## 1. 当前状态

项目已经加入 Supabase JavaScript 客户端依赖，并提供了浏览器客户端封装：

- `src/lib/supabase/client.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/supabase/profile.ts`

登录页已经具备 Supabase Auth 适配层：

- 未配置环境变量时，继续使用本地原型账号，保证原型可演示。
- 配置环境变量后，登录、注册、邮箱验证码、找回密码会优先使用 Supabase Auth。
- 注册后如果 Supabase 项目开启邮箱确认，页面会提示先去邮箱确认，不会直接进入应用。
- 登录成功后会创建或读取 `users` 资料，并把 `auth.users.id` 同步到 `users.auth_user_id`。
- 同步后的 `users.public_id` 会作为正式 GatherUp ID，用于活动、订单和组织者权限绑定。
- 资料补全页和账号中心已经可以在 Supabase 模式下更新 `users.name` 和 `users.public_id`。

当前还没有把活动、订单、财务、场地等业务数据切换到真实 Supabase 数据。现阶段是“账号服务准备接入，业务数据仍使用 mock”。

## 2. 需要创建的 Supabase 项目

后续进入真实后端时，需要在 Supabase 控制台创建一个项目，并准备：

- Project URL。
- anon public key。
- PostgreSQL Database。
- Auth。
- Storage。

## 3. 本地环境变量

复制 `.env.example` 为 `.env.local`，填写：

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

注意：

- `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以给浏览器使用。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放服务端，不能加 `NEXT_PUBLIC_`。
- 当前项目不提交 `.env.local`。

配置完成后，可以登录应用并打开：

```text
/dev/status
```

这个页面会显示本地原型、Supabase 环境变量、Supabase Auth 和 `users` 资料同步是否就绪。

## 4. 数据库草案

当前 SQL 草案在：

- `supabase/schema.sql`
- `supabase/seed.sql`

正式接入时建议流程：

1. 在 Supabase SQL Editor 运行 `schema.sql`。
2. 确认表、枚举、触发器和 RLS 策略创建成功。
3. 运行 `seed.sql` 创建演示数据。
4. 再把前端 mock 数据逐步替换成 Supabase 查询。

## 5. Auth 建议

v0.1 真实账号第一阶段已经开始：

- 邮箱密码登录。
- 邮箱验证码登录。
- 忘记密码。
- 登录后创建或读取 `users` 资料。
- 将 Supabase Auth 的 `auth.users.id` 同步到业务表的 `users.auth_user_id`。
- 保持统一账号模型，不区分参与者账号和组织者账号。

下一步需要补齐：

- 用服务端 Session / middleware 替换当前的前端 cookie 原型。
- 给用户资料、订单、组织者权限接入 RLS 校验。
- 把活动创建、报名和付款流程逐步从 mock 数据切换到 Supabase。

后续再接：

- Google 登录。
- Apple 登录。
- 手机号。
- 微信。

## 6. Storage 建议

后续需要的 Storage bucket：

- `payment-proofs`：参与者付款截图。
- `expense-proofs`：组织者支出凭证。
- `avatars`：用户头像。
- `venue-photos`：场地图片。

第一版可以先只做：

- `payment-proofs`
- `expense-proofs`

## 7. 下一步开发顺序

推荐顺序：

1. 配置 Supabase 项目并验证 Auth 邮件流程。
2. 用服务端 Session / middleware 替换当前前端 cookie 过渡方案。
3. 创建活动分步向导写入 `events`、`event_organizers`、`event_finance_settings`。
4. 报名写入 `registrations` 和 `registration_attendees`。
5. 付款截图上传到 Storage，并写入 `payments` 和 `payment_proofs`。
6. 组织者审核付款。
7. 付款确认后开放选座。

## 8. 安全注意事项

- 不要在前端暴露 service role key。
- RLS 必须打开。
- 所有活动管理操作都必须校验组织者权限。
- 财务数据只允许活动财务角色或主办查看。
- 付款截图和支出凭证不应公开暴露。
