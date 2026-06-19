type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

export function pruneExpiredRateLimitBuckets(now = Date.now()) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function getRateLimitBucketCount() {
  return buckets.size;
}

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cfIp || "local";
}

export function enforceRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now();

  pruneExpiredRateLimitBuckets(now);

  const key = `${options.keyPrefix}:${getClientKey(request)}`;
  const current = buckets.get(key);
  const bucket = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + options.windowMs };

  if (bucket.count >= options.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    return Response.json(
      {
        ok: false,
        message: "请求过于频繁，请稍后再试。",
        error_code: "RATE_LIMITED"
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  return null;
}
