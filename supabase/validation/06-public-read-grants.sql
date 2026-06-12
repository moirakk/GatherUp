-- GatherUp commercial v0.1 public read grants for anonymous event detail.
-- Run after schema.sql when the database was created before these grants
-- existed in the schema draft.
--
-- Expected:
--   Success. No rows returned.

grant select on public.events to anon;
grant select on public.announcements to anon;
grant select on public.activity_materials to anon;
grant execute on function public.current_app_user_id() to anon;
grant execute on function public.can_manage_event(uuid) to anon;
grant execute on function public.is_platform_admin() to anon;
