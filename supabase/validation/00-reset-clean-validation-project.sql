-- GatherUp commercial v0.1 clean validation reset.
--
-- DANGER:
--   This script deletes every object in the public schema.
--   Run it only in the disposable clean dev/staging validation project:
--   gatherup-commercial-v01-validation / oxbrxkllftyevlzmiydt.
--
-- It intentionally does not touch Supabase-managed schemas such as auth,
-- storage, realtime, graphql, vault, or extensions.
--
-- Expected:
--   Success. No rows returned.
--
-- After this reset, run:
--   1. supabase/schema.sql
--   2. supabase/seed.sql
--   3. supabase/storage.sql
--   4. supabase/validation/06-public-read-grants.sql
--   5. supabase/validation/09-service-role-grants.sql
--   6. supabase/validation/08-create-registration-rpc-contract.sql
--   7. supabase/validation/07-clean-dev-post-execution-summary.sql

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
  grant execute on functions to authenticated;

alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to authenticated;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;

alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;
