-- GatherUp v0.1 sample data for local demos.
-- UUIDs are fixed so prototype references can be stable.

insert into public.users (
  id,
  auth_user_id,
  public_id,
  public_id_change_count,
  name,
  email,
  preferred_locale
) values
  ('00000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'GU-MIKI', 0, '比奇堡miki', 'miki@example.com', 'zh-CN'),
  ('00000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000002', 'GU-TSUKI', 0, '月见草', 'tsuki@example.com', 'zh-CN'),
  ('00000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000003', 'GU-LIME', 0, '青柠', 'lime@example.com', 'zh-CN')
on conflict (id) do nothing;

insert into public.user_auth_identities (
  user_id,
  provider,
  provider_user_id,
  email,
  display_name,
  is_primary,
  verified_at
) values
  ('00000000-0000-0000-0000-000000000001', 'email', 'miki@example.com', 'miki@example.com', '比奇堡miki', true, now()),
  ('00000000-0000-0000-0000-000000000002', 'email', 'tsuki@example.com', 'tsuki@example.com', '月见草', true, now()),
  ('00000000-0000-0000-0000-000000000003', 'email', 'lime@example.com', 'lime@example.com', '青柠', true, now())
on conflict (provider, provider_user_id) do nothing;

insert into public.events (
  id,
  public_code,
  organizer_id,
  name,
  category,
  template,
  custom_type_label,
  city,
  venue_name,
  address,
  starts_at,
  registration_deadline,
  capacity,
  price_cents,
  description,
  payment_instructions,
  organizer_note,
  visibility,
  allow_multi_person_registration,
  max_people_per_registration,
  accept_waitlist,
  order_number_format,
  order_number_prefix,
  status
) values (
  '10000000-0000-0000-0000-000000000001',
  'GU-RYU-20260622',
  '00000000-0000-0000-0000-000000000001',
  '《坂本龙一：杰作》线下观影',
  'community',
  'seating',
  '线下观影',
  '上海',
  '百丽宫影城 环贸店',
  '上海市徐汇区淮海中路999号',
  '2026-06-22 14:30:00+09',
  '2026-06-18 23:59:00+09',
  60,
  8800,
  '同好组织的线下观影活动，付款确认后开放选座。',
  '请转账后备注订单编号，并上传付款截图。',
  '如需同行报名，请填写同行人的 GatherUp ID。',
  'public',
  true,
  4,
  true,
  'event_code_sequence',
  'RYU',
  'registration'
) on conflict (id) do nothing;

insert into public.event_organizers (
  event_id,
  user_id,
  role,
  invited_by
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'owner',
    null
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'co_host',
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'finance',
    '00000000-0000-0000-0000-000000000001'
  )
on conflict (event_id, user_id) do nothing;

insert into public.event_order_counters (event_id, current_number)
values ('10000000-0000-0000-0000-000000000001', 4)
on conflict (event_id) do nothing;

insert into public.event_finance_settings (
  event_id,
  fee_mode,
  currency,
  revenue_source,
  settlement_rule
) values (
  '10000000-0000-0000-0000-000000000001',
  'paid',
  'CNY',
  'registrations',
  '按订单实收统计收入，活动结束后根据实际支出确认结余。'
) on conflict (event_id) do nothing;

insert into public.event_expenses (
  id,
  event_id,
  category,
  title,
  amount_cents,
  status,
  paid_by,
  proof_url,
  note
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'venue',
    '百丽宫影城包场定金',
    240000,
    'paid',
    '00000000-0000-0000-0000-000000000001',
    'expense-proofs/demo/cinema-deposit-ryu.jpg',
    '工作日下午场定金，尾款按最终人数确认。'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'materials',
    '纪念票根和手幅打样',
    36800,
    'paid',
    '00000000-0000-0000-0000-000000000002',
    'expense-proofs/demo/print-proof-ryu.jpg',
    '含设计打样和首批印刷。'
  )
on conflict (id) do nothing;

insert into public.registrations (
  id,
  event_id,
  user_id,
  order_number,
  nickname,
  contact_type,
  contact_value,
  quantity,
  amount_due_cents,
  status,
  accepts_waitlist,
  participant_note
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'RYU-0001',
    '比奇堡miki',
    'wechat',
    'mikuma',
    2,
    17600,
    'confirmed',
    true,
    '希望尽量安排在中间区域。'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    'RYU-0002',
    '月见草',
    'wechat',
    'tsuki',
    1,
    8800,
    'pending',
    true,
    null
  )
on conflict (id) do nothing;

insert into public.registration_attendees (
  registration_id,
  user_id,
  public_id,
  display_name,
  is_primary
) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'GU-MIKI', '比奇堡miki', true),
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'GU-TSUKI', '月见草', false),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'GU-TSUKI', '月见草', true)
on conflict (registration_id, public_id) do nothing;

update public.payments
set
  status = 'confirmed',
  proof_url = 'payment-proofs/demo/ryu-0001.png',
  submitted_at = now(),
  confirmed_at = now(),
  reviewed_by = '00000000-0000-0000-0000-000000000001'
where registration_id = '20000000-0000-0000-0000-000000000001';

update public.payments
set
  status = 'submitted',
  proof_url = 'payment-proofs/demo/ryu-0002.png',
  submitted_at = now()
where registration_id = '20000000-0000-0000-0000-000000000002';

insert into public.seats (
  event_id,
  row_label,
  seat_number,
  display_label,
  status
)
select
  '10000000-0000-0000-0000-000000000001',
  row_label,
  seat_number,
  row_label || seat_number::text,
  case
    when row_label = 'A' and seat_number in (1, 12) then 'blocked'::seat_status
    else 'available'::seat_status
  end
from unnest(array['A', 'B', 'C', 'D', 'E', 'F']) as row_label
cross join generate_series(1, 12) as seat_number
on conflict (event_id, display_label) do nothing;

insert into public.seat_assignments (
  event_id,
  registration_id,
  attendee_id,
  order_number,
  seat_id
)
select
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  attendee.id,
  'RYU-0001',
  seat.id
from public.registration_attendees attendee
join public.seats seat on seat.display_label = case
  when attendee.public_id = 'GU-MIKI' then 'C5'
  else 'C6'
end
where attendee.registration_id = '20000000-0000-0000-0000-000000000001'
on conflict do nothing;

insert into public.announcements (
  event_id,
  title,
  body,
  status,
  published_at
) values (
  '10000000-0000-0000-0000-000000000001',
  '付款确认后开放选座',
  '请已确认付款的参与者进入订单页选择座位。',
  'published',
  now()
) on conflict do nothing;
