-- GatherUp commercial v0.1 demo identity integrity check.
-- Expected:
--   provider = 'email'
--   provider_user_id = auth_user_id::text
--   provider_user_id is not an email address

select
  u.id,
  u.auth_user_id,
  u.email,
  i.provider,
  i.provider_user_id,
  i.email as identity_email,
  (i.provider_user_id = u.auth_user_id::text) as provider_user_id_matches_auth_user_id,
  (i.provider_user_id like '%@%') as provider_user_id_looks_like_email
from public.users u
join public.user_auth_identities i on i.user_id = u.id
order by u.id;
