-- GatherUp commercial v0.1 clean-project preflight.
-- Run this before any write SQL against a Supabase project.
-- Expected for a clean first-run validation database:
--   public_tables = 0
--   custom_types = 0

select
  'public_tables' as check_name,
  count(*) as existing_count,
  string_agg(tablename, ', ' order by tablename) as existing_names
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'user_auth_identities',
    'user_public_id_history',
    'events',
    'event_organizers',
    'registrations',
    'payments',
    'seats',
    'seat_assignments',
    'collection_code_versions',
    'organizer_verifications'
  )
union all
select
  'custom_types' as check_name,
  count(*) as existing_count,
  string_agg(t.typname, ', ' order by t.typname) as existing_names
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in (
    'event_category',
    'event_template',
    'event_visibility',
    'event_status',
    'registration_status',
    'payment_status',
    'seat_status',
    'auth_identity_provider'
  );
