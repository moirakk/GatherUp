-- GatherUp commercial v0.1 Supabase/PostgreSQL schema draft.
-- This file is intended as the starting point for the real app database.
-- It still needs to be executed and tuned in a real Supabase project before production use.

create extension if not exists pgcrypto;

create type event_category as enum (
  'community',
  'campus',
  'conference',
  'private',
  'workshop',
  'market'
);

create type event_template as enum (
  'basic_registration',
  'payment_registration',
  'seating',
  'checkin',
  'time_slot',
  'record_only'
);

create type event_visibility as enum ('public', 'unlisted');
create type event_status as enum (
  'draft',
  'interest_collecting',
  'registration_scheduled',
  'registration_open',
  'registration_closed',
  'payment_reviewing',
  'seat_selection_scheduled',
  'seat_selection_open',
  'ready',
  'completed',
  'cancelled'
);

create type registration_status as enum (
  'draft',
  'pending_review',
  'awaiting_payment',
  'payment_submitted',
  'payment_rejected_resubmittable',
  'partial_paid_needs_topup',
  'confirmed',
  'waitlisted',
  'cancelled',
  'expired',
  'refunding',
  'refunded'
);

create type payment_status as enum (
  'unpaid',
  'submitted',
  'partially_confirmed',
  'topup_required',
  'confirmed',
  'rejected',
  'overpaid',
  'refunding',
  'refunded',
  'disputed'
);

create type seat_status as enum (
  'available',
  'held',
  'assigned',
  'blocked'
);

create type announcement_status as enum ('draft', 'published');
create type contact_type as enum ('wechat', 'email', 'phone', 'other');
create type order_number_format as enum (
  'gu_sequence',
  'event_code_sequence',
  'event_code_date_sequence',
  'custom_prefix_sequence'
);

create type event_organizer_role as enum (
  'owner',
  'cohost',
  'finance',
  'staff',
  'viewer'
);

create type event_fee_mode as enum ('free', 'paid', 'split');
create type event_expense_category as enum (
  'venue',
  'materials',
  'food',
  'equipment',
  'transport',
  'marketing',
  'other'
);
create type event_expense_status as enum ('budgeted', 'paid', 'reimbursable');

create type auth_identity_provider as enum (
  'email',
  'google',
  'apple',
  'phone',
  'wechat',
  'line',
  'kakao'
);

create type organizer_verification_status as enum (
  'not_applied',
  'pending',
  'light_verified',
  'enhanced_verified',
  'rejected',
  'suspended'
);

create type review_target_type as enum (
  'organizer_verification',
  'event',
  'collection_code',
  'venue_record',
  'complaint',
  'refund_dispute'
);

create type review_status as enum (
  'not_required',
  'pending',
  'approved',
  'rejected',
  'changes_requested',
  'suspended'
);

create type price_visibility as enum ('public', 'login_required');
create type location_visibility as enum (
  'public',
  'login_required',
  'registered_only',
  'confirmed_only',
  'hidden_until_announcement'
);

create type seat_selection_mode as enum (
  'none',
  'after_payment_confirmation',
  'scheduled',
  'manual'
);

create type collection_code_status as enum (
  'draft',
  'active',
  'pending_review',
  'rejected',
  'archived'
);

create type payment_proof_type as enum (
  'initial',
  'topup',
  'difference_adjustment'
);

create type payment_proof_status as enum (
  'submitted',
  'confirmed',
  'rejected',
  'voided'
);

create type refund_status as enum (
  'requested',
  'approved',
  'rejected',
  'paid_offline',
  'proof_uploaded',
  'confirmed',
  'disputed',
  'cancelled'
);

create type waitlist_status as enum (
  'waiting',
  'invited',
  'converted',
  'expired',
  'cancelled',
  'skipped'
);

create type seat_lock_status as enum (
  'active',
  'confirmed',
  'expired',
  'released'
);

create type check_in_status as enum (
  'not_arrived',
  'arrived',
  'exception'
);

create type notification_channel as enum (
  'in_app',
  'email',
  'wechat'
);

create type notification_delivery_status as enum (
  'pending',
  'sent',
  'failed',
  'cancelled'
);

create type activity_material_type as enum (
  'image',
  'pdf',
  'document_link',
  'external_link',
  'other'
);

create type activity_material_visibility as enum (
  'participant',
  'organizer_internal'
);

create type export_status as enum (
  'requested',
  'processing',
  'ready',
  'failed',
  'expired'
);

create type complaint_target_type as enum (
  'event',
  'organizer',
  'order',
  'refund',
  'notification',
  'venue'
);

create type complaint_status as enum (
  'pending',
  'in_progress',
  'resolved',
  'rejected',
  'needs_more_information'
);

create type admin_role as enum (
  'super_admin',
  'operations',
  'risk',
  'finance',
  'support'
);

create type admin_status as enum (
  'active',
  'disabled'
);

create type platform_setting_value_type as enum (
  'string',
  'integer',
  'boolean',
  'json'
);

create type audit_risk_level as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  public_id text not null unique,
  public_id_change_count integer not null default 0 check (public_id_change_count between 0 and 2),
  name text not null,
  avatar_url text,
  email text unique,
  phone text unique,
  wechat_openid text unique,
  preferred_locale text not null default 'zh-CN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_public_id_format check (public_id ~ '^GU-[A-Z0-9-]{3,18}$')
);

create table public.user_public_id_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  old_public_id text,
  new_public_id text not null,
  changed_by uuid references public.users(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now()
);

create table public.user_auth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider auth_identity_provider not null,
  provider_user_id text not null,
  email text,
  phone text,
  display_name text,
  avatar_url text,
  is_primary boolean not null default false,
  verified_at timestamptz,
  last_sign_in_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_user_id),
  unique (user_id, provider),
  constraint user_auth_identities_provider_user_id_not_empty check (length(trim(provider_user_id)) > 0)
);

create table public.organizer_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  status organizer_verification_status not null default 'not_applied',
  contact_email text,
  contact_phone text,
  community_account text,
  past_event_summary text,
  submitted_materials jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  paid_event_count integer not null default 0 check (paid_event_count >= 0),
  successful_paid_event_count integer not null default 0 check (successful_paid_event_count >= 0),
  force_review_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  public_code text not null unique,
  organizer_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  category event_category not null default 'community',
  template event_template not null default 'basic_registration',
  custom_type_label text,
  city text not null,
  country_region text,
  district text,
  venue_name text not null,
  address text,
  map_url text,
  location_note text,
  timezone text not null default 'Asia/Shanghai',
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_starts_at timestamptz,
  registration_deadline timestamptz,
  capacity integer not null check (capacity > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'CNY',
  price_visibility price_visibility not null default 'public',
  location_visibility location_visibility not null default 'public',
  description text,
  payment_instructions text,
  custom_form_config jsonb not null default '{}'::jsonb,
  payment_code_img text,
  wechat_group_img text,
  organizer_note text,
  visibility event_visibility not null default 'unlisted',
  allow_multi_person_registration boolean not null default false,
  max_people_per_registration integer not null default 1 check (max_people_per_registration > 0),
  allow_temporary_attendees boolean not null default false,
  allow_multiple_orders_per_user boolean not null default false,
  accept_waitlist boolean not null default true,
  waitlist_invitation_minutes integer not null default 30 check (waitlist_invitation_minutes > 0),
  waitlist_expiry_behavior text not null default 'exit_waitlist',
  capacity_hold_minutes integer not null default 30 check (capacity_hold_minutes > 0),
  payment_resubmission_minutes integer not null default 60 check (payment_resubmission_minutes > 0),
  seat_selection_mode seat_selection_mode not null default 'none',
  seat_selection_opens_at timestamptz,
  seat_lock_minutes integer not null default 5 check (seat_lock_minutes > 0),
  requires_registration_review boolean not null default false,
  cancellation_rule text,
  refund_rule text,
  terms_version text,
  review_status review_status not null default 'not_required',
  order_number_format order_number_format not null default 'event_code_sequence',
  order_number_prefix text,
  status event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_multi_person_rule check (
    (allow_multi_person_registration = false and max_people_per_registration = 1)
    or (allow_multi_person_registration = true and max_people_per_registration >= 2)
  ),
  constraint events_public_code_format check (public_code ~ '^GU-[A-Z0-9-]{3,28}$')
);

create table public.event_organizers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role event_organizer_role not null default 'cohost',
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  target_type review_target_type not null,
  target_id uuid not null,
  event_id uuid references public.events(id) on delete cascade,
  requester_id uuid references public.users(id) on delete set null,
  status review_status not null default 'pending',
  reason text,
  submitted_snapshot jsonb not null default '{}'::jsonb,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_code_versions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status collection_code_status not null default 'draft',
  method text not null default 'wechat',
  display_name text,
  qr_file_url text,
  instructions text,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  change_reason text,
  review_request_id uuid references public.review_requests(id) on delete set null,
  active_from timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, version_number)
);

create table public.event_finance_settings (
  event_id uuid primary key references public.events(id) on delete cascade,
  fee_mode event_fee_mode not null default 'free',
  currency text not null default 'CNY',
  revenue_source text not null default 'none',
  settlement_rule text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  category event_expense_category not null default 'other',
  title text not null,
  amount_cents integer not null check (amount_cents >= 0),
  status event_expense_status not null default 'budgeted',
  paid_by uuid references public.users(id) on delete set null,
  proof_url text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_order_counters (
  event_id uuid primary key references public.events(id) on delete cascade,
  current_number integer not null default 0 check (current_number >= 0),
  updated_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  order_number text not null,
  nickname text not null,
  contact_type contact_type not null default 'wechat',
  contact_value text not null,
  quantity integer not null check (quantity > 0),
  amount_due_cents integer not null check (amount_due_cents >= 0),
  status registration_status not null default 'awaiting_payment',
  collection_code_version_id uuid references public.collection_code_versions(id) on delete set null,
  held_until timestamptz,
  payment_due_at timestamptz,
  payment_resubmission_due_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  cancellation_reason text,
  registration_answers jsonb not null default '{}'::jsonb,
  form_answers jsonb not null default '{}'::jsonb,
  payment_screenshot_img text,
  check_in_code text not null unique default encode(gen_random_bytes(24), 'hex'),
  check_in_status check_in_status not null default 'not_arrived',
  accepted_terms_version text,
  accepted_terms_at timestamptz,
  accepts_waitlist boolean not null default true,
  participant_note text,
  organizer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, order_number)
);

create table public.registration_attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  public_id text,
  display_name text,
  is_primary boolean not null default false,
  is_temporary boolean not null default false,
  contact_note text,
  check_in_status check_in_status not null default 'not_arrived',
  checked_in_at timestamptz,
  checked_in_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, public_id),
  constraint registration_attendees_identity_required check (
    (is_temporary = false and public_id is not null)
    or (is_temporary = true and display_name is not null)
  )
);

create unique index registration_attendees_one_primary
  on public.registration_attendees(registration_id)
  where is_primary = true;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  order_number text not null,
  amount_cents integer not null check (amount_cents >= 0),
  status payment_status not null default 'unpaid',
  amount_confirmed_cents integer not null default 0 check (amount_confirmed_cents >= 0),
  amount_reported_cents integer check (amount_reported_cents is null or amount_reported_cents >= 0),
  amount_difference_cents integer not null default 0,
  proof_url text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  organizer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  proof_type payment_proof_type not null default 'initial',
  status payment_proof_status not null default 'submitted',
  file_url text not null,
  amount_reported_cents integer check (amount_reported_cents is null or amount_reported_cents >= 0),
  amount_confirmed_cents integer check (amount_confirmed_cents is null or amount_confirmed_cents >= 0),
  uploaded_by uuid not null references public.users(id) on delete restrict,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  requested_by uuid not null references public.users(id) on delete restrict,
  status refund_status not null default 'requested',
  requested_amount_cents integer not null check (requested_amount_cents >= 0),
  approved_amount_cents integer check (approved_amount_cents is null or approved_amount_cents >= 0),
  reason text not null,
  organizer_note text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  paid_at timestamptz,
  confirmed_at timestamptz,
  disputed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refund_proofs (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid not null references public.refund_requests(id) on delete cascade,
  file_url text not null,
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  uploaded_by uuid not null references public.users(id) on delete restrict,
  uploaded_at timestamptz not null default now(),
  note text
);

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  desired_quantity integer not null default 1 check (desired_quantity > 0),
  status waitlist_status not null default 'waiting',
  priority_position integer,
  note text,
  invited_at timestamptz,
  invitation_expires_at timestamptz,
  converted_registration_id uuid references public.registrations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.seats (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  row_label text not null,
  seat_number integer not null check (seat_number > 0),
  display_label text not null,
  status seat_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, display_label)
);

create table public.seat_locks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  seat_id uuid not null references public.seats(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  locked_by uuid not null references public.users(id) on delete restrict,
  status seat_lock_status not null default 'active',
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index seat_locks_one_active_per_seat
  on public.seat_locks(event_id, seat_id)
  where status = 'active';

create table public.seat_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  attendee_id uuid not null references public.registration_attendees(id) on delete cascade,
  order_number text not null,
  seat_id uuid not null references public.seats(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (event_id, seat_id),
  unique (attendee_id)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  attendee_id uuid references public.registration_attendees(id) on delete cascade,
  status check_in_status not null default 'arrived',
  checked_in_by uuid not null references public.users(id) on delete restrict,
  checked_in_at timestamptz not null default now(),
  note text
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  body text not null,
  status announcement_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid references public.announcements(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  channel notification_channel not null,
  status notification_delivery_status not null default 'pending',
  template_key text,
  title text not null default '',
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_materials (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  title text not null,
  material_type activity_material_type not null default 'other',
  visibility activity_material_visibility not null default 'participant',
  file_url text,
  external_url text,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.export_jobs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete restrict,
  export_type text not null,
  field_scope jsonb not null default '[]'::jsonb,
  status export_status not null default 'requested',
  file_url text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz
);

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  target_type complaint_target_type not null,
  target_id uuid not null,
  event_id uuid references public.events(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  submitted_by uuid not null references public.users(id) on delete restrict,
  status complaint_status not null default 'pending',
  category text not null,
  description text not null,
  evidence jsonb not null default '[]'::jsonb,
  assigned_to uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  value_type platform_setting_value_type not null default 'json',
  description text,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  role admin_role not null default 'super_admin',
  status admin_status not null default 'active',
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_role text,
  event_id uuid references public.events(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  action text not null,
  risk_level audit_risk_level not null default 'low',
  reason text,
  before_snapshot jsonb,
  after_snapshot jsonb,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index events_organizer_id_idx on public.events(organizer_id);
create index events_public_code_idx on public.events(public_code);
create index events_review_status_idx on public.events(review_status);
create index event_organizers_event_id_idx on public.event_organizers(event_id);
create index event_organizers_user_id_idx on public.event_organizers(user_id);
create index event_expenses_event_id_idx on public.event_expenses(event_id);
create index event_expenses_status_idx on public.event_expenses(status);
create index user_auth_identities_user_id_idx on public.user_auth_identities(user_id);
create index user_public_id_history_user_id_idx on public.user_public_id_history(user_id);
create index organizer_verifications_user_id_status_idx on public.organizer_verifications(user_id, status);
create index events_visibility_status_idx on public.events(visibility, status);
create index events_category_template_idx on public.events(category, template);
create index events_city_starts_at_idx on public.events(city, starts_at);
create index review_requests_target_idx on public.review_requests(target_type, target_id);
create index review_requests_status_idx on public.review_requests(status);
create index collection_code_versions_event_status_idx on public.collection_code_versions(event_id, status);
create index registrations_event_id_idx on public.registrations(event_id);
create index registrations_user_id_idx on public.registrations(user_id);
create index registrations_status_idx on public.registrations(status);
create index registrations_collection_code_version_idx on public.registrations(collection_code_version_id);
create index registrations_check_in_code_idx on public.registrations(check_in_code);
create index registrations_event_check_in_status_idx on public.registrations(event_id, check_in_status);
create index registration_attendees_registration_id_idx on public.registration_attendees(registration_id);
create index payments_status_idx on public.payments(status);
create index payment_proofs_payment_status_idx on public.payment_proofs(payment_id, status);
create index refund_requests_registration_status_idx on public.refund_requests(registration_id, status);
create index waitlist_entries_event_status_idx on public.waitlist_entries(event_id, status);
create index seats_event_id_status_idx on public.seats(event_id, status);
create index seat_locks_event_registration_idx on public.seat_locks(event_id, registration_id);
create index seat_assignments_registration_id_idx on public.seat_assignments(registration_id);
create index check_ins_event_registration_idx on public.check_ins(event_id, registration_id);
create index announcements_event_id_status_idx on public.announcements(event_id, status);
create index notification_deliveries_recipient_status_idx on public.notification_deliveries(recipient_id, status);
create index notification_deliveries_recipient_read_idx on public.notification_deliveries(recipient_id, read_at);
create index activity_materials_event_visibility_idx on public.activity_materials(event_id, visibility);
create index export_jobs_event_status_idx on public.export_jobs(event_id, status);
create index complaints_status_idx on public.complaints(status);
create index complaints_target_idx on public.complaints(target_type, target_id);
create index admin_users_user_id_status_idx on public.admin_users(user_id, status);
create index audit_logs_target_idx on public.audit_logs(target_type, target_id);
create index audit_logs_actor_created_at_idx on public.audit_logs(actor_id, created_at);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger user_auth_identities_set_updated_at
  before update on public.user_auth_identities
  for each row execute function public.set_updated_at();

create trigger organizer_verifications_set_updated_at
  before update on public.organizer_verifications
  for each row execute function public.set_updated_at();

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger event_organizers_set_updated_at
  before update on public.event_organizers
  for each row execute function public.set_updated_at();

create trigger review_requests_set_updated_at
  before update on public.review_requests
  for each row execute function public.set_updated_at();

create trigger event_finance_settings_set_updated_at
  before update on public.event_finance_settings
  for each row execute function public.set_updated_at();

create trigger event_expenses_set_updated_at
  before update on public.event_expenses
  for each row execute function public.set_updated_at();

create trigger event_order_counters_set_updated_at
  before update on public.event_order_counters
  for each row execute function public.set_updated_at();

create trigger registrations_set_updated_at
  before update on public.registrations
  for each row execute function public.set_updated_at();

create trigger registration_attendees_set_updated_at
  before update on public.registration_attendees
  for each row execute function public.set_updated_at();

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create trigger refund_requests_set_updated_at
  before update on public.refund_requests
  for each row execute function public.set_updated_at();

create trigger waitlist_entries_set_updated_at
  before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

create trigger seats_set_updated_at
  before update on public.seats
  for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

create trigger activity_materials_set_updated_at
  before update on public.activity_materials
  for each row execute function public.set_updated_at();

create trigger complaints_set_updated_at
  before update on public.complaints
  for each row execute function public.set_updated_at();

create or replace function public.prevent_public_id_over_limit()
returns trigger as $$
declare
  actor_user_id uuid;
begin
  if old.public_id is distinct from new.public_id then
    if old.public_id_change_count >= 2 then
      raise exception 'public_id can only be changed twice';
    end if;

    new.public_id_change_count = old.public_id_change_count + 1;

    select id
    into actor_user_id
    from public.users
    where auth_user_id = auth.uid()
    limit 1;

    insert into public.user_public_id_history (
      user_id,
      old_public_id,
      new_public_id,
      changed_by,
      change_reason
    ) values (
      old.id,
      old.public_id,
      new.public_id,
      actor_user_id,
      'user_update'
    );
  end if;

  return new;
end;
$$ language plpgsql;

create trigger users_prevent_public_id_over_limit
  before update of public_id on public.users
  for each row execute function public.prevent_public_id_over_limit();

create or replace function public.create_payment_for_registration()
returns trigger as $$
begin
  insert into public.payments (registration_id, order_number, amount_cents)
  values (new.id, new.order_number, new.amount_due_cents);

  return new;
end;
$$ language plpgsql;

create trigger registrations_create_payment
  after insert on public.registrations
  for each row execute function public.create_payment_for_registration();

create or replace function public.create_registration_atomic(
  p_event_id uuid,
  p_nickname text,
  p_contact_type contact_type,
  p_contact_value text,
  p_quantity integer default 1,
  p_form_answers jsonb default '{}'::jsonb,
  p_participant_note text default null
)
returns jsonb as $$
declare
  v_app_user_id uuid;
  v_user_public_id text;
  v_event record;
  v_effective_quantity integer;
  v_next_number integer;
  v_order_prefix text;
  v_order_number text;
  v_registration_id uuid;
  v_status registration_status;
  v_active_quantity integer;
begin
  v_app_user_id := public.current_app_user_id();

  if v_app_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before registering.');
  end if;

  select public_id
  into v_user_public_id
  from public.users
  where id = v_app_user_id;

  select
    id,
    public_code,
    order_number_prefix,
    capacity,
    price_cents,
    max_people_per_registration,
    allow_multi_person_registration,
    status,
    name
  into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'EVENT_NOT_FOUND', 'message', 'Event not found.');
  end if;

  if v_event.status <> 'registration_open' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'REGISTRATION_CLOSED',
      'message', 'This event is not accepting registrations.',
      'event_status', v_event.status
    );
  end if;

  if exists (
    select 1
    from public.registrations r
    where r.event_id = p_event_id
      and r.user_id = v_app_user_id
      and r.status not in ('cancelled', 'expired', 'refunded')
  ) then
    return jsonb_build_object('success', false, 'error_code', 'ALREADY_REGISTERED', 'message', 'You already have an active registration for this event.');
  end if;

  v_effective_quantity := greatest(1, coalesce(p_quantity, 1));

  if v_event.allow_multi_person_registration = false then
    v_effective_quantity := 1;
  else
    v_effective_quantity := least(v_effective_quantity, v_event.max_people_per_registration);
  end if;

  select coalesce(sum(r.quantity), 0)
  into v_active_quantity
  from public.registrations r
  where r.event_id = p_event_id
    and r.status not in ('cancelled', 'expired', 'refunded', 'waitlisted');

  if v_active_quantity + v_effective_quantity > v_event.capacity then
    return jsonb_build_object(
      'success', false,
      'error_code', 'CAPACITY_EXCEEDED',
      'message', 'Event capacity has been reached.',
      'capacity', v_event.capacity,
      'registered_quantity', v_active_quantity
    );
  end if;

  insert into public.event_order_counters (event_id, current_number)
  values (p_event_id, 1)
  on conflict (event_id)
  do update set
    current_number = public.event_order_counters.current_number + 1,
    updated_at = now()
  returning current_number into v_next_number;

  v_order_prefix := coalesce(
    nullif(trim(v_event.order_number_prefix), ''),
    regexp_replace(v_event.public_code, '^GU-', '')
  );
  v_order_number := upper(v_order_prefix) || '-' || lpad(v_next_number::text, 4, '0');
  v_registration_id := gen_random_uuid();
  v_status := case when v_event.price_cents > 0 then 'awaiting_payment'::registration_status else 'confirmed'::registration_status end;

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
    registration_answers,
    form_answers,
    participant_note,
    accepted_terms_at
  ) values (
    v_registration_id,
    p_event_id,
    v_app_user_id,
    v_order_number,
    coalesce(nullif(trim(p_nickname), ''), v_user_public_id),
    p_contact_type,
    p_contact_value,
    v_effective_quantity,
    v_event.price_cents * v_effective_quantity,
    v_status,
    coalesce(p_form_answers, '{}'::jsonb),
    coalesce(p_form_answers, '{}'::jsonb),
    nullif(trim(p_participant_note), ''),
    now()
  );

  insert into public.registration_attendees (
    registration_id,
    user_id,
    public_id,
    display_name,
    is_primary,
    is_temporary,
    check_in_status
  ) values (
    v_registration_id,
    v_app_user_id,
    v_user_public_id,
    coalesce(nullif(trim(p_nickname), ''), v_user_public_id),
    true,
    false,
    'not_arrived'
  );

  return jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'order_number', v_order_number,
    'status', v_status,
    'payment_status', case when v_event.price_cents > 0 then 'unpaid' else 'confirmed' end,
    'amount_due_cents', v_event.price_cents * v_effective_quantity,
    'quantity', v_effective_quantity,
    'event_name', v_event.name
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'The event is busy. Please retry.');
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'DUPLICATE_REGISTRATION', 'message', 'A registration conflict occurred. Please refresh and retry.');
  when others then
    raise warning '[GatherUp] create_registration_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Registration failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.create_registration_atomic(uuid, text, contact_type, text, integer, jsonb, text) from public;
grant execute on function public.create_registration_atomic(uuid, text, contact_type, text, integer, jsonb, text) to authenticated;

create or replace function public.mark_payment_submitted_from_proof()
returns trigger as $$
begin
  update public.payments
  set
    status = 'submitted',
    proof_url = new.file_url,
    submitted_at = now()
  where id = new.payment_id;

  with payment_context as (
    select
      r.event_id,
      r.order_number,
      e.name as event_name,
      e.organizer_id
    from public.registrations r
    join public.events e on e.id = r.event_id
    where r.id = new.registration_id
  ),
  recipients as (
    select organizer_id as user_id
    from payment_context
    union
    select eo.user_id
    from public.event_organizers eo
    join payment_context pc on pc.event_id = eo.event_id
    where eo.role in ('owner', 'finance')
       or (eo.role = 'cohost' and coalesce((eo.permissions ->> 'can_manage_payments')::boolean, false))
  )
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
  )
  select
    pc.event_id,
    recipients.user_id,
    'in_app',
    'sent',
    'payment_proof_submitted',
    'New payment proof needs review',
    'A participant submitted payment proof for ' || pc.event_name || '. Please review order ' || pc.order_number || '.',
    jsonb_build_object(
      'workflow', 'payment_proof_submission',
      'eventId', pc.event_id,
      'registrationId', new.registration_id,
      'paymentId', new.payment_id,
      'paymentProofId', new.id,
      'orderNumber', pc.order_number
    ),
    now()
  from payment_context pc
  join recipients on true
  where recipients.user_id is not null;

  return new;
end;
$$ language plpgsql;

create trigger payment_proofs_mark_submitted
  after insert on public.payment_proofs
  for each row execute function public.mark_payment_submitted_from_proof();

create or replace function public.review_payment_atomic(
  p_registration_id uuid default null,
  p_order_number text default null,
  p_decision text default null,
  p_review_note text default null
)
returns jsonb as $$
declare
  v_actor_id uuid;
  v_order record;
  v_now timestamptz := now();
  v_registration_status registration_status;
  v_payment_status payment_status;
  v_proof_status payment_proof_status;
begin
  v_actor_id := public.current_app_user_id();

  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before reviewing payments.');
  end if;

  if coalesce(p_decision, '') not in ('APPROVED', 'REJECTED') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_DECISION', 'message', 'Decision must be APPROVED or REJECTED.');
  end if;

  select
    r.id as registration_id,
    r.event_id,
    r.user_id,
    r.order_number,
    r.status as registration_status,
    r.amount_due_cents,
    e.name as event_name,
    p.id as payment_id,
    p.status as payment_status,
    p.amount_cents,
    p.amount_confirmed_cents
  into v_order
  from public.registrations r
  join public.events e on e.id = r.event_id
  join public.payments p on p.registration_id = r.id
  where (p_registration_id is not null and r.id = p_registration_id)
     or (p_registration_id is null and p_order_number is not null and r.order_number = p_order_number)
  for update of r, p;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'ORDER_NOT_FOUND', 'message', 'Order not found.');
  end if;

  if not (public.can_manage_event_payments(v_order.event_id) or public.is_platform_admin()) then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'Only payment managers can review this order.');
  end if;

  if v_order.registration_status <> 'payment_submitted' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_ORDER_STATUS',
      'message', 'This order is not waiting for payment review.',
      'current_status', v_order.registration_status
    );
  end if;

  v_registration_status := case
    when p_decision = 'APPROVED' then 'confirmed'::registration_status
    else 'payment_rejected_resubmittable'::registration_status
  end;
  v_payment_status := case
    when p_decision = 'APPROVED' then 'confirmed'::payment_status
    else 'rejected'::payment_status
  end;
  v_proof_status := case
    when p_decision = 'APPROVED' then 'confirmed'::payment_proof_status
    else 'rejected'::payment_proof_status
  end;

  update public.registrations
  set
    status = v_registration_status,
    confirmed_at = case when p_decision = 'APPROVED' then v_now else null end,
    organizer_note = nullif(trim(p_review_note), ''),
    updated_at = v_now
  where id = v_order.registration_id;

  update public.payments
  set
    status = v_payment_status,
    amount_confirmed_cents = case when p_decision = 'APPROVED' then v_order.amount_due_cents else 0 end,
    amount_difference_cents = case when p_decision = 'APPROVED' then 0 else v_order.amount_due_cents end,
    confirmed_at = case when p_decision = 'APPROVED' then v_now else null end,
    reviewed_by = v_actor_id,
    organizer_note = nullif(trim(p_review_note), ''),
    updated_at = v_now
  where id = v_order.payment_id;

  update public.payment_proofs
  set
    status = v_proof_status,
    amount_confirmed_cents = case when p_decision = 'APPROVED' then v_order.amount_due_cents else 0 end,
    reviewed_by = v_actor_id,
    reviewed_at = v_now,
    review_note = nullif(trim(p_review_note), ''),
    rejection_reason = case when p_decision = 'REJECTED' then nullif(trim(p_review_note), '') else null end
  where registration_id = v_order.registration_id
    and status = 'submitted';

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    reason,
    before_snapshot,
    after_snapshot,
    metadata
  ) values (
    v_actor_id,
    case when public.is_platform_admin() then 'admin' else 'payment_manager' end,
    v_order.event_id,
    'payment',
    v_order.payment_id,
    case when p_decision = 'APPROVED' then 'payment.approved' else 'payment.rejected' end,
    'medium',
    nullif(trim(p_review_note), ''),
    jsonb_build_object(
      'registration_status', v_order.registration_status,
      'payment_status', v_order.payment_status,
      'amount_confirmed_cents', v_order.amount_confirmed_cents
    ),
    jsonb_build_object(
      'registration_status', v_registration_status,
      'payment_status', v_payment_status,
      'amount_confirmed_cents', case when p_decision = 'APPROVED' then v_order.amount_due_cents else 0 end
    ),
    jsonb_build_object(
      'registration_id', v_order.registration_id,
      'order_number', v_order.order_number,
      'decision', p_decision
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
    v_order.event_id,
    v_order.user_id,
    'in_app',
    'sent',
    case when p_decision = 'APPROVED' then 'registration_confirmed' else 'payment_rejected' end,
    case when p_decision = 'APPROVED' then 'Registration confirmed' else 'Payment proof needs resubmission' end,
    case
      when p_decision = 'APPROVED' then 'Your registration for ' || v_order.event_name || ' is confirmed. Order ' || v_order.order_number || ' is ready for the next step.'
      else 'Your payment proof for ' || v_order.event_name || ' was rejected. Please update order ' || v_order.order_number || '.'
    end,
    jsonb_build_object(
      'workflow', 'payment_review',
      'decision', p_decision,
      'eventId', v_order.event_id,
      'registrationId', v_order.registration_id,
      'paymentId', v_order.payment_id,
      'orderNumber', v_order.order_number,
      'from', v_order.registration_status,
      'to', v_registration_status
    ),
    v_now
  );

  return jsonb_build_object(
    'success', true,
    'registration_id', v_order.registration_id,
    'order_number', v_order.order_number,
    'status', v_registration_status,
    'payment_status', v_payment_status
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'The payment review is busy. Please retry.');
  when others then
    raise warning '[GatherUp] review_payment_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Payment review failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.review_payment_atomic(uuid, text, text, text) from public;
grant execute on function public.review_payment_atomic(uuid, text, text, text) to authenticated;

create or replace function public.expire_seat_locks_for_event(
  p_event_id uuid default null
)
returns integer as $$
declare
  v_expired_count integer := 0;
begin
  update public.seat_locks
  set
    status = 'expired',
    released_at = now()
  where status = 'active'
    and expires_at <= now()
    and (p_event_id is null or event_id = p_event_id);

  get diagnostics v_expired_count = row_count;

  update public.seats s
  set status = 'available'
  where s.status = 'held'
    and (p_event_id is null or s.event_id = p_event_id)
    and not exists (
      select 1
      from public.seat_locks sl
      where sl.seat_id = s.id
        and sl.status = 'active'
    )
    and not exists (
      select 1
      from public.seat_assignments sa
      where sa.seat_id = s.id
    );

  return v_expired_count;
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.expire_seat_locks_for_event(uuid) from public;
grant execute on function public.expire_seat_locks_for_event(uuid) to authenticated;

create or replace function public.create_seat_lock_atomic(
  p_registration_id uuid,
  p_seat_id uuid
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_registration record;
  v_seat record;
  v_lock_id uuid;
  v_expires_at timestamptz;
begin
  v_user_id := public.current_app_user_id();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before selecting seats.');
  end if;

  select
    r.id,
    r.event_id,
    r.user_id,
    r.status as registration_status,
    r.amount_due_cents,
    e.status as event_status,
    e.seat_selection_mode,
    e.seat_lock_minutes,
    p.status as payment_status
  into v_registration
  from public.registrations r
  join public.events e on e.id = r.event_id
  left join public.payments p on p.registration_id = r.id
  where r.id = p_registration_id
  for update of r;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'REGISTRATION_NOT_FOUND', 'message', 'Registration not found.');
  end if;

  if v_registration.user_id <> v_user_id then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'You can only select seats for your own order.');
  end if;

  if v_registration.registration_status <> 'confirmed' then
    return jsonb_build_object('success', false, 'error_code', 'REGISTRATION_NOT_CONFIRMED', 'message', 'Payment must be confirmed before seat selection.');
  end if;

  if v_registration.amount_due_cents > 0 and v_registration.payment_status <> 'confirmed' then
    return jsonb_build_object('success', false, 'error_code', 'PAYMENT_NOT_CONFIRMED', 'message', 'Payment must be confirmed before seat selection.');
  end if;

  if v_registration.seat_selection_mode in ('none', 'manual') then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_SELECTION_UNAVAILABLE', 'message', 'This event is not open for self-service seat selection.');
  end if;

  if v_registration.event_status not in ('seat_selection_open', 'ready') then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_SELECTION_CLOSED', 'message', 'Seat selection is not open.');
  end if;

  perform public.expire_seat_locks_for_event(v_registration.event_id);

  select id, event_id, display_label, status
  into v_seat
  from public.seats
  where id = p_seat_id
    and event_id = v_registration.event_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_NOT_FOUND', 'message', 'Seat not found.');
  end if;

  if v_seat.status <> 'available' then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_UNAVAILABLE', 'message', 'This seat is no longer available.');
  end if;

  if exists (
    select 1
    from public.seat_assignments sa
    where sa.seat_id = p_seat_id
  ) then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_ALREADY_ASSIGNED', 'message', 'This seat is already assigned.');
  end if;

  v_lock_id := gen_random_uuid();
  v_expires_at := now() + make_interval(mins => greatest(1, v_registration.seat_lock_minutes));

  insert into public.seat_locks (
    id,
    event_id,
    seat_id,
    registration_id,
    locked_by,
    status,
    expires_at
  ) values (
    v_lock_id,
    v_registration.event_id,
    p_seat_id,
    p_registration_id,
    v_user_id,
    'active',
    v_expires_at
  );

  update public.seats
  set status = 'held'
  where id = p_seat_id;

  return jsonb_build_object(
    'success', true,
    'seat_lock_id', v_lock_id,
    'seat_id', p_seat_id,
    'seat_label', v_seat.display_label,
    'expires_at', v_expires_at
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_CONFLICT', 'message', 'This seat was just taken. Please choose another seat.');
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Seat selection is busy. Please retry.');
  when others then
    raise warning '[GatherUp] create_seat_lock_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Seat lock failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.create_seat_lock_atomic(uuid, uuid) from public;
grant execute on function public.create_seat_lock_atomic(uuid, uuid) to authenticated;

create or replace function public.confirm_seat_assignment_atomic(
  p_seat_lock_id uuid,
  p_attendee_id uuid
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_lock record;
  v_assignment_id uuid;
begin
  v_user_id := public.current_app_user_id();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before confirming seats.');
  end if;

  select
    sl.id,
    sl.event_id,
    sl.seat_id,
    sl.registration_id,
    sl.locked_by,
    sl.status as lock_status,
    sl.expires_at,
    r.order_number,
    r.user_id as registration_user_id,
    s.display_label
  into v_lock
  from public.seat_locks sl
  join public.registrations r on r.id = sl.registration_id
  join public.seats s on s.id = sl.seat_id
  where sl.id = p_seat_lock_id
  for update of sl;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'LOCK_NOT_FOUND', 'message', 'Seat lock not found.');
  end if;

  if v_lock.locked_by <> v_user_id or v_lock.registration_user_id <> v_user_id then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'You can only confirm your own seat locks.');
  end if;

  if v_lock.lock_status <> 'active' or v_lock.expires_at <= now() then
    perform public.expire_seat_locks_for_event(v_lock.event_id);
    return jsonb_build_object('success', false, 'error_code', 'LOCK_EXPIRED', 'message', 'Seat lock expired.');
  end if;

  if not exists (
    select 1
    from public.registration_attendees ra
    where ra.id = p_attendee_id
      and ra.registration_id = v_lock.registration_id
  ) then
    return jsonb_build_object('success', false, 'error_code', 'ATTENDEE_NOT_FOUND', 'message', 'Attendee not found for this order.');
  end if;

  v_assignment_id := gen_random_uuid();

  insert into public.seat_assignments (
    id,
    event_id,
    registration_id,
    attendee_id,
    order_number,
    seat_id
  ) values (
    v_assignment_id,
    v_lock.event_id,
    v_lock.registration_id,
    p_attendee_id,
    v_lock.order_number,
    v_lock.seat_id
  );

  update public.seat_locks
  set
    status = 'confirmed',
    confirmed_at = now()
  where id = p_seat_lock_id;

  return jsonb_build_object(
    'success', true,
    'seat_assignment_id', v_assignment_id,
    'seat_id', v_lock.seat_id,
    'seat_label', v_lock.display_label
  );
exception
  when unique_violation then
    return jsonb_build_object('success', false, 'error_code', 'SEAT_ASSIGNMENT_CONFLICT', 'message', 'This seat or attendee already has an assignment.');
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Seat confirmation is busy. Please retry.');
  when others then
    raise warning '[GatherUp] confirm_seat_assignment_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Seat confirmation failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.confirm_seat_assignment_atomic(uuid, uuid) from public;
grant execute on function public.confirm_seat_assignment_atomic(uuid, uuid) to authenticated;

create or replace function public.check_in_order_atomic(
  p_check_in_code text,
  p_note text default null
)
returns jsonb as $$
declare
  v_actor_id uuid;
  v_order record;
  v_checked_in_at timestamptz := now();
  v_attendee_count integer := 0;
begin
  v_actor_id := public.current_app_user_id();

  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before checking in orders.');
  end if;

  if nullif(trim(p_check_in_code), '') is null then
    return jsonb_build_object('success', false, 'error_code', 'MISSING_CHECK_IN_CODE', 'message', 'Check-in code is required.');
  end if;

  select
    r.id,
    r.event_id,
    r.order_number,
    r.status as registration_status,
    r.check_in_status
  into v_order
  from public.registrations r
  where r.check_in_code = trim(p_check_in_code)
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'CHECK_IN_CODE_NOT_FOUND', 'message', 'Invalid check-in code.');
  end if;

  if not (public.can_manage_event(v_order.event_id) or public.is_platform_admin()) then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'Only event staff can check in this order.');
  end if;

  if v_order.registration_status <> 'confirmed' then
    return jsonb_build_object('success', false, 'error_code', 'ORDER_NOT_CONFIRMED', 'message', 'This order is not confirmed.');
  end if;

  if v_order.check_in_status = 'arrived' then
    return jsonb_build_object('success', false, 'error_code', 'ALREADY_CHECKED_IN', 'message', 'This order has already been checked in.');
  end if;

  if v_order.check_in_status <> 'not_arrived' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_CHECK_IN_STATUS', 'message', 'This order cannot be checked in from its current status.');
  end if;

  update public.registrations
  set
    check_in_status = 'arrived',
    updated_at = v_checked_in_at
  where id = v_order.id;

  update public.registration_attendees
  set
    check_in_status = 'arrived',
    checked_in_at = v_checked_in_at,
    checked_in_by = v_actor_id
  where registration_id = v_order.id
    and check_in_status = 'not_arrived';

  get diagnostics v_attendee_count = row_count;

  insert into public.check_ins (
    event_id,
    registration_id,
    attendee_id,
    status,
    checked_in_by,
    checked_in_at,
    note
  )
  select
    v_order.event_id,
    v_order.id,
    ra.id,
    'arrived',
    v_actor_id,
    v_checked_in_at,
    nullif(trim(p_note), '')
  from public.registration_attendees ra
  where ra.registration_id = v_order.id;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    reason,
    before_snapshot,
    after_snapshot,
    metadata
  ) values (
    v_actor_id,
    case when public.is_platform_admin() then 'admin' else 'event_staff' end,
    v_order.event_id,
    'registration',
    v_order.id,
    'order.checked_in',
    'medium',
    nullif(trim(p_note), ''),
    jsonb_build_object('check_in_status', v_order.check_in_status),
    jsonb_build_object('check_in_status', 'arrived'),
    jsonb_build_object(
      'order_number', v_order.order_number,
      'attendee_count', v_attendee_count
    )
  );

  return jsonb_build_object(
    'success', true,
    'registration_id', v_order.id,
    'order_number', v_order.order_number,
    'status', v_order.registration_status,
    'check_in_status', 'arrived',
    'checked_in_at', v_checked_in_at,
    'attendee_count', v_attendee_count
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Check-in is busy. Please retry.');
  when others then
    raise warning '[GatherUp] check_in_order_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Check-in failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.check_in_order_atomic(text, text) from public;
grant execute on function public.check_in_order_atomic(text, text) to authenticated;

create or replace function public.request_refund_atomic(
  p_registration_id uuid,
  p_requested_amount_cents integer default null,
  p_reason text default null
)
returns jsonb as $$
declare
  v_user_id uuid;
  v_order record;
  v_payment record;
  v_refund_id uuid;
  v_requested_amount_cents integer;
begin
  v_user_id := public.current_app_user_id();

  if v_user_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before requesting a refund.');
  end if;

  if nullif(trim(coalesce(p_reason, '')), '') is null then
    return jsonb_build_object('success', false, 'error_code', 'MISSING_REASON', 'message', 'Refund reason is required.');
  end if;

  select
    r.id as registration_id,
    r.event_id,
    r.user_id,
    r.order_number,
    r.status as registration_status,
    r.amount_due_cents
  into v_order
  from public.registrations r
  where r.id = p_registration_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'REGISTRATION_NOT_FOUND', 'message', 'Registration not found.');
  end if;

  select
    p.id as payment_id,
    p.status as payment_status,
    p.amount_confirmed_cents
  into v_payment
  from public.payments p
  where p.registration_id = v_order.registration_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'PAYMENT_NOT_FOUND', 'message', 'Payment record not found.');
  end if;

  if v_order.user_id <> v_user_id then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'You can only request refunds for your own order.');
  end if;

  if v_order.registration_status not in ('confirmed', 'refunding') then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_UNAVAILABLE', 'message', 'This order is not eligible for refund requests.');
  end if;

  if v_order.amount_due_cents <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'FREE_ORDER', 'message', 'Free orders do not need a refund request.');
  end if;

  if coalesce(v_payment.amount_confirmed_cents, 0) <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'NO_CONFIRMED_PAYMENT', 'message', 'This order has no confirmed payment.');
  end if;

  if exists (
    select 1
    from public.refund_requests rr
    where rr.registration_id = v_order.registration_id
      and rr.status not in ('confirmed', 'rejected', 'cancelled')
  ) then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_ALREADY_OPEN', 'message', 'This order already has an active refund request.');
  end if;

  v_requested_amount_cents := least(
    greatest(0, coalesce(p_requested_amount_cents, v_payment.amount_confirmed_cents)),
    v_payment.amount_confirmed_cents
  );

  if v_requested_amount_cents <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_AMOUNT', 'message', 'Refund amount must be greater than zero.');
  end if;

  v_refund_id := gen_random_uuid();

  insert into public.refund_requests (
    id,
    registration_id,
    payment_id,
    requested_by,
    status,
    requested_amount_cents,
    reason
  ) values (
    v_refund_id,
    v_order.registration_id,
    v_payment.payment_id,
    v_user_id,
    'requested',
    v_requested_amount_cents,
    trim(p_reason)
  );

  update public.registrations
  set
    status = 'refunding',
    updated_at = now()
  where id = v_order.registration_id;

  update public.payments
  set
    status = 'refunding',
    updated_at = now()
  where id = v_payment.payment_id;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    reason,
    before_snapshot,
    after_snapshot,
    metadata
  ) values (
    v_user_id,
    'user',
    v_order.event_id,
    'refund_request',
    v_refund_id,
    'refund.requested',
    'medium',
    trim(p_reason),
    jsonb_build_object(
      'registration_status', v_order.registration_status,
      'payment_status', v_payment.payment_status
    ),
    jsonb_build_object(
      'registration_status', 'refunding',
      'payment_status', 'refunding',
      'refund_status', 'requested'
    ),
    jsonb_build_object(
      'registration_id', v_order.registration_id,
      'payment_id', v_payment.payment_id,
      'order_number', v_order.order_number,
      'requested_amount_cents', v_requested_amount_cents
    )
  );

  return jsonb_build_object(
    'success', true,
    'refund_request_id', v_refund_id,
    'registration_id', v_order.registration_id,
    'order_number', v_order.order_number,
    'requested_amount_cents', v_requested_amount_cents,
    'status', 'requested'
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Refund request is busy. Please retry.');
  when others then
    raise warning '[GatherUp] request_refund_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Refund request failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.request_refund_atomic(uuid, integer, text) from public;
grant execute on function public.request_refund_atomic(uuid, integer, text) to authenticated;

create or replace function public.review_refund_request_atomic(
  p_refund_request_id uuid,
  p_decision text,
  p_approved_amount_cents integer default null,
  p_organizer_note text default null
)
returns jsonb as $$
declare
  v_actor_id uuid;
  v_refund record;
  v_payment record;
  v_approved_amount_cents integer;
  v_next_refund_status refund_status;
  v_next_registration_status registration_status;
  v_next_payment_status payment_status;
  v_now timestamptz := now();
begin
  v_actor_id := public.current_app_user_id();

  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before reviewing refunds.');
  end if;

  if coalesce(p_decision, '') not in ('APPROVED', 'REJECTED') then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_DECISION', 'message', 'Decision must be APPROVED or REJECTED.');
  end if;

  select
    rr.id as refund_request_id,
    rr.registration_id,
    rr.payment_id,
    rr.requested_by,
    rr.status as refund_status,
    rr.requested_amount_cents,
    rr.approved_amount_cents,
    r.event_id,
    r.order_number,
    r.status as registration_status
  into v_refund
  from public.refund_requests rr
  join public.registrations r on r.id = rr.registration_id
  where rr.id = p_refund_request_id
  for update of rr, r;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_REQUEST_NOT_FOUND', 'message', 'Refund request not found.');
  end if;

  if v_refund.payment_id is null then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_PAYMENT_NOT_FOUND', 'message', 'Refund payment record is missing.');
  end if;

  select
    status,
    amount_confirmed_cents
  into v_payment
  from public.payments
  where id = v_refund.payment_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_PAYMENT_NOT_FOUND', 'message', 'Refund payment record is missing.');
  end if;

  if not (public.can_handle_event_refunds(v_refund.event_id) or public.is_platform_admin()) then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'Only refund managers can review this request.');
  end if;

  if v_refund.refund_status <> 'requested' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_REFUND_STATUS', 'message', 'This refund request is not waiting for review.');
  end if;

  v_approved_amount_cents := least(
    greatest(0, coalesce(p_approved_amount_cents, v_refund.requested_amount_cents)),
    v_refund.requested_amount_cents
  );

  if p_decision = 'APPROVED' and v_approved_amount_cents <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_AMOUNT', 'message', 'Approved refund amount must be greater than zero.');
  end if;

  v_next_refund_status := case
    when p_decision = 'APPROVED' then 'approved'::refund_status
    else 'rejected'::refund_status
  end;
  v_next_registration_status := case
    when p_decision = 'APPROVED' then 'refunding'::registration_status
    else 'confirmed'::registration_status
  end;
  v_next_payment_status := case
    when p_decision = 'APPROVED' then 'refunding'::payment_status
    else 'confirmed'::payment_status
  end;

  update public.refund_requests
  set
    status = v_next_refund_status,
    approved_amount_cents = case when p_decision = 'APPROVED' then v_approved_amount_cents else null end,
    organizer_note = nullif(trim(p_organizer_note), ''),
    reviewed_by = v_actor_id,
    reviewed_at = v_now,
    updated_at = v_now
  where id = v_refund.refund_request_id;

  update public.registrations
  set
    status = v_next_registration_status,
    updated_at = v_now
  where id = v_refund.registration_id;

  update public.payments
  set
    status = v_next_payment_status,
    updated_at = v_now
  where id = v_refund.payment_id;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    reason,
    before_snapshot,
    after_snapshot,
    metadata
  ) values (
    v_actor_id,
    case when public.is_platform_admin() then 'admin' else 'refund_manager' end,
    v_refund.event_id,
    'refund_request',
    v_refund.refund_request_id,
    case when p_decision = 'APPROVED' then 'refund.approved' else 'refund.rejected' end,
    'medium',
    nullif(trim(p_organizer_note), ''),
    jsonb_build_object(
      'refund_status', v_refund.refund_status,
      'registration_status', v_refund.registration_status,
      'payment_status', v_payment.status,
      'approved_amount_cents', v_refund.approved_amount_cents
    ),
    jsonb_build_object(
      'refund_status', v_next_refund_status,
      'registration_status', v_next_registration_status,
      'payment_status', v_next_payment_status,
      'approved_amount_cents', case when p_decision = 'APPROVED' then v_approved_amount_cents else null end
    ),
    jsonb_build_object(
      'registration_id', v_refund.registration_id,
      'payment_id', v_refund.payment_id,
      'order_number', v_refund.order_number,
      'decision', p_decision,
      'requested_amount_cents', v_refund.requested_amount_cents
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
    v_refund.event_id,
    v_refund.requested_by,
    'in_app',
    'sent',
    case when p_decision = 'APPROVED' then 'refund_approved' else 'refund_rejected' end,
    case when p_decision = 'APPROVED' then 'Refund approved' else 'Refund rejected' end,
    case
      when p_decision = 'APPROVED' then 'Your refund request for order ' || v_refund.order_number || ' has been approved.'
      else 'Your refund request for order ' || v_refund.order_number || ' was rejected. Check the organizer note for details.'
    end,
    jsonb_build_object(
      'workflow', 'refund_review',
      'decision', p_decision,
      'eventId', v_refund.event_id,
      'registrationId', v_refund.registration_id,
      'paymentId', v_refund.payment_id,
      'refundRequestId', v_refund.refund_request_id,
      'orderNumber', v_refund.order_number,
      'from', v_refund.refund_status,
      'to', v_next_refund_status,
      'requestedAmountCents', v_refund.requested_amount_cents,
      'approvedAmountCents', case when p_decision = 'APPROVED' then v_approved_amount_cents else null end
    ),
    v_now
  );

  return jsonb_build_object(
    'success', true,
    'refund_request_id', v_refund.refund_request_id,
    'registration_id', v_refund.registration_id,
    'order_number', v_refund.order_number,
    'status', v_next_refund_status,
    'approved_amount_cents', case when p_decision = 'APPROVED' then v_approved_amount_cents else null end
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Refund review is busy. Please retry.');
  when others then
    raise warning '[GatherUp] review_refund_request_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Refund review failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.review_refund_request_atomic(uuid, text, integer, text) from public;
grant execute on function public.review_refund_request_atomic(uuid, text, integer, text) to authenticated;

create or replace function public.record_refund_proof_atomic(
  p_refund_request_id uuid,
  p_file_url text,
  p_amount_cents integer default null
)
returns jsonb as $$
declare
  v_actor_id uuid;
  v_refund record;
  v_amount_cents integer;
  v_now timestamptz := now();
begin
  v_actor_id := public.current_app_user_id();

  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before uploading refund proof.');
  end if;

  if nullif(trim(coalesce(p_file_url, '')), '') is null then
    return jsonb_build_object('success', false, 'error_code', 'MISSING_FILE', 'message', 'Refund proof file is required.');
  end if;

  select
    rr.id as refund_request_id,
    rr.registration_id,
    rr.payment_id,
    rr.status as refund_status,
    rr.requested_amount_cents,
    rr.approved_amount_cents,
    r.event_id,
    r.order_number,
    r.status as registration_status,
    p.status as payment_status
  into v_refund
  from public.refund_requests rr
  join public.registrations r on r.id = rr.registration_id
  join public.payments p on p.id = rr.payment_id
  where rr.id = p_refund_request_id
  for update of rr, r, p;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_REQUEST_NOT_FOUND', 'message', 'Refund request not found.');
  end if;

  if not (public.can_handle_event_refunds(v_refund.event_id) or public.is_platform_admin()) then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'Only refund managers can upload refund proof.');
  end if;

  if v_refund.refund_status <> 'approved' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_REFUND_STATUS', 'message', 'Refund proof can only be uploaded after approval.');
  end if;

  v_amount_cents := coalesce(p_amount_cents, v_refund.approved_amount_cents, v_refund.requested_amount_cents);

  if v_amount_cents <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_AMOUNT', 'message', 'Refund proof amount must be greater than zero.');
  end if;

  if v_refund.approved_amount_cents is not null and v_amount_cents > v_refund.approved_amount_cents then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_AMOUNT', 'message', 'Refund proof amount cannot exceed the approved refund amount.');
  end if;

  insert into public.refund_proofs (
    refund_request_id,
    file_url,
    amount_cents,
    uploaded_by,
    uploaded_at
  ) values (
    v_refund.refund_request_id,
    trim(p_file_url),
    v_amount_cents,
    v_actor_id,
    v_now
  );

  update public.refund_requests
  set
    status = 'proof_uploaded',
    paid_at = v_now,
    updated_at = v_now
  where id = v_refund.refund_request_id;

  update public.registrations
  set
    status = 'refunding',
    updated_at = v_now
  where id = v_refund.registration_id;

  update public.payments
  set
    status = 'refunding',
    updated_at = v_now
  where id = v_refund.payment_id;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    reason,
    before_snapshot,
    after_snapshot,
    metadata
  ) values (
    v_actor_id,
    case when public.is_platform_admin() then 'admin' else 'refund_manager' end,
    v_refund.event_id,
    'refund_request',
    v_refund.refund_request_id,
    'refund.proof_uploaded',
    'medium',
    'Refund transfer proof uploaded',
    jsonb_build_object(
      'refund_status', v_refund.refund_status,
      'registration_status', v_refund.registration_status,
      'payment_status', v_refund.payment_status
    ),
    jsonb_build_object(
      'refund_status', 'proof_uploaded',
      'registration_status', 'refunding',
      'payment_status', 'refunding',
      'paid_at', v_now
    ),
    jsonb_build_object(
      'registration_id', v_refund.registration_id,
      'payment_id', v_refund.payment_id,
      'order_number', v_refund.order_number,
      'amount_cents', v_amount_cents,
      'file_url', trim(p_file_url)
    )
  );

  return jsonb_build_object(
    'success', true,
    'refund_request_id', v_refund.refund_request_id,
    'registration_id', v_refund.registration_id,
    'order_number', v_refund.order_number,
    'status', 'proof_uploaded',
    'amount_cents', v_amount_cents,
    'file_url', trim(p_file_url)
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Refund proof upload is busy. Please retry.');
  when others then
    raise warning '[GatherUp] record_refund_proof_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Refund proof upload failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.record_refund_proof_atomic(uuid, text, integer) from public;
grant execute on function public.record_refund_proof_atomic(uuid, text, integer) to authenticated;

create or replace function public.sync_seat_status_on_assignment()
returns trigger as $$
begin
  update public.seats
  set status = 'assigned'
  where id = new.seat_id;

  return new;
end;
$$ language plpgsql;

create trigger seat_assignments_sync_seat_status
  after insert on public.seat_assignments
  for each row execute function public.sync_seat_status_on_assignment();

create or replace function public.current_app_user_id()
returns uuid as $$
  select id
  from public.users
  where auth_user_id = auth.uid()
  limit 1;
$$ language sql stable security definer set search_path = public;

create or replace function public.can_manage_event(target_event_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.organizer_id = public.current_app_user_id()
  )
  or exists (
    select 1
    from public.event_organizers eo
    where eo.event_id = target_event_id
      and eo.user_id = public.current_app_user_id()
      and eo.role in ('owner', 'cohost', 'finance', 'staff')
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.can_edit_event(target_event_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.organizer_id = public.current_app_user_id()
  )
  or exists (
    select 1
    from public.event_organizers eo
    where eo.event_id = target_event_id
      and eo.user_id = public.current_app_user_id()
      and eo.role in ('owner', 'cohost')
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.can_manage_event_finance(target_event_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.organizer_id = public.current_app_user_id()
  )
  or exists (
    select 1
    from public.event_organizers eo
    where eo.event_id = target_event_id
      and eo.user_id = public.current_app_user_id()
      and eo.role in ('owner', 'cohost', 'finance')
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.can_manage_event_payments(target_event_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.organizer_id = public.current_app_user_id()
  )
  or exists (
    select 1
    from public.event_organizers eo
    where eo.event_id = target_event_id
      and eo.user_id = public.current_app_user_id()
      and (
        eo.role in ('owner', 'finance')
        or (eo.role = 'cohost' and coalesce((eo.permissions ->> 'can_manage_payments')::boolean, false))
      )
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.can_handle_event_refunds(target_event_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.events e
    where e.id = target_event_id
      and e.organizer_id = public.current_app_user_id()
  )
  or exists (
    select 1
    from public.event_organizers eo
    where eo.event_id = target_event_id
      and eo.user_id = public.current_app_user_id()
      and eo.role in ('owner', 'finance')
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_platform_admin()
returns boolean as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = public.current_app_user_id()
      and au.status = 'active'
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.mark_notification_deliveries_read(
  p_notification_id uuid default null,
  p_mark_all boolean default false
)
returns jsonb as $$
declare
  v_actor_id uuid;
  v_updated_count integer := 0;
begin
  v_actor_id := public.current_app_user_id();

  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in first.');
  end if;

  if p_mark_all then
    update public.notification_deliveries
    set read_at = now(), updated_at = now()
    where recipient_id = v_actor_id
      and channel = 'in_app'
      and read_at is null;
  else
    if p_notification_id is null then
      return jsonb_build_object('success', false, 'error_code', 'MISSING_NOTIFICATION_ID', 'message', 'Missing notification id.');
    end if;

    update public.notification_deliveries
    set read_at = now(), updated_at = now()
    where id = p_notification_id
      and recipient_id = v_actor_id
      and channel = 'in_app'
      and read_at is null;
  end if;

  get diagnostics v_updated_count = row_count;

  return jsonb_build_object('success', true, 'updated_count', v_updated_count);
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.mark_notification_deliveries_read(uuid, boolean) from public;
grant execute on function public.mark_notification_deliveries_read(uuid, boolean) to authenticated;

alter table public.users enable row level security;
alter table public.user_public_id_history enable row level security;
alter table public.user_auth_identities enable row level security;
alter table public.organizer_verifications enable row level security;
alter table public.events enable row level security;
alter table public.event_organizers enable row level security;
alter table public.review_requests enable row level security;
alter table public.collection_code_versions enable row level security;
alter table public.event_finance_settings enable row level security;
alter table public.event_expenses enable row level security;
alter table public.event_order_counters enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_attendees enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.refund_requests enable row level security;
alter table public.refund_proofs enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.seats enable row level security;
alter table public.seat_locks enable row level security;
alter table public.seat_assignments enable row level security;
alter table public.check_ins enable row level security;
alter table public.announcements enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.activity_materials enable row level security;
alter table public.export_jobs enable row level security;
alter table public.complaints enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;

-- RLS draft policies.
-- These assume users.auth_user_id maps to auth.uid().

create policy "users can read their own profile"
  on public.users for select
  using (auth.uid() = auth_user_id);

create policy "users can create their own profile"
  on public.users for insert
  with check (auth.uid() = auth_user_id);

create policy "users can update their own profile"
  on public.users for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "users can read own public id history"
  on public.user_public_id_history for select
  using (user_id = public.current_app_user_id() or public.is_platform_admin());

create policy "users can read their own auth identities"
  on public.user_auth_identities for select
  using (user_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "users can manage their own auth identities"
  on public.user_auth_identities for all
  using (user_id in (
    select id from public.users where auth_user_id = auth.uid()
  ))
  with check (user_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "users can read own organizer verification"
  on public.organizer_verifications for select
  using (user_id = public.current_app_user_id() or public.is_platform_admin());

create policy "users can submit own organizer verification"
  on public.organizer_verifications for insert
  with check (user_id = public.current_app_user_id());

create policy "users can update own pending organizer verification"
  on public.organizer_verifications for update
  using (user_id = public.current_app_user_id() or public.is_platform_admin())
  with check (user_id = public.current_app_user_id() or public.is_platform_admin());

create policy "public events are readable"
  on public.events for select
  using (visibility in ('public', 'unlisted') or public.can_manage_event(id) or public.is_platform_admin());

create policy "organizers can insert events"
  on public.events for insert
  with check (organizer_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "organizers can update own events"
  on public.events for update
  using (public.can_edit_event(id))
  with check (public.can_edit_event(id));

create policy "event organizers are visible to event members"
  on public.event_organizers for select
  using (user_id = public.current_app_user_id() or public.can_manage_event(event_id));

create policy "owners can manage event organizers"
  on public.event_organizers for all
  using (public.can_edit_event(event_id))
  with check (public.can_edit_event(event_id));

create policy "review requests visible to requester admins and event managers"
  on public.review_requests for select
  using (
    requester_id = public.current_app_user_id()
    or public.is_platform_admin()
    or (event_id is not null and public.can_manage_event(event_id))
  );

create policy "users can create review requests"
  on public.review_requests for insert
  with check (requester_id = public.current_app_user_id() or public.is_platform_admin());

create policy "admins can update review requests"
  on public.review_requests for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "collection codes visible only to payable orders and payment roles"
  on public.collection_code_versions for select
  using (
    public.can_manage_event_payments(event_id)
    or public.is_platform_admin()
    or id in (
      select r.collection_code_version_id
      from public.registrations r
      where r.user_id = public.current_app_user_id()
        and r.collection_code_version_id is not null
        and r.status in ('awaiting_payment', 'payment_rejected_resubmittable', 'partial_paid_needs_topup')
    )
  );

create policy "payment roles can manage collection codes"
  on public.collection_code_versions for all
  using (public.can_manage_event_payments(event_id) or public.is_platform_admin())
  with check (public.can_manage_event_payments(event_id) or public.is_platform_admin());

create policy "finance settings visible to event managers"
  on public.event_finance_settings for select
  using (public.can_manage_event_finance(event_id));

create policy "finance settings manageable by finance roles"
  on public.event_finance_settings for all
  using (public.can_manage_event_finance(event_id))
  with check (public.can_manage_event_finance(event_id));

create policy "expenses visible to finance roles"
  on public.event_expenses for select
  using (public.can_manage_event_finance(event_id));

create policy "expenses manageable by finance roles"
  on public.event_expenses for all
  using (public.can_manage_event_finance(event_id))
  with check (public.can_manage_event_finance(event_id));

create policy "participants and organizers can read registrations"
  on public.registrations for select
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
    or public.can_manage_event(event_id)
  );

create policy "participants can create registrations"
  on public.registrations for insert
  with check (user_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "organizers can update event registrations"
  on public.registrations for update
  using (public.can_manage_event(event_id));

create policy "attendees visible to registration owner and organizer"
  on public.registration_attendees for select
  using (registration_id in (
    select r.id
    from public.registrations r
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or public.can_manage_event(r.event_id)
  ));

create policy "participants can create attendees for own registrations"
  on public.registration_attendees for insert
  with check (registration_id in (
    select r.id
    from public.registrations r
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id
  ));

create policy "payments visible to owner and organizer"
  on public.payments for select
  using (registration_id in (
    select r.id
    from public.registrations r
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or public.can_manage_event_payments(r.event_id) or public.is_platform_admin()
  ));

create policy "organizers can update payments"
  on public.payments for update
  using (registration_id in (
    select r.id
    from public.registrations r
    where public.can_manage_event_payments(r.event_id) or public.is_platform_admin()
  ));

create policy "users can create payment proofs for own orders"
  on public.payment_proofs for insert
  with check (payment_id in (
    select p.id
    from public.payments p
    join public.registrations r on r.id = p.registration_id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id and uploaded_by = u.id
  ));

create policy "payment proofs visible to owner and organizer"
  on public.payment_proofs for select
  using (payment_id in (
    select p.id
    from public.payments p
    join public.registrations r on r.id = p.registration_id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or public.can_manage_event_payments(r.event_id) or public.is_platform_admin()
  ));

create policy "payment roles can update payment proofs"
  on public.payment_proofs for update
  using (payment_id in (
    select p.id
    from public.payments p
    join public.registrations r on r.id = p.registration_id
    where public.can_manage_event_payments(r.event_id) or public.is_platform_admin()
  ));

create policy "refund requests visible to owner refund roles and admins"
  on public.refund_requests for select
  using (registration_id in (
    select r.id
    from public.registrations r
    where r.user_id = public.current_app_user_id()
      or public.can_handle_event_refunds(r.event_id)
      or public.is_platform_admin()
  ));

create policy "users can request refunds for own orders"
  on public.refund_requests for insert
  with check (registration_id in (
    select r.id
    from public.registrations r
    where r.user_id = public.current_app_user_id()
      and requested_by = public.current_app_user_id()
  ));

create policy "refund roles can update refund requests"
  on public.refund_requests for update
  using (registration_id in (
    select r.id
    from public.registrations r
    where public.can_handle_event_refunds(r.event_id) or public.is_platform_admin()
  ));

create policy "refund proofs visible to owner refund roles and admins"
  on public.refund_proofs for select
  using (refund_request_id in (
    select rr.id
    from public.refund_requests rr
    join public.registrations r on r.id = rr.registration_id
    where r.user_id = public.current_app_user_id()
      or public.can_handle_event_refunds(r.event_id)
      or public.is_platform_admin()
  ));

create policy "refund roles can create refund proofs"
  on public.refund_proofs for insert
  with check (refund_request_id in (
    select rr.id
    from public.refund_requests rr
    join public.registrations r on r.id = rr.registration_id
    where public.can_handle_event_refunds(r.event_id) or public.is_platform_admin()
  ));

create policy "waitlist visible to owner and event managers"
  on public.waitlist_entries for select
  using (user_id = public.current_app_user_id() or public.can_manage_event(event_id) or public.is_platform_admin());

create policy "users can join waitlist"
  on public.waitlist_entries for insert
  with check (user_id = public.current_app_user_id());

create policy "event managers can update waitlist"
  on public.waitlist_entries for update
  using (public.can_manage_event(event_id) or public.is_platform_admin());

create policy "seats visible for readable events"
  on public.seats for select
  using (event_id in (
    select id from public.events
    where visibility = 'public'
    or public.can_manage_event(id)
  ));

create policy "organizers can manage seats"
  on public.seats for all
  using (public.can_manage_event(event_id));

create policy "seat locks visible to owner and organizer"
  on public.seat_locks for select
  using (registration_id in (
    select r.id
    from public.registrations r
    where r.user_id = public.current_app_user_id()
      or public.can_manage_event(r.event_id)
      or public.is_platform_admin()
  ));

create policy "participants can create seat locks for own confirmed registrations"
  on public.seat_locks for insert
  with check (registration_id in (
    select r.id
    from public.registrations r
    join public.payments p on p.registration_id = r.id
    where r.user_id = public.current_app_user_id()
      and p.status = 'confirmed'
      and locked_by = public.current_app_user_id()
  ));

create policy "event managers can update seat locks"
  on public.seat_locks for update
  using (public.can_manage_event(event_id) or locked_by = public.current_app_user_id() or public.is_platform_admin());

create policy "seat assignments visible to owner and organizer"
  on public.seat_assignments for select
  using (registration_id in (
    select r.id
    from public.registrations r
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or public.can_manage_event(r.event_id)
  ));

create policy "participants can create seat assignments for paid registrations"
  on public.seat_assignments for insert
  with check (registration_id in (
    select r.id
    from public.registrations r
    join public.payments p on p.registration_id = r.id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id and p.status = 'confirmed'
  ));

create policy "organizers can manage seat assignments"
  on public.seat_assignments for all
  using (public.can_manage_event(event_id));

create policy "check ins visible to event managers and order owner"
  on public.check_ins for select
  using (registration_id in (
    select r.id
    from public.registrations r
    where r.user_id = public.current_app_user_id()
      or public.can_manage_event(r.event_id)
      or public.is_platform_admin()
  ));

create policy "event staff can manage check ins"
  on public.check_ins for all
  using (public.can_manage_event(event_id) or public.is_platform_admin())
  with check (public.can_manage_event(event_id) or public.is_platform_admin());

create policy "published announcements visible"
  on public.announcements for select
  using (status = 'published' or public.can_manage_event(event_id));

create policy "organizers can manage announcements"
  on public.announcements for all
  using (public.can_edit_event(event_id));

create policy "notification deliveries visible to recipients and event managers"
  on public.notification_deliveries for select
  using (
    recipient_id = public.current_app_user_id()
    or (event_id is not null and public.can_manage_event(event_id))
    or public.is_platform_admin()
  );

create policy "event managers can manage notification deliveries"
  on public.notification_deliveries for all
  using ((event_id is not null and public.can_manage_event(event_id)) or public.is_platform_admin());

create policy "public materials visible or organizer internal guarded"
  on public.activity_materials for select
  using (
    visibility = 'participant'
    or public.can_manage_event(event_id)
    or public.is_platform_admin()
  );

create policy "event managers can manage materials"
  on public.activity_materials for all
  using (public.can_manage_event(event_id) or public.is_platform_admin())
  with check (public.can_manage_event(event_id) or public.is_platform_admin());

create policy "export jobs visible to requester event owners and admins"
  on public.export_jobs for select
  using (
    requested_by = public.current_app_user_id()
    or public.can_manage_event(event_id)
    or public.is_platform_admin()
  );

create policy "event managers can create export jobs"
  on public.export_jobs for insert
  with check (requested_by = public.current_app_user_id() and public.can_manage_event(event_id));

create policy "complaints visible to submitter admins and event managers"
  on public.complaints for select
  using (
    submitted_by = public.current_app_user_id()
    or public.is_platform_admin()
    or (event_id is not null and public.can_manage_event(event_id))
  );

create policy "users can create complaints"
  on public.complaints for insert
  with check (submitted_by = public.current_app_user_id());

create policy "admins can update complaints"
  on public.complaints for update
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform settings visible to admins"
  on public.platform_settings for select
  using (public.is_platform_admin());

create policy "admins can manage platform settings"
  on public.platform_settings for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "admin users visible to admins"
  on public.admin_users for select
  using (public.is_platform_admin() or user_id = public.current_app_user_id());

create policy "audit logs visible to admins and event managers"
  on public.audit_logs for select
  using (
    public.is_platform_admin()
    or actor_id = public.current_app_user_id()
    or (event_id is not null and public.can_manage_event(event_id))
  );

-- Data API grants.
-- RLS still decides which rows each user can access; these grants only allow
-- users to reach the tables through Supabase's generated API.
grant usage on schema public to anon, authenticated;
grant select on public.events to anon;
grant select on public.announcements to anon;
grant select on public.activity_materials to anon;
grant execute on function public.current_app_user_id() to anon;
grant execute on function public.can_manage_event(uuid) to anon;
grant execute on function public.is_platform_admin() to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

alter default privileges in schema public
  grant execute on functions to authenticated;
