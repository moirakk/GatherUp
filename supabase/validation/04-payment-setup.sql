-- GatherUp commercial v0.1 demo event payment setup checks.
-- This validates organizer-collected payment setup, not platform payment capture.

select
  e.public_code,
  e.status,
  e.visibility,
  e.price_cents,
  c.method,
  c.status as collection_code_status,
  c.qr_file_url
from public.events e
join public.collection_code_versions c on c.event_id = e.id
order by e.public_code, c.created_at;

select
  r.order_number,
  r.status as registration_status,
  p.status as payment_status,
  p.amount_cents
from public.registrations r
join public.payments p on p.registration_id = r.id
order by r.order_number;
