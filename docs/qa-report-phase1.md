# GatherUp Phase 1 本地 QA 走查报告

- 日期：2026-07-22
- 环境：本地 dev server（`npm run dev`，Next.js 16.2.11 Turbopack，`http://127.0.0.1:3000`）
- 配置状态：`.env.local` 仅配置 `RESEND_API_KEY` / `RESEND_FROM_EMAIL`；**Supabase 与 CRON_SECRET 均未配置**
- 备注：测试时本机 3000 端口另有一个进程监听 `::1`（其他项目的 vinext dev），`localhost` 解析到 IPv6 会命中错误的应用。本报告全部走查使用 `127.0.0.1:3000` 确认命中 GatherUp。

## 结果总览

| # | 检查项 | 结果 |
|---|--------|------|
| 1 | 公开页面 200 | ✅ 通过 |
| 2 | 安全头 | ✅ 通过 |
| 3 | 鉴权保护重定向 | ❌ **失败（阻断级）** |
| 4 | Cron 端点鉴权 | ✅ 通过（部分不可测） |
| 5 | mutating API 鉴权 | ✅ 通过（1 处轻微备注） |
| 6 | 登录流程配置 | ✅ 通过（原型模式） |
| 7 | 移动端视口 | ✅ 通过 |

---

## 1. 公开页面（通过）

| 路径 | 状态码 | 备注 |
|------|--------|------|
| `/` | 200 | 16 KB，`<title>GatherUp</title>` |
| `/login` | 200 | 20 KB |
| `/terms` | 200 | 31 KB |
| `/privacy` | 200 | 30 KB |
| `/events/ryuichi-masterpiece` | 200 | 32 KB |

备注：所有页面首屏 HTML 只包含 AppShell 的「正在确认登录状态」loading 壳，真实内容全部由客户端 JS 渲染。功能上正常，但对 SEO/首屏性能不利（尤其是公开的活动详情页和条款页），见「建议」。

## 2. 安全头（通过）

`curl -I http://127.0.0.1:3000/` 实测响应头：

- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` ✅
- `Strict-Transport-Security`: `max-age=63072000; includeSubDomains; preload` ✅
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` ✅

备注：`script-src 'unsafe-inline'` 是当前 Next.js 常见妥协，后续可评估 nonce 方案。

## 3. 鉴权保护重定向（失败 — 阻断级）

**实测：未登录访问 `/organizer`、`/me`、`/admin` 全部返回 200，未发生服务端重定向。**（`/finance` 路由不存在，返回 404，属预期。）

### 根因

`middleware.ts` 位于**仓库根目录**，但项目源码使用 `src/` 目录结构（`src/app/…`）。Next.js 规定：使用 `src` 目录时，middleware 必须放在 `src/middleware.ts`，根目录的 middleware 文件会被**静默忽略**。

验证过程：将 `middleware.ts` 临时复制到 `src/middleware.ts` 后，未登录访问立即得到正确行为：

```
/organizer → 307 → /login?next=%2Forganizer
/me        → 307 → /login?next=%2Fme
/admin     → 307 → /login?next=%2Fadmin
/          → 307 → /login?next=%2F   （Supabase 未配置时 / 不是公开路由，符合 isPublicRoutePath 逻辑）
/login /terms /privacy /events/[id] → 200（公开路由不受影响）
```

（验证后已还原，未保留代码改动。）

### 影响与严重程度

- **严重程度：高（上线阻断）**。服务端鉴权门禁完全未生效；目前只有 `AppShell` 的客户端 JS 检查在做重定向，禁用 JS 或直接抓取 HTML 即可绕过页面级门禁。
- 缓解因素：所有敏感数据都由 API 按请求鉴权（见第 5 节），且未登录时页面 HTML 只含 loading 壳、不含数据，因此**没有直接的数据泄露**。但 defense-in-depth 缺了一层，且 `middleware.ts` 里的 Supabase session 刷新逻辑（`supabase.auth.getUser()` cookie 续期）同样没有运行，配置 Supabase 后会导致会话续期异常。

### 修复方式

`git mv middleware.ts src/middleware.ts`（一行改动，无需改内容）。

## 4. Cron 端点 `/api/jobs/run`（通过，部分不可测）

- 无 token：`GET /api/jobs/run` → **401** `{"ok":false,"message":"Unauthorized."}` ✅
- 错误 token（`Bearer wrong`）：→ **401** ✅
- 正确 token：`.env.local` 中**未配置 `CRON_SECRET`**，无法测试成功路径。代码审查确认：`CRON_SECRET` 缺失时 `isAuthorizedCronRequest` 恒返回 false（fail-closed，正确）；即使 token 正确，缺 `SUPABASE_SERVICE_ROLE_KEY` 也会返回 500 并提示配置缺失（合理）。

## 5. mutating API 鉴权（通过，1 处轻微备注）

未登录 POST 实测（均带 JSON body）：

| 端点 | 状态码 | 消息 |
|------|--------|------|
| `POST /api/events`（创建活动） | 401 | 请使用 Supabase 登录后再创建真实活动 |
| `POST /api/orders`（报名，带 event_id） | 401 | 请使用 Supabase 登录后再创建真实报名订单 |
| `POST /api/seats/lock` | 401 | 请使用 Supabase 登录后再选择座位 |
| `POST /api/waitlist` | 401 | 请使用 Supabase 登录后再加入候补 |
| `POST /api/events/publish` | 401 | ✅ |
| `POST /api/orders/refund` | 401 | ✅ |
| `POST /api/orders/verify` | 401 | ✅ |
| `POST /api/waitlist/invite` | 401 | ✅ |
| `POST /api/announcements` | 401 | ✅ |
| `POST /api/expenses` | 401 | ✅ |

轻微备注：`POST /api/orders` 空 body 时先返回 400「缺少 event_id」再检查鉴权（`src/app/api/orders/route.ts` 中 `eventId` 校验在 `authContext` 判空之前）。仅泄露参数结构信息，不泄露数据，严重程度低；如追求一致性可把 401 检查前置。

## 6. 登录流程（通过 — 原型模式）

- `.env.local` **未配置** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`；`/api/dev/status` 实测返回 `{"configured":false, "service_role_configured":false}`。
- 登录页逻辑（`src/app/login/page.tsx`）：`isSupabaseConfigured()` 为 true 时全部走 Supabase Auth（密码、验证码、注册、找回）；未配置时回退原型本地账号。分支实现正确。
- 原型登录门禁（`src/lib/auth.ts:96`）：`isPrototypeAuthEnabled()` = `NODE_ENV !== "production" || DEMO_MODE === "true"` — **dev 环境下原型登录可用** ✅，生产默认关闭 ✅。
- 演示账号 `miki@gatherup.local / gatherup123` 在登录页预填。

## 7. 移动端视口（通过）

- 所有页面 HTML 均含 `<meta name="viewport" content="width=device-width, initial-scale=1"/>` ✅
- `src/app/globals.css` 含响应式断点：`@media (max-width: 940px)` ×2、`@media (max-width: 620px)` ×2，390px 宽度落入 620px 断点覆盖范围 ✅
- `AppShell` 提供 `mobile-nav` 底部导航组件，配套样式存在 ✅

---

## 问题清单

| 严重程度 | 问题 | 位置 | 修复建议 |
|----------|------|------|----------|
| **高（阻断）** | `middleware.ts` 放在根目录，项目用 `src/` 结构，middleware 被 Next.js 静默忽略；服务端鉴权重定向与 Supabase session 刷新均未生效 | `middleware.ts` | `git mv middleware.ts src/middleware.ts` |
| 中 | 公开页（活动详情、条款、隐私）首屏 HTML 为纯客户端 loading 壳，无 SSR 内容，影响 SEO 与分享卡片 | `src/components/app-shell.tsx` 全局包裹 | 公开路由改为服务端渲染内容或在 AppShell 中跳过 auth-gate loading |
| 低 | `POST /api/orders` 参数校验先于 401 鉴权检查 | `src/app/api/orders/route.ts:48-54` | 将 authContext 判空移到参数校验前 |
| 低 | CSP 含 `script-src 'unsafe-inline'` | `next.config.ts` | 后续评估 nonce-based CSP |
| 备注 | 本机 3000 端口存在 IPv6 抢占（其他项目 dev server），`localhost` 可能命中错误应用 | 本地环境 | 本地测试用 `127.0.0.1` 或 `next dev -p 3001`；非项目问题 |

## 上线前建议

1. **必须**：将 `middleware.ts` 移动到 `src/middleware.ts`，并补一条自动化检查（例如 e2e 断言未登录访问 `/organizer` 返回 307）防止回归。
2. **必须**：生产环境配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`CRON_SECRET`（当前 `.env.local` 均缺失，本轮无法验证 Supabase 真实链路，配置后需重测登录与 cron 成功路径）。
3. **必须**：确认生产环境不设置 `DEMO_MODE=true`，保持原型登录关闭。
4. 建议：公开页面（`/events/[id]`、`/terms`、`/privacy`）改为服务端渲染，改善 SEO 与首屏。
5. 建议：middleware 修复后，用配置好的 Supabase 环境重跑一轮鉴权走查（登录态 cookie 续期、`/login` 已登录重定向、API 带 token 的成功路径）。
