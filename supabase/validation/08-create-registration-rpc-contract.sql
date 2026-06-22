-- GatherUp commercial v0.1 atomic registration RPC contract.
-- Run after schema.sql has created public.create_registration_atomic.
--
-- Expected:
--   All rows should have ok = true.

with function_contract as (
  select
    p.oid,
    pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
    pg_catalog.pg_get_functiondef(p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_registration_atomic'
  limit 1
),
function_presence as (
  select exists (
    select 1
    from function_contract
    where args = 'p_event_id uuid, p_nickname text, p_contact_type contact_type, p_contact_value text, p_quantity integer, p_form_answers jsonb, p_participant_note text'
  ) as ok
),
authenticated_execute as (
  select coalesce((
    select has_function_privilege('authenticated', oid, 'execute')
    from function_contract
  ), false) as ok
),
anon_execute as (
  select coalesce((
    select has_function_privilege('anon', oid, 'execute')
    from function_contract
  ), false) as ok
)
select
  'function_exists' as check_name,
  ok,
  '{}'::jsonb as details
from function_presence
union all
select
  'authenticated_can_execute',
  ok,
  '{}'::jsonb
from authenticated_execute
union all
select
  'anon_cannot_execute',
  ok = false,
  jsonb_build_object('anon_execute', ok)
from anon_execute
union all
select
  'uses_current_app_user_id',
  coalesce((select definition like '%public.current_app_user_id()%' from function_contract), false),
  '{}'::jsonb
union all
select
  'locks_event_row',
  coalesce((select definition like '%from public.events%' and definition like '%for update%' from function_contract), false),
  '{}'::jsonb
union all
select
  'uses_event_order_counters',
  coalesce((select definition like '%public.event_order_counters%' and definition like '%current_number%' from function_contract), false),
  '{}'::jsonb
union all
select
  'avoids_stale_schema_terms',
  coalesce((
    select definition not like '%registered_count%'
      and definition not like '%ticket_price_cents%'
      and definition not like '%current_value%'
      and definition not like '%pending_payment%'
      and definition not like '%awaiting_payment_proof%'
    from function_contract
  ), false),
  '{}'::jsonb
order by check_name;
