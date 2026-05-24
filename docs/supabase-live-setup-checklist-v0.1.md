# GatherUp v0.1 Supabase 真实接入清单

这份清单用于把 GatherUp 从“本地原型账号”切换到“真实 Supabase 账号和数据库”。

目标不是一次上线全部功能，而是先跑通第一条真实链路：

```text
创建 Supabase 项目
→ 配置本地环境变量
→ 运行数据库 schema
→ 注册真实账号
→ 登录后创建 users 资料
→ 在 /dev/status 检查状态
```

## 1. 创建 Supabase 项目

需要准备：

- 一个 Supabase 账号。
- 一个新 Project。
- 项目名称建议：`gatherup` 或 `gatherup-v0-1`。
- Database password：保存到自己的密码管理器，不要提交到 GitHub。
- Region：优先选离第一批测试用户近的区域。

创建完成后，等待 Supabase 项目初始化完成。

## 2. 复制前端需要的环境变量

在 Supabase 项目设置里找到 API 信息，复制：

- Project URL。
- anon public key。

在本地项目根目录创建 `.env.local`：

```text
NEXT_PUBLIC_SUPABASE_URL=你的 Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon public key
```

注意：

- `.env.local` 不要提交到 GitHub。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以放前端，但仍然要配合 RLS 使用。
- `service_role key` 不能放进前端，也不能加 `NEXT_PUBLIC_`。
- 如果以后需要 service role，只能用于服务端脚本或受保护的后端 API。

## 3. 运行数据库 schema

在 Supabase SQL Editor 里运行：

```text
supabase/schema.sql
```

运行后需要确认：

- 所有 enum 创建成功。
- `users`、`events`、`registrations`、`payments` 等表创建成功。
- 触发器创建成功。
- RLS 已启用。
- RLS policies 创建成功。

如果 SQL Editor 报错，不要继续运行 seed，先保存报错信息再修。

## 4. 先不要运行 seed

第一轮真实账号验证建议先不要运行：

```text
supabase/seed.sql
```

原因：

- seed 里有固定演示用户和固定 UUID。
- 第一轮我们更需要确认“真实 Auth 用户 → users 表”这条链路。
- 等真实账号跑通后，再决定是否插入演示活动数据。

## 5. 设置 Auth

第一轮建议：

- 启用 Email 登录。
- 启用邮箱密码注册。
- 可以先允许邮箱确认，也可以为了本地测试临时关闭邮箱确认。
- 如果开启邮箱确认，注册后需要去邮箱点击确认链接，再回到 GatherUp 登录。

正式上线建议开启：

- 邮箱确认。
- 密码强度要求。
- 邮件模板品牌化。
- Redirect URL 白名单。

本地测试常用 URL：

```text
http://localhost:3000
http://127.0.0.1:3000
```

## 6. 重启本地开发服务器

配置 `.env.local` 后，需要重启开发服务器：

```bash
npm run dev:webpack -- --hostname 127.0.0.1 --port 3000
```

原因：

- Next.js 只会在启动时读取新的环境变量。
- 不重启的话，页面可能仍然显示 Supabase 未配置。

## 7. 打开后端状态页

登录应用后打开：

```text
http://127.0.0.1:3000/dev/status
```

理想状态：

- 本地应用：已就绪。
- Supabase 环境变量：已就绪。
- 登录状态：已就绪。
- Supabase Auth：已就绪。
- users 资料同步：已就绪。

如果还没有登录真实账号，Supabase Auth 和 users 资料同步可能显示“需处理”，这是正常的。

## 8. 注册真实测试账号

测试建议：

- 使用一个真实可收邮件的邮箱。
- 密码至少 8 位。
- 昵称可以填测试昵称。

注册后：

- 如果项目要求邮箱确认，先去邮箱点击确认链接。
- 再回到 `/login` 登录。
- 登录成功后，GatherUp 会尝试创建或读取 `users` 表资料。

## 9. 验证 users 表

在 Supabase Table Editor 里查看：

```text
public.users
```

应该看到：

- `auth_user_id`：对应 Supabase Auth 用户 ID。
- `email`：测试邮箱。
- `name`：注册或资料补全昵称。
- `public_id`：GatherUp ID。
- `public_id_change_count`：初始为 0。

再查看：

```text
public.user_auth_identities
```

应该看到邮箱身份记录。

## 10. 验证资料修改

在 GatherUp 打开：

```text
/me
```

修改 GatherUp ID 后：

- 页面应该提示已保存到数据库。
- `users.public_id` 应该更新。
- `users.public_id_change_count` 应该增加。
- 最多只能修改两次。

## 11. 常见问题

### 页面仍显示 Supabase 未配置

检查：

- `.env.local` 是否在项目根目录。
- 变量名是否完全一致。
- 开发服务器是否重启。
- URL 和 anon key 是否有多余空格。

### 注册后不能直接登录

可能原因：

- Supabase 开启了邮箱确认。
- 需要先去邮箱点击确认链接。

### users 资料同步失败

检查：

- 是否已经运行 `supabase/schema.sql`。
- `users` 表是否存在。
- RLS policy 是否创建成功。
- `/dev/status` 显示的错误信息是什么。

### 不要做的事

- 不要把 `.env.local` 发到 GitHub。
- 不要把 service role key 放进浏览器环境。
- 不要关闭 RLS 后忘记打开。
- 不要把真实用户邮箱、付款截图、订单数据当作公开数据处理。

## 12. 完成标准

这一阶段完成的标准：

- GitHub 代码已同步。
- `.env.local` 已配置。
- `schema.sql` 已成功运行。
- 可以注册真实邮箱账号。
- 可以登录真实账号。
- `/dev/status` 全部关键项就绪。
- `public.users` 中能看到真实测试用户。
- `/me` 修改 GatherUp ID 后能写入数据库。
