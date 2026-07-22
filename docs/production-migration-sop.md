# GatherUp 生产环境 Supabase 数据库迁移执行 SOP

最后更新：2026-07-22

本 SOP 用于从零搭建 GatherUp 生产 Supabase 项目：执行 `supabase/migrations/` 下的全部迁移、配置 Storage、完成部署验证、明确回滚与备份策略。

适用前提：目标是一个**全新的（空的）生产 Supabase 项目**。当前迁移基线使用直接 `create type` / `create table` 语句，仅适用于空库首次执行，不适用于对已有 GatherUp 表结构的库做增量迁移。

相关文档：

- 干净项目验证记录：`docs/supabase-clean-project-validation-v0.1.md`
- SQL 执行 runbook（dev/staging 版）：`docs/supabase-sql-execution-runbook-v0.1.md`
- RPC 集成测试说明：`docs/rpc-integration-testing-v0.1.md`

---

## 1. 前置准备

### 1.1 创建生产 Supabase 项目

1. 在 Supabase Dashboard 创建新项目：
   - 环境定位：production，独立于 dev / 验证项目（历史验证项目 `gatherup-commercial-v01-validation` 仅用于一次性验证，禁止复用为生产）。
   - Region：按主要用户地域选择（此前验证文档建议日本/亚洲用户优先 Tokyo）。
   - 数据库密码：使用密码管理器生成并保存，不写入仓库。
2. 项目创建后确认：
   - Auth：启用 Email provider（`user_auth_identities` 的 `provider = 'email'` 依赖此项）。
   - Storage：已启用（迁移会向 `storage.buckets` 插入 8 个 bucket）。
   - 记录 Project Ref（后续 CLI 与环境变量使用）。
3. 本地代码预检（在仓库根目录执行）：

   ```bash
   npm run verify   # lint + node --test + typecheck
   npm run build
   ```

   全部通过后再触碰生产数据库。

### 1.2 环境变量清单（对照 `.env.example`）

| 变量                                   | 生产是否必须           | 说明                                                                                                                         |
| -------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | 必须                   | 生产项目 API URL（`https://<project-ref>.supabase.co`）。                                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | 必须                   | 生产项目 anon key。仅此两项允许 `NEXT_PUBLIC_` 前缀。                                                                        |
| `SUPABASE_SERVICE_ROLE_KEY`            | 按需（server-only）    | 服务端管理检查使用；严禁加 `NEXT_PUBLIC_` 前缀、严禁下发到浏览器。生产部署平台上以 secret 方式配置。                         |
| `GATHERUP_RUN_RPC_INTEGRATION`         | 禁止设置               | RPC 集成测试开关，仅对一次性 clean dev/staging 项目开启。生产不设置。                                                        |
| `GATHERUP_RPC_INTEGRATION_TARGET`      | 禁止设置               | 同上，仅 `clean-dev` 目标使用。                                                                                              |
| `GATHERUP_RPC_INTEGRATION_ALLOWED_REF` | 禁止设置               | 集成测试允许的 project ref 白名单，防止误打生产库。生产不设置。                                                              |
| `NEXT_PUBLIC_GATHERUP_DEMO_MODE`       | 禁止设置               | 显式演示模式（强制 mock 数据）。生产绝不启用；不设置时查询失败会显示为空态而非静默回退 mock。                                |
| `GATHERUP_SUPABASE_PROJECT_REF`        | 建议（本地/CI）        | 供 `npm run db:types` / Supabase CLI 使用的 project ref。                                                                    |
| `CRON_SECRET`                          | 必须                   | Vercel Cron 调用 `/api/jobs/run`（座位锁清理、候补邀请过期）的鉴权 Bearer token。缺失则后台清理任务不可用。                  |
| `RESEND_API_KEY`                       | 必须（启用邮件通知时） | Resend API key，邮件通知 worker（`src/lib/server/email-notifications.ts`）发送 `email` 渠道 `notification_deliveries` 所需。 |
| `RESEND_FROM_EMAIL`                    | 必须（启用邮件通知时） | Resend 已验证的发件地址。                                                                                                    |

要点：

- 所有 key 从生产项目的 Dashboard → Settings → API 获取，不与 dev 项目混用。
- service role key 只放服务端 secret 存储（如 Vercel 环境变量，标记为 Sensitive），不写入 `.env.local` 之外的任何被提交文件。

---

## 2. 迁移执行顺序

### 2.1 迁移文件清单（`supabase/migrations/`，按文件名时间戳顺序执行）

| 顺序 | 文件                                             | 内容                                                                                                                                                                                                                                                                      | 依赖                                                                 |
| ---- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | `20260705000001_initial_schema.sql`              | 初始 schema 基线（约 4600 行）：全部 enum 类型、30 张 public 表、索引、触发器/helper 函数（含 `create_registration_atomic`、`record_refund_proof_atomic`、`mark_payment_submitted_from_proof`）、全表 RLS 与策略、anon 公共读授权、service_role 授权及 default privileges | 空库；`pgcrypto` 扩展由文件自身创建                                  |
| 2    | `20260705000002_storage.sql`                     | Storage 基线：`storage_folder_uuid` helper、8 个私有 bucket、`storage.objects` 上全部 RLS 策略（含 payment/refund proof 的 restrictive 不可改/不可删策略）                                                                                                                | 依赖迁移 1 的 helper 函数（`can_manage_event` 等），必须在其之后执行 |
| 3    | `20260705000100_api_rate_limits.sql`             | `api_rate_limits` 限流表（RLS 开启、无策略、仅 service_role）+ `consume_rate_limit` / `prune_expired_rate_limits` RPC                                                                                                                                                     | 迁移 1                                                               |
| 4    | `20260705000101_email_notifications.sql`         | `mirror_notification_to_email` 触发器：把 `in_app` 通知镜像成 pending 的 `email` 投递记录 + 部分索引                                                                                                                                                                      | 迁移 1（`notification_deliveries`、`users` 表）                      |
| 5    | `20260705000200_expire_waitlist_invitations.sql` | `expire_waitlist_invitations()` RPC（候补邀请过期清理，仅 service_role，供 Vercel Cron 调用）                                                                                                                                                                             | 迁移 1                                                               |

注意：

- `supabase/schema.sql` 与迁移 1、`supabase/storage.sql` 与迁移 2 内容完全相同（已 diff 确认），是同一基线的两份入口。生产统一以 `migrations/` 目录为准，避免重复执行。
- **`supabase/seed.sql` 是固定 UUID 的演示数据（demo 用户/活动/订单），生产环境禁止执行。**
- 历史补丁脚本 `validation/06`、`09`、`10`、`11` 的内容已折叠进迁移 1/2 基线（已核对：anon 读授权与 service_role 授权在迁移 1 第 4573–4599 行；`mark_payment_submitted_from_proof` 含 `payment_submitted` 状态推进；`record_refund_proof_atomic` 已 select `rr.requested_by`；restrictive Storage 策略在迁移 2 第 154–209 行）。生产上无需再单独执行这些补丁。

### 2.2 方式 A：Supabase CLI（推荐）

CLI 方式会在 `supabase_migrations.schema_migrations` 表记录已执行版本，可追溯、可幂等。

```bash
# 1. 登录并关联生产项目（config.toml 中 project_id = "gatherup"）
supabase login
supabase link --project-ref <生产-project-ref>

# 2. 预演：确认将要执行的迁移列表（应恰好为上表 5 个文件）
supabase db push --dry-run

# 3. 执行
supabase db push
```

执行后核对：

```bash
supabase migration list   # 5 个版本均应为 applied 状态
```

### 2.3 方式 B：SQL Editor（无 CLI 时的人工模式）

Dashboard → SQL Editor → New query，**严格按 2.1 表格顺序**逐个文件全文粘贴、各执行一次：

1. `20260705000001_initial_schema.sql` —— 成功后再继续；失败则停止（见第 5 节）。
2. `20260705000002_storage.sql`
3. `20260705000100_api_rate_limits.sql`
4. `20260705000101_email_notifications.sql`
5. `20260705000200_expire_waitlist_invitations.sql`

人工模式注意事项：

- 每个文件执行一次即可。迁移 2、3、5 使用 `on conflict` / `if not exists` / `drop policy if exists`，基本可重入；但迁移 1 的 `create type` / `create table` 与迁移 4 的 `create trigger` 均为直接创建语句，**重复执行会报错**——若中途失败，按第 5 节处理，不要盲目整段重跑。
- SQL Editor 方式不写迁移记录表，需在部署记录中人工登记每个文件的执行时间与结果。
- 每步执行完把 Supabase 返回结果（Success / 错误全文）记入部署日志。

### 2.4 迁移完成后生成类型（可选但建议）

```bash
GATHERUP_SUPABASE_PROJECT_REF=<生产-project-ref> npm run db:types
git diff src/lib/supabase/database.types.ts   # 应无差异；有差异说明库与代码基线不一致，须排查
```

---

## 3. Storage 配置

### 3.1 执行

Storage 配置完全由迁移 2（`20260705000002_storage.sql`，与 `supabase/storage.sql` 同内容）完成，无需在 Dashboard 手工建 bucket。它做三件事：

1. 创建 `public.storage_folder_uuid(object_name, folder_position)` helper（从对象路径提取业务 UUID）。
2. `insert ... on conflict do update` 创建/校正 8 个 bucket 的 `public` / `file_size_limit` / `allowed_mime_types`。
3. 在 `storage.objects` 上创建按业务角色控制的 RLS 策略，其中 `payment-proofs`、`refund-proofs` 附加 restrictive 策略：**上传后不可更新、不可删除**。

### 3.2 8 个私有 bucket 验证

执行 `supabase/validation/05-storage-buckets.sql`（只读），期望：

- 恰好返回 8 行：`activity-covers`、`activity-materials`、`collection-codes`、`payment-proofs`、`refund-proofs`、`expense-proofs`、`complaint-evidence`、`exports`；
- 所有行 `public = false`；
- 大小上限：`activity-materials` / `complaint-evidence` / `exports` 为 52428800（50 MB），其余为 10485760（10 MB）；
- MIME 白名单与迁移文件一致（图片类 png/jpeg/webp，凭证类另含 pdf，`exports` 为 csv/json/pdf/xlsx）。

再抽查策略存在性（只读）：

```sql
select policyname, cmd, permissive
from pg_catalog.pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

重点确认 4 条 RESTRICTIVE 策略存在：`payment proof files are immutable`、`payment proof files cannot be deleted`、`refund proof files are immutable`、`refund proof files cannot be deleted`。

---

## 4. 验证步骤（`supabase/validation/` 脚本）

全部脚本在 SQL Editor 逐个执行。生产环境**只执行只读脚本**；下表标注了每个脚本在生产的适用性：

| 脚本                                                       | 性质                                     | 生产适用         | 执行时机与期望                                                                                                                                                       |
| ---------------------------------------------------------- | ---------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `00-clean-project-preflight.sql`                           | 只读                                     | 是（迁移前必跑） | 迁移前：`public_tables = 0` 且 `custom_types = 0`，否则停止（见第 5 节）                                                                                             |
| `00-reset-clean-validation-project.sql`                    | **破坏性**（drop schema public cascade） | **禁止**         | 仅限一次性验证项目，脚本内硬编码了验证项目 ref，生产永远不执行                                                                                                       |
| `01-coverage-audit.sql`                                    | 只读                                     | 是（核心）       | 迁移后：30 表 / 39 enum / 13 函数 / 8 bucket 全部 `exists = true`，且所有表 `rls_enabled = true`                                                                     |
| `02-post-seed-counts.sql`                                  | 只读                                     | 否               | 校验 demo seed 行数；生产不跑 seed，此脚本会返回 0 计数，不适用                                                                                                      |
| `03-identity-integrity.sql`                                | 只读                                     | 部分适用         | 迁移后立即执行返回 0 行属正常；首个真实用户注册后复跑，确认 `provider = 'email'`、`provider_user_id = auth_user_id::text` 且不含 `@`                                 |
| `04-payment-setup.sql`                                     | 只读                                     | 否（延后）       | 依赖已有活动与收款码数据；首个真实收费活动创建后可用其抽查                                                                                                           |
| `05-storage-buckets.sql`                                   | 只读                                     | 是（核心）       | 见 3.2                                                                                                                                                               |
| `06-public-read-grants.sql`                                | 写（grant）                              | 不需要           | 内容已包含在迁移 1；仅当审计发现 anon 授权缺失时作为修补执行                                                                                                         |
| `07-clean-dev-post-execution-summary.sql`                  | 只读                                     | 部分适用         | 汇总检查；`seed_count:*` / `identity_integrity` / `payment_*` 各行在无 seed 的生产库会为 false（预期），只需 `storage_buckets` 与 `object_coverage` 两行 `ok = true` |
| `08-create-registration-rpc-contract.sql`                  | 只读                                     | 是（核心）       | 迁移后：全部行 `ok = true`（函数签名、authenticated 可执行、anon 不可执行、行锁与订单计数器契约）                                                                    |
| `09-service-role-grants.sql`                               | 写（grant）+ 只读检查                    | 不需要           | 授权已包含在迁移 1；可只运行其末尾 `select` 段做只读复核，全部 `ok = true`                                                                                           |
| `10-payment-proof-submission-and-storage-immutability.sql` | 写（patch）                              | 不需要           | 补丁已折叠进迁移 1/2；如需复核，仅运行文件末尾的检查查询（3 行 `ok = true`）                                                                                         |
| `11-record-refund-proof-requested-by.sql`                  | 写（patch）                              | 不需要           | 补丁已折叠进迁移 1；如需复核，仅运行末尾检查查询（`ok = true`）                                                                                                      |

### 生产最小验证集（迁移完成后立即执行）

1. `01-coverage-audit.sql` —— 对象覆盖 + RLS 全开。
2. `05-storage-buckets.sql` —— 8 私有 bucket。
3. `08-create-registration-rpc-contract.sql` —— 报名 RPC 契约。
4. 3.2 节的 `pg_policies` 抽查 —— restrictive 凭证策略。
5. 应用层冒烟：部署应用（配好第 1.2 节环境变量）后，注册 1 个真实账号，确认能登录并同步进 `public.users`，然后复跑 `03-identity-integrity.sql`。
6. Cron 冒烟：手动带 `Authorization: Bearer <CRON_SECRET>` 调一次 `/api/jobs/run`，确认返回成功（内部调用 `expire_waitlist_invitations` 等仅 service_role 的 RPC）。

任一脚本结果不符合期望：记录完整输出，暂停上线流程，按第 5 节处理。

---

## 5. 回滚预案

### 5.1 基本原则

- 生产迁移是"空库首建"，最可靠的回滚单位是**整个项目/整个 public schema**，而不是逐条语句反向撤销。
- 上线前（尚无真实用户数据）与上线后（已有真实数据）的处置完全不同，先判断处于哪个阶段。

### 5.2 上线前失败（库中无真实数据）

按失败位置处理：

- **迁移 1（initial_schema）失败**：schema 处于半建状态。不要在残留对象上继续。
  1. 记录：失败文件、Supabase 完整错误、出错语句块。
  2. 首选：Dashboard 删除该生产项目并重建（或在确认无任何有价值数据的前提下重置数据库），回到干净起点。
  3. 在本地修复 SQL，`npm run verify` 通过后，先到一次性 dev 项目完整重演 5 个迁移 + 第 4 节最小验证集，通过后再回到生产从头执行。
  4. **禁止**在生产运行 `00-reset-clean-validation-project.sql` 抄近路。
- **迁移 2–5 失败**：迁移 1 的成果可保留。这几个文件大量使用 `create or replace` / `if not exists` / `on conflict` / `drop policy if exists`：
  1. 记录错误后修复对应文件；
  2. 迁移 2、3、5 修复后可整文件重跑；迁移 4 若 `create trigger notification_deliveries_mirror_email` 已建成，重跑前先 `drop trigger if exists notification_deliveries_mirror_email on public.notification_deliveries;`；
  3. 重跑后执行第 4 节最小验证集确认。

### 5.3 上线后需要变更/回退（已有真实数据）

- 一律走**新增前滚迁移**（新的带时间戳 SQL 文件），禁止改写已执行过的迁移文件。
- 高风险变更（删列、改 enum、改 RLS）前，先在 Dashboard 手动触发一次备份（或确认最近一次自动备份的时间点），并先在 dev 项目用生产 schema 重演。
- 灾难场景（数据损坏、误删）：走第 6 节的 PITR / 备份恢复，而不是手写反向 SQL。

### 5.4 应用层联动

- 数据库异常期间，如需临时下线站点，直接在部署平台（Vercel）回滚到上一个应用版本或暂停部署；**不要**用 `NEXT_PUBLIC_GATHERUP_DEMO_MODE` 掩盖生产故障。
- 恢复后按第 4 节最小验证集 + 应用冒烟重新验证。

---

## 6. 备份策略

### 6.1 Supabase 托管备份现状

- Supabase 付费计划（Pro 及以上）提供自动每日备份；免费计划无自动备份。生产项目应使用 Pro 及以上计划。
- 每日备份的恢复粒度是"回到某天的快照"，两次备份之间的数据会丢失。
- Point-in-Time Recovery（PITR，基于 WAL 归档）为付费附加能力，可恢复到分钟级任意时间点。
- 位置：Dashboard → Database → Backups 查看备份列表并可发起恢复。以 Supabase 官方文档与 Dashboard 实际选项为准，各计划细节可能调整。

### 6.2 RPO/RTO 建议

GatherUp 涉及报名订单、支付凭证、退款流转，属于弱一致可补录但纠纷成本高的数据：

- **建议 RPO ≤ 1 小时**：仅每日备份（RPO ≈ 24h）不满足支付纠纷场景，生产建议开启 PITR；若暂不开启，须接受"最多丢一天数据"并在上线决策中显式记录。
- **建议 RTO ≤ 4 小时**：包含发现故障、决策、执行恢复、按第 4 节验证集复验、应用冒烟的全流程。
- Storage 中的对象（支付/退款凭证文件）与数据库行是分离存储的：数据库恢复不会同步恢复 Storage 对象。凭证 bucket 已由 restrictive 策略禁止更新/删除，降低了误删风险；如需更强保障，定期用 service role 将关键凭证 bucket 增量导出到项目外的对象存储。

### 6.3 额外的逻辑备份（建议）

在托管备份之外，定期（如每日）用 CLI 做一份项目外的逻辑备份：

```bash
supabase db dump --linked -f backups/gatherup-prod-$(date +%Y%m%d).sql          # schema
supabase db dump --linked --data-only -f backups/gatherup-prod-data-$(date +%Y%m%d).sql
```

备份文件加密后存放在与 Supabase 不同的存储介质/账号下，保留至少 30 天。

### 6.4 恢复演练（建议节奏）

- 上线前完成 1 次完整演练；此后每季度 1 次。
- 演练流程：新建一次性 Supabase 项目 → 用最近一次逻辑备份（或托管备份导出）恢复 → 执行第 4 节最小验证集 → 用只读查询抽查关键业务表行数与最新时间戳 → 记录实际耗时，对照 RTO 目标 → 销毁演练项目。
- 每次演练输出一条记录：备份时间点、恢复耗时、验证结果、发现的问题与改进项。

---

## 7. 上线检查清单

### 前置

- [ ] 生产 Supabase 项目已创建（独立于 dev/验证项目），Project Ref 已记录
- [ ] Auth Email provider 已启用；Storage 已启用
- [ ] 计划为 Pro 及以上，自动备份可用；PITR 已开启（或已显式接受 RPO ≈ 24h 并记录）
- [ ] 本地 `npm run verify` 与 `npm run build` 通过
- [ ] `00-clean-project-preflight.sql` 返回 `public_tables = 0`、`custom_types = 0`

### 迁移执行

- [ ] 5 个迁移按顺序执行成功（CLI `supabase db push` 或 SQL Editor 逐个执行）
- [ ] CLI 模式：`supabase migration list` 显示 5 个版本 applied；SQL Editor 模式：5 个文件的执行时间与结果已登记到部署日志
- [ ] `supabase/seed.sql` **未**在生产执行
- [ ] `npm run db:types` 生成结果与仓库内 `src/lib/supabase/database.types.ts` 无差异

### 数据库验证

- [ ] `01-coverage-audit.sql`：30 表 / 39 enum / 13 函数 / 8 bucket 全部存在，所有表 RLS 开启
- [ ] `05-storage-buckets.sql`：8 行且全部 `public = false`，大小/MIME 限制正确
- [ ] `08-create-registration-rpc-contract.sql`：全部 `ok = true`
- [ ] `pg_policies` 抽查：payment/refund proof 的 4 条 RESTRICTIVE 策略存在
- [ ] （可选复核）`09` / `10` / `11` 末尾的只读检查段全部 `ok = true`

### 应用与运维

- [ ] 部署平台已配置：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`CRON_SECRET`；按需配置 `SUPABASE_SERVICE_ROLE_KEY`（Sensitive）、`RESEND_API_KEY`、`RESEND_FROM_EMAIL`
- [ ] 确认生产**未**设置：`NEXT_PUBLIC_GATHERUP_DEMO_MODE`、`GATHERUP_RUN_RPC_INTEGRATION*`
- [ ] 真实账号注册冒烟通过，`03-identity-integrity.sql` 复跑结果符合期望
- [ ] `/api/jobs/run` 携带 `CRON_SECRET` 手动调用成功；Vercel Cron 已配置
- [ ] （启用邮件时）Resend 发件域名已验证，`email` 渠道通知实测送达

### 兜底

- [ ] 回滚预案（第 5 节）已被执行人阅读，失败时的停止点明确
- [ ] 上线前备份/恢复演练已完成并记录
- [ ] 部署日志模板就绪：执行人、时间、Project Ref、每步结果、异常记录
