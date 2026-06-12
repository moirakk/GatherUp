-- GatherUp commercial v0.1 Supabase Storage policy draft.
-- Run this only after supabase/schema.sql succeeds because the policies call public helper functions.
-- Object paths intentionally include business IDs so Storage RLS can validate ownership and roles.

create or replace function public.storage_folder_uuid(object_name text, folder_position integer)
returns uuid as $$
declare
  folder_value text;
begin
  folder_value := (storage.foldername(object_name))[folder_position];

  if folder_value is null then
    return null;
  end if;

  return folder_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$ language plpgsql stable security definer set search_path = public, storage;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('activity-covers', 'activity-covers', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('activity-materials', 'activity-materials', false, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]),
  ('collection-codes', 'collection-codes', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]),
  ('refund-proofs', 'refund-proofs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]),
  ('expense-proofs', 'expense-proofs', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]),
  ('complaint-evidence', 'complaint-evidence', false, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]),
  ('exports', 'exports', false, 52428800, array['text/csv', 'application/json', 'application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: activity-covers/{event_id}/{filename}
drop policy if exists "activity covers readable for visible events and managers" on storage.objects;
create policy "activity covers readable for visible events and managers"
  on storage.objects for select
  using (
    bucket_id = 'activity-covers'
    and exists (
      select 1
      from public.events e
      where e.id = public.storage_folder_uuid(name, 1)
        and (e.visibility in ('public', 'unlisted') or public.can_manage_event(e.id) or public.is_platform_admin())
    )
  );

drop policy if exists "event editors can manage activity covers" on storage.objects;
create policy "event editors can manage activity covers"
  on storage.objects for all
  using (bucket_id = 'activity-covers' and public.can_edit_event(public.storage_folder_uuid(name, 1)))
  with check (bucket_id = 'activity-covers' and public.can_edit_event(public.storage_folder_uuid(name, 1)));

-- Path: activity-materials/{event_id}/{material_id}/{filename}
drop policy if exists "activity materials readable by visibility and role" on storage.objects;
create policy "activity materials readable by visibility and role"
  on storage.objects for select
  using (
    bucket_id = 'activity-materials'
    and exists (
      select 1
      from public.activity_materials m
      where m.id = public.storage_folder_uuid(name, 2)
        and m.event_id = public.storage_folder_uuid(name, 1)
        and (
          m.visibility = 'participant'
          or public.can_manage_event(m.event_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "event managers can manage activity materials" on storage.objects;
create policy "event managers can manage activity materials"
  on storage.objects for all
  using (bucket_id = 'activity-materials' and public.can_manage_event(public.storage_folder_uuid(name, 1)))
  with check (bucket_id = 'activity-materials' and public.can_manage_event(public.storage_folder_uuid(name, 1)));

-- Path: collection-codes/{event_id}/{collection_code_version_id}/{filename}
drop policy if exists "collection codes readable by payable orders and payment roles" on storage.objects;
create policy "collection codes readable by payable orders and payment roles"
  on storage.objects for select
  using (
    bucket_id = 'collection-codes'
    and exists (
      select 1
      from public.collection_code_versions c
      where c.id = public.storage_folder_uuid(name, 2)
        and c.event_id = public.storage_folder_uuid(name, 1)
        and (
          public.can_manage_event_payments(c.event_id)
          or public.is_platform_admin()
          or exists (
            select 1
            from public.registrations r
            where r.event_id = c.event_id
              and r.collection_code_version_id = c.id
              and r.user_id = public.current_app_user_id()
              and r.status in ('awaiting_payment', 'payment_rejected_resubmittable', 'partial_paid_needs_topup')
          )
        )
    )
  );

drop policy if exists "payment roles can manage collection code files" on storage.objects;
create policy "payment roles can manage collection code files"
  on storage.objects for all
  using (bucket_id = 'collection-codes' and public.can_manage_event_payments(public.storage_folder_uuid(name, 1)))
  with check (bucket_id = 'collection-codes' and public.can_manage_event_payments(public.storage_folder_uuid(name, 1)));

-- Path: payment-proofs/{event_id}/{registration_id}/{payment_id}/{filename}
drop policy if exists "participants can upload own payment proof files" on storage.objects;
create policy "participants can upload own payment proof files"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and exists (
      select 1
      from public.payments p
      join public.registrations r on r.id = p.registration_id
      where p.id = public.storage_folder_uuid(name, 3)
        and r.id = public.storage_folder_uuid(name, 2)
        and r.event_id = public.storage_folder_uuid(name, 1)
        and r.user_id = public.current_app_user_id()
        and r.status in ('awaiting_payment', 'payment_rejected_resubmittable', 'partial_paid_needs_topup')
    )
  );

drop policy if exists "payment proof files readable by owner and payment roles" on storage.objects;
create policy "payment proof files readable by owner and payment roles"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and exists (
      select 1
      from public.payments p
      join public.registrations r on r.id = p.registration_id
      where p.id = public.storage_folder_uuid(name, 3)
        and r.id = public.storage_folder_uuid(name, 2)
        and r.event_id = public.storage_folder_uuid(name, 1)
        and (
          r.user_id = public.current_app_user_id()
          or public.can_manage_event_payments(r.event_id)
          or public.is_platform_admin()
        )
    )
  );

-- Path: refund-proofs/{event_id}/{refund_request_id}/{filename}
drop policy if exists "refund roles can upload refund proof files" on storage.objects;
create policy "refund roles can upload refund proof files"
  on storage.objects for insert
  with check (
    bucket_id = 'refund-proofs'
    and exists (
      select 1
      from public.refund_requests rr
      join public.registrations r on r.id = rr.registration_id
      where rr.id = public.storage_folder_uuid(name, 2)
        and r.event_id = public.storage_folder_uuid(name, 1)
        and (public.can_handle_event_refunds(r.event_id) or public.is_platform_admin())
    )
  );

drop policy if exists "refund proof files readable by owner refund roles and admins" on storage.objects;
create policy "refund proof files readable by owner refund roles and admins"
  on storage.objects for select
  using (
    bucket_id = 'refund-proofs'
    and exists (
      select 1
      from public.refund_requests rr
      join public.registrations r on r.id = rr.registration_id
      where rr.id = public.storage_folder_uuid(name, 2)
        and r.event_id = public.storage_folder_uuid(name, 1)
        and (
          r.user_id = public.current_app_user_id()
          or public.can_handle_event_refunds(r.event_id)
          or public.is_platform_admin()
        )
    )
  );

-- Path: expense-proofs/{event_id}/{expense_id}/{filename}
drop policy if exists "finance roles can manage expense proof files" on storage.objects;
create policy "finance roles can manage expense proof files"
  on storage.objects for all
  using (bucket_id = 'expense-proofs' and public.can_manage_event_finance(public.storage_folder_uuid(name, 1)))
  with check (bucket_id = 'expense-proofs' and public.can_manage_event_finance(public.storage_folder_uuid(name, 1)));

-- Path: complaint-evidence/{complaint_id}/{filename}
drop policy if exists "complaint evidence readable by submitter admins and event managers" on storage.objects;
create policy "complaint evidence readable by submitter admins and event managers"
  on storage.objects for select
  using (
    bucket_id = 'complaint-evidence'
    and exists (
      select 1
      from public.complaints c
      where c.id = public.storage_folder_uuid(name, 1)
        and (
          c.submitted_by = public.current_app_user_id()
          or public.is_platform_admin()
          or (c.event_id is not null and public.can_manage_event(c.event_id))
        )
    )
  );

drop policy if exists "complaint submitters can upload complaint evidence" on storage.objects;
create policy "complaint submitters can upload complaint evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'complaint-evidence'
    and exists (
      select 1
      from public.complaints c
      where c.id = public.storage_folder_uuid(name, 1)
        and c.submitted_by = public.current_app_user_id()
    )
  );

-- Path: exports/{event_id}/{export_job_id}/{filename}
drop policy if exists "export files readable by requester event managers and admins" on storage.objects;
create policy "export files readable by requester event managers and admins"
  on storage.objects for select
  using (
    bucket_id = 'exports'
    and exists (
      select 1
      from public.export_jobs j
      where j.id = public.storage_folder_uuid(name, 2)
        and j.event_id = public.storage_folder_uuid(name, 1)
        and (
          j.requested_by = public.current_app_user_id()
          or public.can_manage_event(j.event_id)
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "event managers can upload export files" on storage.objects;
create policy "event managers can upload export files"
  on storage.objects for insert
  with check (bucket_id = 'exports' and public.can_manage_event(public.storage_folder_uuid(name, 1)));
