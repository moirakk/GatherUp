# 基建加固记录（2026-07）

本轮加固吸收了外部评审里合理的工程建议，但按 GatherUp 当前代码库重新落地，避免覆盖既有 ESLint/Prettier 配置。

## 1. Supabase 迁移入口

- `supabase/migrations/` 成为后续数据库变更入口，文件名使用 `<14位时间戳>_<snake_case>.sql`。
- `20260705000001_initial_schema.sql` 与 `supabase/schema.sql` 保持一致，作为当前 schema 冻结基线。
- `20260705000002_storage.sql` 与 `supabase/storage.sql` 保持一致，作为当前 Storage/RLS 冻结基线。
- 新 DDL 不再直接改基线，应新增 timestamp migration，例如 `20260705000100_api_rate_limits.sql`。
- `tests/migrations-contract.test.mts` 保护迁移命名、基线一致性与敏感 RPC 权限边界。

## 2. 跨实例 API 限流

- 新增 `public.api_rate_limits` 表与 `public.consume_rate_limit()` RPC。
- 表启用 RLS，且对 `public`、`anon`、`authenticated` 全部 revoke。
- 服务端配置 `SUPABASE_SERVICE_ROLE_KEY` 时，`enforceRateLimit()` 使用 Postgres 固定窗口计数。
- 未配置 service role 或 RPC 临时失败时，自动回退到原来的内存限流，避免完全裸奔。

## 3. Demo/mock 边界

- 新增 `src/lib/data-mode.ts`。
- 未配置 Supabase：继续使用 mock，方便本地原型开发。
- 显式设置 `NEXT_PUBLIC_GATHERUP_DEMO_MODE=1`：即使配置 Supabase，也允许展示 demo/mock。
- 已配置 Supabase 且非 demo：数据库查询失败会记录 `[gatherup:data]` 日志，并返回空状态或 404，不再静默展示假数据。

## 4. CI 与开发脚本

- CI 增加独立 `npm run lint` 步骤，问题在 GitHub Actions 里更直观。
- 新增 Supabase CLI 辅助脚本：`db:diff`、`db:push`、`db:types`。

## 后续

- 在 clean validation Supabase 项目执行 `20260705000100_api_rate_limits.sql`。
- 运行 `tests/integration/rpc/rate-limit.test.mts`，确认 `consume_rate_limit` 在真实 Supabase 中通过 service-role 调用、拒绝匿名调用。
- 生成 Supabase 类型文件后，为 Supabase client 补 `Database` 泛型。
