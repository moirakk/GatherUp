-- GatherUp v0.1 Supabase/PostgreSQL schema draft.
-- This file is intended as a starting point for the real app database.

create extension if not exists pgcrypto;

create type event_type as enum (
  'movie_screening',
  'birthday_cafe',
  'workshop',
  'meetup',
  'board_game'
);

create type event_visibility as enum ('public', 'unlisted');
create type event_status as enum (
  'draft',
  'registration',
  'payment',
  'seating',
  'confirmed',
  'finished',
  'cancelled'
);

create type registration_status as enum (
  'pending',
  'confirmed',
  'waitlisted',
  'cancelled'
);

create type payment_status as enum (
  'unpaid',
  'submitted',
  'confirmed',
  'rejected',
  'refunded'
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
  constraint users_public_id_format check (public_id ~ '^[A-Za-z0-9_-]{3,24}$')
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  type event_type not null default 'movie_screening',
  city text not null,
  venue_name text not null,
  address text,
  starts_at timestamptz not null,
  registration_deadline timestamptz,
  capacity integer not null check (capacity > 0),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'CNY',
  description text,
  payment_instructions text,
  organizer_note text,
  visibility event_visibility not null default 'public',
  allow_multi_person_registration boolean not null default false,
  max_people_per_registration integer not null default 1 check (max_people_per_registration > 0),
  accept_waitlist boolean not null default true,
  order_number_format order_number_format not null default 'event_code_sequence',
  order_number_prefix text,
  status event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_multi_person_rule check (
    (allow_multi_person_registration = false and max_people_per_registration = 1)
    or (allow_multi_person_registration = true and max_people_per_registration >= 2)
  )
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
  status registration_status not null default 'pending',
  accepts_waitlist boolean not null default true,
  participant_note text,
  organizer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, order_number),
  unique (event_id, user_id)
);

create table public.registration_attendees (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  public_id text not null,
  display_name text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (registration_id, public_id)
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
  file_url text not null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
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

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  event_id uuid references public.events(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index events_organizer_id_idx on public.events(organizer_id);
create index events_visibility_status_idx on public.events(visibility, status);
create index events_city_starts_at_idx on public.events(city, starts_at);
create index registrations_event_id_idx on public.registrations(event_id);
create index registrations_user_id_idx on public.registrations(user_id);
create index registration_attendees_registration_id_idx on public.registration_attendees(registration_id);
create index payments_status_idx on public.payments(status);
create index seats_event_id_status_idx on public.seats(event_id, status);
create index seat_assignments_registration_id_idx on public.seat_assignments(registration_id);
create index announcements_event_id_status_idx on public.announcements(event_id, status);

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

create trigger events_set_updated_at
  before update on public.events
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

create trigger seats_set_updated_at
  before update on public.seats
  for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

create or replace function public.prevent_public_id_over_limit()
returns trigger as $$
begin
  if old.public_id is distinct from new.public_id then
    if old.public_id_change_count >= 2 then
      raise exception 'public_id can only be changed twice';
    end if;

    new.public_id_change_count = old.public_id_change_count + 1;
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

create or replace function public.mark_payment_submitted_from_proof()
returns trigger as $$
begin
  update public.payments
  set
    status = 'submitted',
    proof_url = new.file_url,
    submitted_at = now()
  where id = new.payment_id;

  return new;
end;
$$ language plpgsql;

create trigger payment_proofs_mark_submitted
  after insert on public.payment_proofs
  for each row execute function public.mark_payment_submitted_from_proof();

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

alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.event_order_counters enable row level security;
alter table public.registrations enable row level security;
alter table public.registration_attendees enable row level security;
alter table public.payments enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.seats enable row level security;
alter table public.seat_assignments enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

-- RLS draft policies.
-- These assume users.auth_user_id maps to auth.uid().

create policy "users can read their own profile"
  on public.users for select
  using (auth.uid() = auth_user_id);

create policy "users can update their own profile"
  on public.users for update
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

create policy "public events are readable"
  on public.events for select
  using (visibility = 'public' or organizer_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "organizers can insert events"
  on public.events for insert
  with check (organizer_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "organizers can update own events"
  on public.events for update
  using (organizer_id in (
    select id from public.users where auth_user_id = auth.uid()
  ))
  with check (organizer_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "participants and organizers can read registrations"
  on public.registrations for select
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
    or event_id in (
      select id from public.events
      where organizer_id in (select id from public.users where auth_user_id = auth.uid())
    )
  );

create policy "participants can create registrations"
  on public.registrations for insert
  with check (user_id in (
    select id from public.users where auth_user_id = auth.uid()
  ));

create policy "organizers can update event registrations"
  on public.registrations for update
  using (event_id in (
    select id from public.events
    where organizer_id in (select id from public.users where auth_user_id = auth.uid())
  ));

create policy "attendees visible to registration owner and organizer"
  on public.registration_attendees for select
  using (registration_id in (
    select r.id
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or e.organizer_id = u.id
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
    join public.events e on e.id = r.event_id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or e.organizer_id = u.id
  ));

create policy "organizers can update payments"
  on public.payments for update
  using (registration_id in (
    select r.id
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.users u on u.auth_user_id = auth.uid()
    where e.organizer_id = u.id
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
    join public.events e on e.id = r.event_id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or e.organizer_id = u.id
  ));

create policy "seats visible for readable events"
  on public.seats for select
  using (event_id in (
    select id from public.events
    where visibility = 'public'
    or organizer_id in (select id from public.users where auth_user_id = auth.uid())
  ));

create policy "organizers can manage seats"
  on public.seats for all
  using (event_id in (
    select id from public.events
    where organizer_id in (select id from public.users where auth_user_id = auth.uid())
  ));

create policy "seat assignments visible to owner and organizer"
  on public.seat_assignments for select
  using (registration_id in (
    select r.id
    from public.registrations r
    join public.events e on e.id = r.event_id
    join public.users u on u.auth_user_id = auth.uid()
    where r.user_id = u.id or e.organizer_id = u.id
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
  using (event_id in (
    select id from public.events
    where organizer_id in (select id from public.users where auth_user_id = auth.uid())
  ));

create policy "published announcements visible"
  on public.announcements for select
  using (status = 'published' or event_id in (
    select id from public.events
    where organizer_id in (select id from public.users where auth_user_id = auth.uid())
  ));

create policy "organizers can manage announcements"
  on public.announcements for all
  using (event_id in (
    select id from public.events
    where organizer_id in (select id from public.users where auth_user_id = auth.uid())
  ));
