-- Mirrors in_app notification deliveries into pending email deliveries so the
-- Resend-backed email worker (src/lib/server/email-notifications.ts) has a
-- consumable queue. Recipients without an email address are skipped.

create or replace function public.mirror_notification_to_email()
returns trigger as $$
declare
  v_email text;
begin
  select email into v_email
  from public.users
  where id = new.recipient_id;

  if v_email is not null and length(v_email) > 0 then
    insert into public.notification_deliveries (
      announcement_id,
      event_id,
      recipient_id,
      channel,
      status,
      template_key,
      title,
      body,
      metadata
    ) values (
      new.announcement_id,
      new.event_id,
      new.recipient_id,
      'email',
      'pending',
      new.template_key,
      new.title,
      new.body,
      new.metadata
    );
  end if;

  return new;
end;
$$ language plpgsql;

create trigger notification_deliveries_mirror_email
  after insert on public.notification_deliveries
  for each row
  when (new.channel = 'in_app')
  execute function public.mirror_notification_to_email();

create index if not exists notification_deliveries_email_pending_idx
  on public.notification_deliveries(status)
  where channel = 'email';
