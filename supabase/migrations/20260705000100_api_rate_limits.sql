-- API rate limiting backed by Postgres so limits hold across serverless instances.
-- Access model: service-role only. RLS is enabled with no policies and all
-- privileges are revoked from anon/authenticated.

create table if not exists public.api_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.api_rate_limits is
  'Fixed-window API rate limit counters. Service-role access only.';

alter table public.api_rate_limits enable row level security;

revoke all on table public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.api_rate_limits to service_role;

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_row public.api_rate_limits%rowtype;
begin
  if p_bucket_key is null or length(p_bucket_key) = 0 or length(p_bucket_key) > 300 then
    raise exception 'consume_rate_limit: invalid bucket key';
  end if;

  if coalesce(p_limit, 0) < 1 or coalesce(p_window_seconds, 0) < 1 then
    raise exception 'consume_rate_limit: invalid limit or window';
  end if;

  insert into public.api_rate_limits as t (bucket_key, window_started_at, request_count, updated_at)
  values (p_bucket_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
    set request_count = case
          when t.window_started_at + make_interval(secs => p_window_seconds) <= v_now then 1
          else t.request_count + 1
        end,
        window_started_at = case
          when t.window_started_at + make_interval(secs => p_window_seconds) <= v_now then v_now
          else t.window_started_at
        end,
        updated_at = v_now
  returning * into v_row;

  allowed := v_row.request_count <= p_limit;
  remaining := greatest(p_limit - v_row.request_count, 0);
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from (v_row.window_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer
  );

  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

create or replace function public.prune_expired_rate_limits(p_older_than_seconds integer default 86400)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.api_rate_limits
  where updated_at < now() - make_interval(secs => greatest(coalesce(p_older_than_seconds, 86400), 60));

  get diagnostics v_deleted = row_count;

  return v_deleted;
end;
$$;

revoke all on function public.prune_expired_rate_limits(integer) from public, anon, authenticated;
grant execute on function public.prune_expired_rate_limits(integer) to service_role;
