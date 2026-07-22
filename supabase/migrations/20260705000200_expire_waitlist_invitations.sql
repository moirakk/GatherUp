-- Waitlist invitation expiry cleanup, invoked by the Vercel Cron job at
-- /api/jobs/run. Access model: service-role only, matching the rate-limit
-- migration's pattern for background maintenance RPCs.

create or replace function public.expire_waitlist_invitations()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_expired_count integer := 0;
  v_entry record;
begin
  for v_entry in
    select
      wl.id as waitlist_entry_id,
      wl.event_id,
      wl.user_id,
      wl.desired_quantity,
      wl.priority_position,
      e.name as event_name
    from public.waitlist_entries wl
    join public.events e on e.id = wl.event_id
    where wl.status = 'invited'
      and wl.invitation_expires_at is not null
      and wl.invitation_expires_at < v_now
    order by wl.invitation_expires_at
    for update of wl
  loop
    update public.waitlist_entries
    set
      status = 'expired',
      updated_at = v_now
    where id = v_entry.waitlist_entry_id;

    insert into public.audit_logs (
      actor_id,
      actor_role,
      event_id,
      target_type,
      target_id,
      action,
      risk_level,
      before_snapshot,
      after_snapshot,
      metadata
    ) values (
      null,
      'system',
      v_entry.event_id,
      'waitlist_entry',
      v_entry.waitlist_entry_id,
      'waitlist.expired',
      'low',
      jsonb_build_object('status', 'invited'),
      jsonb_build_object('status', 'expired'),
      jsonb_build_object(
        'waitlistEntryId', v_entry.waitlist_entry_id,
        'desiredQuantity', v_entry.desired_quantity,
        'priorityPosition', v_entry.priority_position
      )
    );

    insert into public.notification_deliveries (
      event_id,
      recipient_id,
      channel,
      status,
      template_key,
      title,
      body,
      metadata,
      sent_at
    ) values (
      v_entry.event_id,
      v_entry.user_id,
      'in_app',
      'sent',
      'waitlist_invitation_expired',
      'Waitlist invitation expired',
      'Your waitlist invitation for ' || v_entry.event_name || ' expired before confirmation.',
      jsonb_build_object(
        'workflow', 'waitlist_invitation_expired',
        'eventId', v_entry.event_id,
        'waitlistEntryId', v_entry.waitlist_entry_id,
        'desiredQuantity', v_entry.desired_quantity,
        'priorityPosition', v_entry.priority_position
      ),
      v_now
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  return v_expired_count;
end;
$$;

revoke all on function public.expire_waitlist_invitations() from public, anon, authenticated;
grant execute on function public.expire_waitlist_invitations() to service_role;
