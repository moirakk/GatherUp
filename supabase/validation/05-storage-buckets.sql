-- GatherUp commercial v0.1 private Storage bucket check.
-- Run after storage.sql succeeds.
-- Expected:
--   8 rows returned
--   public = false for all rows

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id in (
  'activity-covers',
  'activity-materials',
  'collection-codes',
  'payment-proofs',
  'refund-proofs',
  'expense-proofs',
  'complaint-evidence',
  'exports'
)
order by id;
