import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(repoRoot, "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir).sort();

function readMigration(name: string) {
  return readFileSync(join(migrationsDir, name), "utf8");
}

describe("supabase migrations contract", () => {
  it("keeps a supabase CLI config file", () => {
    const config = readFileSync(join(repoRoot, "supabase", "config.toml"), "utf8");

    assert.match(config, /project_id = "gatherup"/);
  });

  it("names every migration with a sortable timestamp prefix", () => {
    assert.ok(migrationFiles.length >= 3, "expected at least the baseline migrations");

    for (const name of migrationFiles) {
      assert.match(name, /^\d{14}_[a-z0-9_]+\.sql$/, `${name} should match <14-digit timestamp>_<snake_case>.sql`);
    }
  });

  it("keeps the initial schema migration identical to the frozen schema.sql baseline", () => {
    const schema = readFileSync(join(repoRoot, "supabase", "schema.sql"), "utf8");
    const migration = readMigration("20260705000001_initial_schema.sql");

    assert.equal(migration, schema);
  });

  it("keeps the storage migration identical to the frozen storage.sql baseline", () => {
    const storage = readFileSync(join(repoRoot, "supabase", "storage.sql"), "utf8");
    const migration = readMigration("20260705000002_storage.sql");

    assert.equal(migration, storage);
  });

  it("locks down the rate limit table and RPC to the service role", () => {
    const migration = readMigration("20260705000100_api_rate_limits.sql");

    assert.match(migration, /create table if not exists public\.api_rate_limits/);
    assert.match(migration, /alter table public\.api_rate_limits enable row level security/);
    assert.match(migration, /revoke all on table public\.api_rate_limits from public, anon, authenticated/);
    assert.match(migration, /create or replace function public\.consume_rate_limit/);
    assert.match(
      migration,
      /revoke all on function public\.consume_rate_limit\(text, integer, integer\) from public, anon, authenticated/
    );
    assert.match(migration, /grant execute on function public\.consume_rate_limit\(text, integer, integer\) to service_role/);
    assert.match(migration, /security definer/);
  });
});
