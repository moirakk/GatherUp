import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  enforceRateLimit,
  getRateLimitBucketCount,
  pruneExpiredRateLimitBuckets
} from "../src/lib/server/rate-limit.ts";

function requestFrom(ip: string) {
  return new Request("https://gatherup.local/api/orders", {
    headers: {
      "x-forwarded-for": ip
    }
  });
}

describe("server rate limiting", () => {
  it("returns 429 after the configured window limit is exceeded", async () => {
    const options = {
      keyPrefix: "test:limited",
      limit: 2,
      windowMs: 60_000
    };

    assert.equal(enforceRateLimit(requestFrom("203.0.113.10"), options), null);
    assert.equal(enforceRateLimit(requestFrom("203.0.113.10"), options), null);

    const response = enforceRateLimit(requestFrom("203.0.113.10"), options);

    assert.ok(response);
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("X-RateLimit-Limit"), "2");
    assert.equal(response.headers.get("X-RateLimit-Remaining"), "0");
    assert.ok(Number(response.headers.get("Retry-After")) > 0);
    assert.deepEqual(await response.json(), {
      ok: false,
      message: "请求过于频繁，请稍后再试。",
      error_code: "RATE_LIMITED"
    });
  });

  it("keeps separate buckets per client address", () => {
    const options = {
      keyPrefix: "test:isolated",
      limit: 1,
      windowMs: 60_000
    };

    assert.equal(enforceRateLimit(requestFrom("203.0.113.11"), options), null);
    assert.equal(enforceRateLimit(requestFrom("203.0.113.12"), options), null);
    assert.equal(enforceRateLimit(requestFrom("203.0.113.11"), options)?.status, 429);
  });

  it("prunes expired buckets to avoid unbounded memory growth", () => {
    const options = {
      keyPrefix: "test:prune",
      limit: 1,
      windowMs: 10
    };
    const before = getRateLimitBucketCount();

    assert.equal(enforceRateLimit(requestFrom("203.0.113.13"), options), null);
    assert.equal(getRateLimitBucketCount(), before + 1);

    pruneExpiredRateLimitBuckets(Date.now() + 11);

    assert.equal(getRateLimitBucketCount(), before);
    assert.equal(enforceRateLimit(requestFrom("203.0.113.13"), options), null);
  });
});
