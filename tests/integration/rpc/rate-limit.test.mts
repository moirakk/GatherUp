import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { type SupabaseClient } from "@supabase/supabase-js";

import {
  makeAdminClient,
  makeAnonClient,
  requiredEnvConfigured,
  shouldRunRpcIntegration
} from "./_helpers.mts";

describe("GatherUp distributed rate-limit RPC", { skip: !shouldRunRpcIntegration || !requiredEnvConfigured }, () => {
  let admin: SupabaseClient;
  let anon: SupabaseClient;
  const bucketPrefix = `rpc-rate-limit-${randomUUID()}`;

  before(() => {
    admin = makeAdminClient();
    anon = makeAnonClient();
  });

  after(async () => {
    if (!admin) {
      return;
    }

    await admin.from("api_rate_limits").delete().like("bucket_key", `${bucketPrefix}%`);
  });

  it("counts requests atomically and returns a typed rejection after the limit", async () => {
    const bucketKey = `${bucketPrefix}:203.0.113.20`;
    const first = await admin.rpc("consume_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: 2,
      p_window_seconds: 60
    });
    const second = await admin.rpc("consume_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: 2,
      p_window_seconds: 60
    });
    const third = await admin.rpc("consume_rate_limit", {
      p_bucket_key: bucketKey,
      p_limit: 2,
      p_window_seconds: 60
    });

    assert.ifError(first.error);
    assert.ifError(second.error);
    assert.ifError(third.error);

    assert.deepEqual(first.data?.[0], {
      allowed: true,
      remaining: 1,
      retry_after_seconds: first.data?.[0]?.retry_after_seconds
    });
    assert.deepEqual(second.data?.[0], {
      allowed: true,
      remaining: 0,
      retry_after_seconds: second.data?.[0]?.retry_after_seconds
    });
    assert.deepEqual(third.data?.[0], {
      allowed: false,
      remaining: 0,
      retry_after_seconds: third.data?.[0]?.retry_after_seconds
    });
    assert.ok(Number(third.data?.[0]?.retry_after_seconds) > 0);

    const { data: persisted, error: persistedError } = await admin
      .from("api_rate_limits")
      .select("bucket_key, request_count")
      .eq("bucket_key", bucketKey)
      .single();

    assert.ifError(persistedError);
    assert.equal(persisted?.request_count, 3);
  });

  it("does not expose the rate-limit RPC to anonymous clients", async () => {
    const { data, error } = await anon.rpc("consume_rate_limit", {
      p_bucket_key: `${bucketPrefix}:anon`,
      p_limit: 1,
      p_window_seconds: 60
    });

    assert.ok(error, "Anonymous clients must not be able to execute consume_rate_limit.");
    assert.equal(data, null);
  });
});
