-- GatherUp commercial v0.1 service-role grants for clean dev/staging validation.
-- Run after schema.sql when the database was created before service_role Data API
-- grants existed in the schema draft.
--
-- Why:
--   The opt-in RPC integration suite uses the Supabase service/secret key only
--   for test setup and cleanup: creating temporary Auth users, public.users,
--   event fixtures, and Storage cleanup. RLS is still validated with normal
--   authenticated user clients.
--
-- Expected:
--   Success. The final result rows should all have ok = true.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select, update on sequences to service_role;

alter default privileges in schema public
  grant execute on functions to service_role;

select
  'service_role_can_use_public_schema' as check_name,
  has_schema_privilege('service_role', 'public', 'usage') as ok
union all
select
  'service_role_can_insert_users',
  has_table_privilege('service_role', 'public.users', 'insert')
union all
select
  'service_role_can_manage_events',
  has_table_privilege('service_role', 'public.events', 'select, insert, update, delete')
union all
select
  'registration_rpc_exists',
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_registration_atomic'
  )
union all
select
  'service_role_can_execute_registration_rpc',
  exists (
    select 1
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_registration_atomic'
      and has_function_privilege('service_role', p.oid, 'execute')
  )
order by check_name;
