-- GatherUp commercial v0.1 post-seed minimum count checks.
-- Run after schema.sql and seed.sql succeed.

select 'users' as check_name, count(*) as actual_count, 3 as expected_minimum from public.users
union all
select 'user_auth_identities', count(*), 3 from public.user_auth_identities
union all
select 'events', count(*), 1 from public.events
union all
select 'event_organizers', count(*), 3 from public.event_organizers
union all
select 'organizer_verifications', count(*), 1 from public.organizer_verifications
union all
select 'collection_code_versions', count(*), 1 from public.collection_code_versions
union all
select 'registrations', count(*), 2 from public.registrations
union all
select 'payments', count(*), 2 from public.payments
union all
select 'seats', count(*), 72 from public.seats
union all
select 'seat_assignments', count(*), 2 from public.seat_assignments
order by check_name;
