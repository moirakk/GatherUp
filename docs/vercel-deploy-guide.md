# GatherUp Vercel 部署指南（新手向）

本指南带你从零开始，把 GatherUp 部署到 Vercel。全程无需命令行，只用浏览器即可完成。

---

## 一、前置准备

在开始之前，请确认你已经具备：

1. **GitHub 账号**，且代码已推送到 `moirakk/GatherUp` 仓库。
2. **Supabase 项目**已创建并执行完所有迁移（参考 `docs/production-migration-sop.md`）。
3. **Resend 账号**（用于发送通知邮件，https://resend.com ），并已验证发件域名或使用 Resend 提供的测试域名。

---

## 二、注册 Vercel 并导入仓库

1. 打开 [https://vercel.com](https://vercel.com)，点击右上角 **Sign Up**。
2. 选择 **Continue with GitHub**，用你的 GitHub 账号（moirakk）授权登录。
3. 登录后进入控制台（Dashboard），点击 **Add New... → Project**。
4. 在 "Import Git Repository" 列表中找到 **moirakk/GatherUp**：
   - 如果没看到，点击 **Adjust GitHub App Permissions**，在弹出的 GitHub 页面中授权 Vercel 访问 `GatherUp` 仓库。
5. 点击仓库右侧的 **Import**。
6. 在配置页面：
   - **Framework Preset**：Vercel 会自动识别为 **Next.js**，无需修改。
   - **Root Directory**：保持默认（仓库根目录）。
   - **Build Command / Output Directory**：保持默认。
7. **先不要点 Deploy**——先展开 **Environment Variables** 区域，按下一节配置好环境变量再部署（否则首次部署会缺少配置）。

---

## 三、环境变量配置清单

在 Vercel 项目的 **Settings → Environment Variables**（或首次导入时的 Environment Variables 区域）中逐条添加。

> ⚠️ 安全提醒：
>
> - 以下只列出变量名，**真实密钥值请从 Supabase / Resend 控制台复制**，切勿写进代码或文档。
> - 带 `NEXT_PUBLIC_` 前缀的变量会暴露给浏览器；**服务端密钥（如 Service Role Key）绝不能加 `NEXT_PUBLIC_` 前缀**。

### 必需变量（生产环境必须配置）

| 变量名                          | 从哪里获取                                                      | 说明                                                                                                             |
| ------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase 控制台 → Project Settings → API → Project URL          | Supabase 项目地址                                                                                                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 控制台 → Project Settings → API → anon public key      | 客户端匿名密钥                                                                                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase 控制台 → Project Settings → API → service_role key     | 服务端专用，供定时任务清理和管理员校验使用。**高度敏感，只在服务端使用**                                         |
| `CRON_SECRET`                   | 自己生成一个随机长字符串（如在终端运行 `openssl rand -hex 32`） | 用于认证对 `/api/jobs/run` 的定时任务请求。Vercel Cron 会自动以 `Authorization: Bearer <CRON_SECRET>` 请求头调用 |
| `RESEND_API_KEY`                | Resend 控制台 → API Keys                                        | 发送通知邮件的 API 密钥                                                                                          |
| `RESEND_FROM_EMAIL`             | 你在 Resend 验证过的发件地址，如 `notifications@你的域名.com`   | 通知邮件的发件人                                                                                                 |

### 可选变量（一般不需要配置）

| 变量名                                             | 说明                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_GATHERUP_DEMO_MODE`                   | 显式演示模式：即使配置了 Supabase 也展示 mock 数据。**生产环境切勿开启**                            |
| `DEMO_MODE`                                        | 在生产环境保留本地原型（非 Supabase）登录入口。仅用于无 Supabase 的纯演示部署，正常生产**不要设置** |
| `GATHERUP_SUPABASE_PROJECT_REF`                    | 仅本地 `npm run db:types` 使用，Vercel 上不需要                                                     |
| `GATHERUP_RUN_RPC_INTEGRATION` 等 RPC 集成测试变量 | 仅本地/CI 针对一次性测试项目使用，Vercel 上不要配置                                                 |

配置每个变量时，Environment 建议勾选 **Production**（如需预览环境也可用，再勾选 Preview）。

配置完成后点击 **Deploy**，等待构建完成（通常 1~3 分钟）。

---

## 四、Cron 定时任务说明

### 当前配置

仓库根目录的 `vercel.json` 已配置了定时任务：

```json
{
  "crons": [
    {
      "path": "/api/jobs/run",
      "schedule": "0 3 * * *"
    }
  ]
}
```

这个任务会调用 `/api/jobs/run`，执行两项清理：

- **过期座位锁清理**（`expire_seat_locks_for_event`）
- **过期候补邀请清理**（`expire_waitlist_invitations`）

### 为什么是每天一次，而不是每 5 分钟？

**Vercel Hobby（免费）计划的 Cron 限制：每个 cron job 每天最多触发一次**，且触发时间不精确（在指定小时内的某个时刻执行）。因此配置为 `0 3 * * *`（每天凌晨 3 点 UTC 左右执行一次）以符合免费版限制。

但座位锁和候补邀请的过期清理理想频率是**每几分钟一次**——每天一次意味着过期数据可能滞留最长 24 小时。有两种对策：

#### 对策 A（推荐，免费）：使用外部 Cron 服务

用 [cron-job.org](https://cron-job.org)（免费）等外部服务高频调用清理接口：

1. 注册 cron-job.org 账号。
2. 创建一个新 Cronjob：
   - **URL**：`https://你的域名.vercel.app/api/jobs/run`
   - **执行间隔**：每 5 分钟。
   - **请求方式**：GET。
   - **请求头（Headers）**：添加 `Authorization: Bearer <你的 CRON_SECRET 值>`（与 Vercel 环境变量中的 `CRON_SECRET` 保持一致）。
3. 保存并启用。可在 cron-job.org 的执行历史里确认返回状态为 `200`。

> `/api/jobs/run` 接口本身通过 `CRON_SECRET` Bearer Token 认证，无论调用方是 Vercel Cron 还是外部服务，认证方式完全一致，因此无需改代码。Vercel 每天一次的 cron 可以保留作为兜底。

#### 对策 B（付费）：升级 Vercel Pro

Pro 计划（$20/月起）支持更高频率的 cron（可精确到分钟级）。升级后把 `vercel.json` 的 schedule 改回 `*/5 * * * *` 并重新部署即可。

---

## 五、部署后验证步骤

部署成功后，按以下清单逐项检查（把 `你的域名.vercel.app` 替换为 Vercel 分配的实际域名）：

### 1. 页面可访问性

| 页面     | 地址       | 预期                               |
| -------- | ---------- | ---------------------------------- |
| 登录页   | `/login`   | 正常显示，提示"已连接真实账号服务" |
| 服务条款 | `/terms`   | 正常显示（无需登录）               |
| 隐私政策 | `/privacy` | 正常显示（无需登录）               |
| 首页     | `/`        | 未登录时跳转到 `/login`            |

### 2. 安全响应头

在终端运行（或使用浏览器开发者工具 Network 面板查看响应头）：

```bash
curl -sI https://你的域名.vercel.app/login | grep -iE "content-security-policy|strict-transport-security|x-frame-options|x-content-type-options"
```

应能看到 `Content-Security-Policy`、`Strict-Transport-Security`、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`。

### 3. 定时任务接口

```bash
# 无凭证访问应返回 401
curl -s https://你的域名.vercel.app/api/jobs/run
# 期望输出: {"ok":false,"message":"Unauthorized."}

# 携带正确的 CRON_SECRET 应返回 200
curl -s -H "Authorization: Bearer <你的 CRON_SECRET 值>" https://你的域名.vercel.app/api/jobs/run
# 期望输出: {"ok":true,"expired_seat_locks":0,"expired_waitlist_invitations":0}
```

也可在 Vercel 控制台 **Settings → Cron Jobs** 中看到已注册的 cron，并在执行后于 **Logs** 中查看运行记录。

### 4. 登录与核心流程

1. 用 Supabase 中已有的账号登录，确认能进入首页。
2. 浏览一个活动详情页、尝试报名流程（若有测试活动）。
3. 触发一次会产生邮件通知的操作（如报名确认），到 Resend 控制台 **Logs** 中确认邮件已发送。

### 5. 常见问题排查

- **构建失败**：查看 Vercel 部署日志，最常见原因是环境变量缺失或拼写错误。
- **页面显示"账号服务暂时不可用"**：说明 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` 未配置或配置错误。
- **修改环境变量后不生效**：环境变量修改后需要**重新部署**（Deployments → 最新部署右侧菜单 → Redeploy）才会生效。
- **邮件未发送**：检查 `RESEND_API_KEY` / `RESEND_FROM_EMAIL` 是否配置，发件域名是否已在 Resend 验证。
