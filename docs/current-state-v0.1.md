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
- 发布宣传入口和通知。
- 场地经验查询。
- 参与者历史活动查看。

长期方向是覆盖：

- 同好活动：线下观影、生咖、粉丝聚会。
- 校园活动：社团招新、讲座、比赛。
- 会议会务：论坛、闭门会、品牌活动。
- 好友聚会：聚餐、旅行、私下小聚。
- 工作坊、市集、快闪等其他活动。

## 2. 当前技术状态

当前是 v0.1 前端原型加商业化后端基础接入阶段，并已经开始从 mock 数据迁移到真实 Supabase 读取和受控写入。商业化 v0.1 的关键产品决策、schema/seed/Storage 草案、服务层契约、静态契约测试、真实 Supabase 只读预检/覆盖率审计、干净 dev/staging Supabase 执行验证、公开活动读取适配、Supabase SSR middleware 鉴权、API Bearer/SSR cookie 双路径鉴权、原子报名 RPC 调用、首条付款凭证 Storage 上传链路、付款审核 RPC 草案和座位锁 RPC 草案已经推进完成一轮。

当前仓库应按两层理解：

- 已实现层：Next.js 前端原型、mock/local 数据流程、公开活动 Supabase 读取适配、Supabase 账号适配、Supabase SSR middleware 路由保护、Bearer/SSR cookie 双路径 API 认证、原子报名订单创建、初始付款凭证 Storage 上传链路、商业化 SQL/Storage 草案、文档源头和静态契约测试。
- 目标层：商业化 v0.1，需要真实 Supabase 执行、服务层事务、Storage 上传、权限实测、退款审核/凭证、后台和完整审计日志写入。

已使用：

- Next.js App Router。
- TypeScript。
- React。
- 全局 CSS。
- lucide-react 图标。
- mock 数据。
- Supabase JavaScript 客户端依赖。
- Supabase SQL 草案。
- Supabase Storage policy 草案。
- Supabase Auth 适配层。
- Supabase 用户资料同步适配层。
- 商业化 v0.1 PRD。
- 商业化 v0.1 决策日志。
- 商业化 v0.1 服务层契约。
- Auth/schema/Storage 文档和静态契约测试。
- Supabase live project preflight 和只读覆盖率审计日志。
- GitHub 仓库介绍建议。

暂未接入：

- 大部分真实数据库读写。
- 邮箱验证码服务。
- 端到端真实图片上传和 Storage 策略执行回归。
- 正式支付。
- 完整正式权限校验。
- 完整服务端事务/API。

Supabase live 状态：

- 已恢复 live `gatherup` Supabase 项目。
- 已执行只读 preflight，确认该项目不是空库。
- 已执行只读覆盖率审计，确认该项目是部分初始化库：30 个目标表中已有 15 个，39 个目标 type 中已有 15 个，12 个目标函数中已有 9 个，8 个目标 Storage bucket 均未创建。
- 不能把完整 `supabase/schema.sql` 直接跑到该 live 项目。
- 已创建干净 dev/staging Supabase 项目 `gatherup-commercial-v01-validation`，项目 ref 为 `oxbrxkllftyevlzmiydt`。
- 已在干净 dev/staging 项目执行 `schema.sql`、`seed.sql` 和修复后的 `storage.sql`。
- `storage.sql` 在真实执行时暴露出旧枚举值问题，已修复为当前 schema 中的 `activity_material_visibility = 'participant'`。
- schema 已补充匿名公开读取授权：匿名用户只能读取公开活动详情所需的 `events`、已发布 `announcements`、参与者可见 `activity_materials`，不能读取报名、付款、退款等敏感表。
- 已新增 `supabase/validation/06-public-read-grants.sql` 和 `07-clean-dev-post-execution-summary.sql`，用于把已建好的 dev/staging 库同步到最新授权口径并汇总后置验证结果。
- 因本地系统拒绝写入系统剪贴板授权，暂未能在 Supabase SQL Editor 继续执行 06/07 两个后置脚本；下一步恢复授权或由用户手动运行后记录结果。

真实数据接入状态：

- `/` 活动广场已改为 Server Component，通过 `getPublicEvents()` 优先读取 Supabase `events` 中 `visibility = 'public'` 的活动；Supabase 未配置、查询失败或空结果时回退 mock 数据。
- `/events/[eventId]` 活动详情已通过 `getPublicEventDetail()` 优先读取 Supabase，可用 UUID 或 `public_code` 查找；未公开但 link-only 的活动由数据库 RLS 控制直链可见。
- 当前 Supabase 读取只覆盖公开展示面：活动基本信息和已发布通知。报名人数、付款数、选座数、组织者公开资料等仍需后续服务层和权限设计后再接入。
- 已新增第一批受控写入/导出 API：活动创建、报名订单、付款审核、核销、名单导出、财务导出。它们要求 Supabase 登录态；主办敏感操作不再信任原型 cookie。
- middleware 已迁移到 `@supabase/ssr`：配置 Supabase 后，页面路由通过 `supabase.auth.getUser()` 验证真实 session，并支持 Supabase session cookie refresh；`/api/*` 由各 Route Handler 自己返回 JSON 鉴权结果。
- API Route 认证已统一到底层 helper：外部/API 客户端可继续传 Supabase Bearer token；同源浏览器请求也可使用 Supabase SSR session cookie 获取用户和 authenticated Supabase client。
- 已新增 `create_registration_atomic` 数据库 RPC 草案：通过 `public.current_app_user_id()` 获取真实用户，锁定活动行校验容量，用 `event_order_counters.current_number` 原子生成订单号，并在同一事务路径中写入 `registrations`、主参与人和 payment stub。
- `/api/orders` 已改为 authenticated Supabase client 调用 RPC；前端可附带 access token，同源浏览器请求也可走 SSR session cookie，让数据库内的 `auth.uid()` 和 `current_app_user_id()` 可用。
- 已新增 opt-in 真实 Supabase RPC 集成测试入口：`GATHERUP_RUN_RPC_INTEGRATION=1 npm run test:integration:rpc` 会创建隔离临时 Auth 用户和活动，验证 `create_registration_atomic` 的匿名拒绝、正常创建、重复报名拒绝和并发防超卖行为，并验证 `review_payment_atomic` 可审核已提交付款的订单、`check_in_order_atomic` 可核销已确认订单、退款申请/审核/凭证上传三段 RPC 可完成状态推进，最后清理测试数据。
- 已新增 `src/domain/status-machine.ts` 作为第一版统一状态机底座：覆盖报名、付款、退款和签到工作流，并用测试反查 `supabase/schema.sql` 的 enum，防止应用层状态规则和数据库契约分叉。
- 已新增 `src/domain/workflow-events.ts` 作为状态变化事件契约：合法状态跳转可统一派生 `auditAction`、`notificationType`、目标受众和风险级别，为后续通知中心、审计事件和 Dashboard 聚合打底。
- 已新增 `src/domain/notification-queue.ts` 作为通知队列契约：可把 workflow event 转成站内/邮件/微信 channel 的待投递通知项，并提供 `toNotificationDeliveryInsert()` 映射到 Supabase insert payload。
- `notification_deliveries` 已补齐 `template_key`、`title`、`body`、`metadata`、`read_at` 字段，通知队列内容可以持久化到数据库并支持站内已读状态；当前仍不实际发送外部邮件/微信消息。
- 新增 `/api/notifications`：通过统一 Supabase 认证读取当前用户站内通知和未读数，并通过 `mark_notification_deliveries_read` RPC 标记单条或全部已读，避免给普通用户开放通知正文 update 权限。
- 新增 `NotificationBell` 并接入全局 `AppShell`：Supabase session 用户可在顶栏查看未读角标、打开通知列表并一键全部已读；demo session 下安静隐藏该入口。
- `payment_proofs_mark_submitted` 触发器现在会在参与者提交付款截图时通知活动主办和具备付款管理权限的协作者，让待审核付款不再只依赖手动刷新发现。
- `review_payment_atomic` 现在会在付款审核通过/驳回的同一事务里写入参与者站内通知，避免订单状态和通知状态分裂。
- `confirm_seat_assignment_atomic` 现在会在参与者确认座位后写入站内通知，保留座位确认结果。
- `check_in_order_atomic` 现在会在现场核销成功后写入参与者站内通知，保留到场确认结果。
- `request_refund_atomic` 现在会在参与者发起退款申请后通知活动主办和具备退款处理权限的协作者，让退款待审核不再依赖手动刷新发现。
- `review_refund_request_atomic` 现在会在退款审核通过/驳回的同一事务里写入参与者站内通知，补齐退款纠纷高发链路的结果告知。
- `record_refund_proof_atomic` 现在会在主办上传退款打款凭证后写入参与者站内通知，提醒用户查看凭证并继续确认收款。
- 付费报名现在拆成三步真实链路：先用 RPC 创建报名订单和 payment stub；再由浏览器使用用户 Supabase session 上传付款截图到私有 `payment-proofs` bucket；最后调用 `/api/orders/payment-proof` 写入 `payment_proofs` 并把订单推进到待审核。
- 新增 `/api/orders/payment-proof`：要求通过统一 Supabase 认证 helper 识别当前用户，验证当前用户拥有该 registration，验证 payment 属于该 registration，并校验 Storage path 必须匹配 `{event_id}/{registration_id}/{payment_id}/{filename}`。
- 付款审核已新增 `review_payment_atomic` RPC 草案：在数据库函数内校验当前用户具备活动付款管理权限，锁定 registration/payment，更新 registration、payment 和 payment_proofs，并写入 `audit_logs`。`/api/orders/review` 已改为 authenticated Supabase client 调用该 RPC。
- 选座已新增第一批 RPC 草案、API 入口和订单详情页真实选座面板：`expire_seat_locks_for_event`、`create_seat_lock_atomic` 和 `confirm_seat_assignment_atomic`，以及 `/api/seats/lock`、`/api/seats/confirm`。它们用于释放过期锁、创建座位锁、确认座位分配。当前仍需要在真实 Supabase 用户 session 下验证。
- 核销已新增 `check_in_order_atomic` RPC 草案：现场人员通过 `/api/orders/verify` 提交核销码，数据库函数内校验活动管理权限，更新订单和参与人签到状态，写入 `check_ins` 和 `audit_logs`。
- 退款已新增申请、审核、凭证上传三段 RPC/API 草案：`request_refund_atomic` + `/api/orders/refund` 允许参与者为自己的已确认订单申请退款；`review_refund_request_atomic` + `/api/orders/refund/review` 允许主办/财务/管理员审核通过或驳回；`record_refund_proof_atomic` + `/api/orders/refund/proof` 允许退款负责人提交私有 `refund-proofs` 打款凭证并推进到 `proof_uploaded`。数据库函数会同步订单/付款/退款状态并写入 `audit_logs`。参与者确认收款和争议处理仍需继续补齐。
- 主办敏感 API 已从原型 cookie 身份切换到 Supabase Bearer/SSR cookie 统一验证：活动创建、付款审核、核销、名单导出和财务导出不再信任可被客户端伪造的 `gatherup_id` cookie。
- 这些 API/RPC 仍是早期集成层：付款凭证 Storage 链路、付款审核 RPC、座位锁 RPC、核销 RPC 和退款申请/审核 RPC 还需要在干净 Supabase 项目中用真实用户 session 做端到端验证；waitlist 和完整 RLS 行为实测仍需要继续补齐。

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
npm test
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

- `/login`：登录、注册、验证码、找回入口；未配置 Supabase 时使用本地原型账号，配置后优先走 Supabase Auth。
- `/onboarding`：首次资料补全。
- `/me`：我的活动和账号中心。
- `/me/orders/[orderNumber]`：订单详情。

参与者侧：

- `/`：活动广场。
- `/events/[eventId]`：活动详情，包含当前参与者下一步、已发布通知和活动物料展示。
- `/events/[eventId]/register`：报名、数调、地点投票、付款截图、选座流程原型，支持 `step` 深链进入数调、报名、付款或选座入口。

组织者侧：

- `/organizer`：组织工作台，包含动态主行动入口和付款待处理入口。
- `/organizer/events/new`：创建活动分步向导，支持本地草稿保存、恢复、清空、草稿数据预览、发布前检查，以及通过检查后生成本地活动记录。
- `/organizer/events/[eventId]`：活动管理台，包含流程进度轨道、动态下一步行动、宣传发布、通知、数调、地点、付款审核和座位管理模块。
- `/organizer/events/[eventId]/finance`：活动财务中心。

平台公共模块：

- `/venues`：场地情报库。
- `/venues/[venueId]`：场地详情。

## 5. 已确认的商业化 v0.1 方向

账号：

- 不区分参与者账号和组织者账号。
- 同一个账号既可以参与活动，也可以创建活动。
- 邮箱是全球账号底座。
- 邮箱密码和邮箱验证码是第一开发主线。
- 微信登录预留入口和数据模型，商业化正式发布前接入。
- GatherUp ID 是公开用户 ID，用于同行人、现场核验、组织者查询和客服。
- GatherUp ID 最多允许修改两次。
- 昵称允许重复，关键场景必须同时显示 GatherUp ID。

活动：

- 第一优先场景是同好活动：线下观影、生咖、粉丝聚会。
- 新活动默认仅链接可见，不默认进入活动广场。
- 通过链接访问活动详情时，未登录用户可以看到基础详情。
- 报名、订单、付款、选座、退款和投诉必须登录。
- 每个活动有内部 ID 和公开活动 ID。
- 公开活动 ID 用于搜索、分享、现场核对和客服查询。
- 一个活动可以绑定多个组织者。
- 组织者角色包括主办、联合主办、财务、现场协作和只读。
- 活动类型使用“活动场景 + 流程模板 + 自定义标签”。
- 线下观影、生咖不是平台边界，只是同好活动下的细分标签。
- 活动状态使用英文稳定枚举，UI 再映射中文展示。
- 公开且收费活动需要平台审核。
- 收费仅链接活动按金额、新组织者场次和风控规则决定是否审核。

报名和付款：

- 参与者先登录。
- 数调和地点投票是可选模块，不等同于正式报名。
- 活动详情页会根据当前阶段显示数调入口或正式报名入口。
- 报名页支持从宣传链接、订单详情等页面直接进入指定步骤。
- 每条报名生成订单编号。
- 多人报名默认要求同行人 GatherUp ID，组织者可以开启临时同行人。
- 报名后临时锁定名额，默认 30 分钟，可由组织者配置。
- 商业化 v0.1 早期采用主办方自收款，不由平台代收款。
- 活动可配置微信/支付宝等主办方收款码。
- 只有已创建待付款订单的参与者能看到收款码。
- 每个订单记录付款时展示的收款码版本。
- 一个订单可以有多条付款凭证，支持首付、补款和差额处理。
- 组织者审核付款截图，默认只有主办和财务能查看付款截图及审核付款，联合主办需额外授权。
- 必须先付款并被确认，之后才能选座。
- 退款流程需要完整记录申请、审核、线下退款、退款凭证、参与者确认和争议。
- 平台未来可以扩展平台代收款，但第一阶段不托管活动资金。

组织者认证和后台：

- 所有人可以创建免费活动。
- 收费活动需要组织者认证。
- 认证分为未认证、轻量认证、强化认证和暂停。
- 低额度收费上限、新组织者前几场收费活动审核等规则由后台配置。
- 商业化 v0.1 需要最小后台：用户查看、活动查看、组织者认证审核、活动审核、平台配置、投诉/争议和审计日志。
- 第一版后台只有超级管理员，预留运营、风控、财务和客服角色。

发布和通知：

- 组织者可以在宣传发布中心复制群公告、数调链接、报名链接和社交平台文案。
- 组织者可以维护物料展示清单，当前原型仅保存前端临时状态。
- 组织者可以在通知中心生成报名、付款、选座、成团和活动当日通知。
- 参与者活动详情页只展示已发布通知，不展示组织者草稿。
- 当前原型中，创建页通过发布检查后会先生成浏览器本地活动记录，并显示在组织工作台；接入数据库后改为写入真实活动表。
- 商业化 v0.1 需要站内通知和业务邮件通知，微信通知预留。
- 业务邮件 provider 先抽象，第一实现目标为 Resend。

财务：

- 活动支持免费、收费和 AA 记账方向；商业化主闭环优先覆盖免费和收费活动。
- 收入来自报名订单和付款审核状态。
- 组织者可以手动添加支出。
- 支出可按场地费、物料、餐饮、设备、交通、宣传、其他分类。
- 财务中心展示确认收入、待审核收入、总支出、预计结余和人均成本。
- 支出凭证可选，但缺少凭证需要标记。
- 活动财务需要覆盖收入、退款、支出、凭证状态、预计结余、人均成本和导出。

选座和签到：

- 付款确认后是否开放选座由组织者配置。
- 选座需要临时锁座，平台默认 5 分钟，可由组织者配置。
- 同一个座位必须防止重复占用。
- 商业化 v0.1 需要轻量签到。
- 现场核验第一版以订单号、GatherUp ID、昵称和座位号为主，预留二维码电子票。

场地库：

- 场地库是平台级公共模块。
- 记录各城市哪些影院、咖啡馆、会议室等空间可以承接活动。
- 场地状态包括确认可办、可能可办、暂不支持、未知待确认。
- 场地详情展示价格备注、联系建议、优势、注意事项和体验评分。
- 场地库是辅助模块，不阻塞核心商业化闭环。
- 组织者提交的场地记录先仅自己/团队可见，平台审核后进入公共场地库。

隐私和审计：

- 付款截图、退款凭证、联系方式和操作日志属于敏感信息。
- 活动结束后组织者查看付款截图默认保留 90 天，具体由后台配置。
- 用户删除账号第一版采用申请删除，不做立即硬删除。
- 所有关键操作必须写审计日志。

## 6. 当前数据和文档

核心 mock 数据：

- `src/lib/mock-data.ts`

账号逻辑：

- `src/lib/auth.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/supabase/profile.ts`

数据库草案：

- `supabase/schema.sql`
- `supabase/seed.sql`
- `supabase/storage.sql`

Supabase 接入：

- `src/lib/supabase/client.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/supabase/profile.ts`
- `.env.example`
- `docs/supabase-sql-execution-runbook-v0.1.md`

主要文档：

- `docs/index-v0.1.md`：文档索引。
- `docs/product-operating-map-v0.1.md`：商业化 v0.1 产品作战图。
- `docs/commercial-v0.1-prd.md`：商业化 v0.1 产品需求和验收标准。
- `docs/decision-log-v0.1.md`：商业化 v0.1 决策日志。
- `docs/commercial-v0.1-engineering-plan.md`：商业化 v0.1 工程实施顺序。
- `docs/schema-validation-checklist-v0.1.md`：schema、RLS、Storage 和服务层验证清单。
- `docs/service-layer-contract-v0.1.md`：商业化 v0.1 服务层操作契约。
- `docs/supabase-sql-execution-runbook-v0.1.md`：真实 Supabase SQL 执行手册。
- `docs/github-repository-profile-v0.1.md`：GitHub 仓库介绍、topics 和 public copy 建议。

## 7. 已知限制

当前仍是原型，不是正式可上线产品。

限制包括：

- 注册账号保存在浏览器 localStorage，只用于原型验证。
- 未配置 Supabase 时，注册账号保存在浏览器 localStorage，只用于原型验证。
- 页面路由保护已开始迁移到 Supabase SSR session；原型 cookie 仍保留给部分本地 UI 状态和未完全迁移的组件，不再作为正式主办 API 权限依据。
- 已配置 Supabase 时，资料补全页和账号中心可以更新 `users` 表；未配置时仍使用本地原型。
- 付款截图、退款凭证、支出凭证和收款码已有 Storage SQL 草案，但还没有在真实 Supabase 项目中执行。
- 创建活动分步向导已支持本地草稿保存和发布前检查，但还没有写入数据库。
- 宣传物料、通知发布和报名提醒当前仍是前端原型状态，没有写入数据库或发送真实消息。
- 报名、付款、选座还没有写入数据库。
- 权限规则目前主要在文档和 SQL 草案里，前端没有真实后端校验。
- 场地库数据是示例数据，不是真实审核后的数据。

## 8. 推荐下一步

第一优先级：

- 完成 Auth foundation：真实 Supabase Session 策略、路由保护、用户资料同步和 `/dev/status` 检查。
- 在干净 Supabase 项目执行 `GATHERUP_RUN_RPC_INTEGRATION=1 npm run test:integration:rpc`，记录报名创建、付款审核和核销 RPC 的端到端验证结果。
- 将商业化 v0.1 PRD 转成数据库 schema、枚举、索引、RLS 和服务层任务。
- 明确组织者认证、活动审核、订单、付款凭证、退款、座位锁、审计日志和后台所需表结构。

第二优先级：

- 把活动创建、报名、订单、付款凭证、退款和选座接到真实数据库。
- 接入 Storage：活动封面、活动物料、付款截图、退款凭证和支出凭证。
- 实现真实组织者权限、管理员权限和审计日志。

第三优先级：

- 实现业务邮件通知、导出权限、轻量签到、投诉入口和最小后台。
- 场地库提交和审核流。
- 移动端参与者路径和桌面组织者路径打磨。

## 9. 当前 Git 状态说明

截至本文件整理时，最近完成模块包括：

- 账号注册原型。
- 场地情报库。
- 活动 ID 和多组织者绑定。
- 组织者财务中心。
- 宣传发布中心。
- 通知中心。
- 参与者活动物料展示、提醒入口和订单下一步动作。

如果本地 `main` 显示领先远端，需要在 GitHub Desktop 中点击 `Push origin` 同步。
