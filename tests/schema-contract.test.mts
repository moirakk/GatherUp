import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const schema = readFileSync(join(repoRoot, "supabase", "schema.sql"), "utf8");
const seed = readFileSync(join(repoRoot, "supabase", "seed.sql"), "utf8");
const storageSql = readFileSync(join(repoRoot, "supabase", "storage.sql"), "utf8");

function expectSql(sql: string, needle: string) {
  assert.ok(sql.includes(needle), `Expected SQL to include: ${needle}`);
}

function extractEnumValues(name: string) {
  const match = schema.match(new RegExp(`create type ${name} as enum \\((.*?)\\);`, "s"));
  assert.ok(match, `Missing enum ${name}`);
  return Array.from(match[1].matchAll(/'([^']+)'/g), (valueMatch) => valueMatch[1]);
}

function extractCreatedTables() {
  return Array.from(schema.matchAll(/create table public\.([a-z_]+) \(/g), (match) => match[1]);
}

function extractCreatedTypes() {
  return Array.from(schema.matchAll(/create type ([a-z_]+) as enum/g), (match) => match[1]);
}

function extractTableBlocks() {
  return Array.from(schema.matchAll(/create table public\.([a-z_]+) \([\s\S]*?\n\);/g), (match) => ({
    name: match[1],
    block: match[0],
    index: match.index ?? -1
  }));
}

function extractRlsTables() {
  return Array.from(schema.matchAll(/alter table public\.([a-z_]+) enable row level security;/g), (match) => match[1]);
}

function extractPolicyTables() {
  return Array.from(schema.matchAll(/create policy "[^"]+"\s+on public\.([a-z_]+)/g), (match) => match[1]);
}

function normalizeColumns(value: string) {
  return value
    .split(",")
    .map((column) => column.trim().replace(/"/g, ""))
    .join(",");
}

function extractTableBlock(table: string) {
  const match = schema.match(new RegExp(`create table public\\.${table} \\([\\s\\S]*?\\n\\);`));
  assert.ok(match, `Missing table block public.${table}`);
  return match[0];
}

function extractUniqueTargets(table: string) {
  const block = extractTableBlock(table);
  const targets = new Set<string>();

  for (const match of block.matchAll(/^\s*([a-z_]+) [^,\n]* primary key/gm)) {
    targets.add(match[1]);
  }

  for (const match of block.matchAll(/^\s*([a-z_]+) [^,\n]* unique/gm)) {
    targets.add(match[1]);
  }

  for (const match of block.matchAll(/unique \(([^)]+)\)/g)) {
    targets.add(normalizeColumns(match[1]));
  }

  for (const match of schema.matchAll(new RegExp(`create unique index [\\w_]+\\s+on public\\.${table}\\(([^)]+)\\)`, "g"))) {
    targets.add(normalizeColumns(match[1]));
  }

  return targets;
}

function extractSeedConflictTargets() {
  return Array.from(
    seed.matchAll(/insert into public\.([a-z_]+)[\s\S]*?on conflict(?: \(([^)]+)\))? do nothing/g),
    (match) => ({
      table: match[1],
      columns: match[2] ? normalizeColumns(match[2]) : null
    })
  );
}

function indexOfSeedInsert(table: string) {
  const index = seed.indexOf(`insert into public.${table}`);
  assert.notEqual(index, -1, `Missing seed insert for public.${table}`);
  return index;
}

function extractStorageBucketIds() {
  return Array.from(storageSql.matchAll(/\('([a-z-]+)',\s*'([a-z-]+)',\s*(true|false),/g), (match) => ({
    id: match[1],
    name: match[2],
    isPublic: match[3] === "true"
  }));
}

describe("commercial schema contract", () => {
  it("contains the required commercial v0.1 tables", () => {
    const tables = new Set(extractCreatedTables());
    const requiredTables = [
      "users",
      "user_public_id_history",
      "user_auth_identities",
      "organizer_verifications",
      "events",
      "event_organizers",
      "review_requests",
      "collection_code_versions",
      "registrations",
      "registration_attendees",
      "payments",
      "payment_proofs",
      "refund_requests",
      "refund_proofs",
      "waitlist_entries",
      "seat_locks",
      "seat_assignments",
      "check_ins",
      "notification_deliveries",
      "activity_materials",
      "export_jobs",
      "complaints",
      "platform_settings",
      "admin_users",
      "audit_logs"
    ];

    for (const table of requiredTables) {
      assert.equal(tables.has(table), true, `Missing required table public.${table}`);
    }
  });

  it("enables RLS on every public table created by the schema draft", () => {
    const createdTables = extractCreatedTables();
    const rlsTables = new Set(extractRlsTables());

    for (const table of createdTables) {
      assert.equal(rlsTables.has(table), true, `Missing RLS enable statement for public.${table}`);
    }
  });

  it("attaches policies only to created RLS-enabled tables", () => {
    const createdTables = new Set(extractCreatedTables());
    const rlsTables = new Set(extractRlsTables());

    for (const table of extractPolicyTables()) {
      assert.equal(createdTables.has(table), true, `Policy targets missing table public.${table}`);
      assert.equal(rlsTables.has(table), true, `Policy targets table without RLS enabled public.${table}`);
    }
  });

  it("creates referenced parent tables before child tables", () => {
    const tablePositions = new Map(extractTableBlocks().map((table) => [table.name, table.index]));

    for (const table of extractTableBlocks()) {
      for (const match of table.block.matchAll(/references public\.([a-z_]+)\(/g)) {
        const referencedTable = match[1];
        const referencedIndex = tablePositions.get(referencedTable);

        assert.notEqual(referencedIndex, undefined, `public.${table.name} references missing table public.${referencedTable}`);
        assert.ok(
          (referencedIndex as number) < table.index,
          `public.${table.name} references public.${referencedTable}, but the parent table is not created first`
        );
      }
    }
  });

  it("defines enum types before table columns use them", () => {
    const builtInTypes = new Set(["uuid", "text", "integer", "boolean", "timestamptz", "jsonb", "inet"]);
    const typePositions = new Map(extractCreatedTypes().map((type) => [type, schema.indexOf(`create type ${type} as enum`)]));

    for (const table of extractTableBlocks()) {
      for (const match of table.block.matchAll(/^\s*([a-z_]+)\s+([a-z_][a-z_0-9]*)\b/gm)) {
        const columnName = match[1];
        const columnType = match[2];

        if (["create", "constraint", "unique", "primary", "foreign", "check"].includes(columnName) || builtInTypes.has(columnType)) {
          continue;
        }

        const typeIndex = typePositions.get(columnType);
        assert.notEqual(typeIndex, undefined, `public.${table.name}.${columnName} uses missing enum type ${columnType}`);
        assert.ok(
          (typeIndex as number) < table.index,
          `public.${table.name}.${columnName} uses enum ${columnType}, but the enum is not defined first`
        );
      }
    }
  });

  it("keeps current commercial enum values available", () => {
    const requiredEventStatuses = [
      "draft",
      "interest_collecting",
      "registration_scheduled",
      "registration_open",
      "registration_closed",
      "payment_reviewing",
      "seat_selection_scheduled",
      "seat_selection_open",
      "ready",
      "completed",
      "cancelled"
    ];

    for (const status of requiredEventStatuses) {
      assert.ok(extractEnumValues("event_status").includes(status), `Missing event_status value ${status}`);
    }

    assert.ok(extractEnumValues("event_organizer_role").includes("cohost"));
    assert.equal(extractEnumValues("event_organizer_role").includes("co_host"), false);
    assert.ok(extractEnumValues("registration_status").includes("payment_submitted"));
    assert.ok(extractEnumValues("registration_status").includes("partial_paid_needs_topup"));
    assert.ok(extractEnumValues("payment_status").includes("topup_required"));
    assert.ok(extractEnumValues("payment_proof_type").includes("topup"));
    assert.ok(extractEnumValues("refund_status").includes("disputed"));
    assert.ok(extractEnumValues("seat_lock_status").includes("expired"));
  });

  it("keeps Supabase Auth as the durable identity anchor", () => {
    expectSql(schema, "unique (provider, provider_user_id)");
    expectSql(schema, "unique (user_id, provider)");
    expectSql(seed, "on conflict (user_id, provider) do nothing");

    const identitySeed = seed.match(/insert into public\.user_auth_identities[\s\S]*?on conflict/);
    assert.ok(identitySeed, "Missing user_auth_identities seed block");

    assert.doesNotMatch(seed, /on conflict \(provider, provider_user_id\) do nothing/);
    assert.doesNotMatch(identitySeed[0], /'email',\s*'[^']+@[^']+'/);
  });

  it("keeps GatherUp ID change history guarded by trigger logic", () => {
    expectSql(schema, "create table public.user_public_id_history");
    expectSql(schema, "create or replace function public.prevent_public_id_over_limit()");
    expectSql(schema, "if old.public_id_change_count >= 2 then");
    expectSql(schema, "insert into public.user_public_id_history");
    expectSql(schema, "create trigger users_prevent_public_id_over_limit");
  });

  it("keeps sensitive workflow helper functions and policies present", () => {
    const requiredFunctions = [
      "public.current_app_user_id()",
      "public.can_manage_event(target_event_id uuid)",
      "public.can_edit_event(target_event_id uuid)",
      "public.can_manage_event_finance(target_event_id uuid)",
      "public.can_manage_event_payments(target_event_id uuid)",
      "public.can_handle_event_refunds(target_event_id uuid)",
      "public.is_platform_admin()"
    ];

    for (const fn of requiredFunctions) {
      expectSql(schema, `create or replace function ${fn}`);
    }

    const requiredPolicyNames = [
      "collection codes visible only to payable orders and payment roles",
      "payment proofs visible to owner and organizer",
      "refund proofs visible to owner refund roles and admins",
      "participants can create seat locks for own confirmed registrations",
      "export jobs visible to requester event owners and admins",
      "audit logs visible to admins and event managers"
    ];

    for (const policyName of requiredPolicyNames) {
      expectSql(schema, `create policy "${policyName}"`);
    }
  });

  it("grants anonymous read access only to public event detail surfaces", () => {
    expectSql(schema, "grant usage on schema public to anon, authenticated;");
    expectSql(schema, "grant select on public.events to anon;");
    expectSql(schema, "grant select on public.announcements to anon;");
    expectSql(schema, "grant select on public.activity_materials to anon;");
    expectSql(schema, "grant execute on function public.current_app_user_id() to anon;");
    expectSql(schema, "grant execute on function public.can_manage_event(uuid) to anon;");
    expectSql(schema, "grant execute on function public.is_platform_admin() to anon;");
    assert.doesNotMatch(schema, /grant select, insert, update, delete on all tables in schema public to anon/);
    assert.doesNotMatch(schema, /grant select on public\.(registrations|payments|payment_proofs|refund_requests|refund_proofs) to anon/);
  });

  it("keeps registration creation atomic and aligned with the current schema", () => {
    expectSql(schema, "create or replace function public.create_registration_atomic(");
    expectSql(schema, "v_app_user_id := public.current_app_user_id();");
    expectSql(schema, "from public.events");
    expectSql(schema, "for update;");
    expectSql(schema, "insert into public.event_order_counters (event_id, current_number)");
    expectSql(schema, "current_number = public.event_order_counters.current_number + 1");
    expectSql(schema, "insert into public.registrations");
    expectSql(schema, "insert into public.registration_attendees");
    expectSql(schema, "'awaiting_payment'::registration_status");
    expectSql(schema, "'confirmed'::registration_status");
    expectSql(schema, "grant execute on function public.create_registration_atomic(uuid, text, contact_type, text, integer, jsonb, text) to authenticated;");
    assert.doesNotMatch(schema, /grant execute on function public\.create_registration_atomic\(uuid, text, contact_type, text, integer, jsonb, text\) to anon/);
    assert.doesNotMatch(schema, /registered_count|ticket_price_cents|current_value|pending_payment|awaiting_payment_proof/);
  });

  it("keeps payment review atomic and audited", () => {
    expectSql(schema, "create or replace function public.review_payment_atomic(");
    expectSql(schema, "v_actor_id := public.current_app_user_id();");
    expectSql(schema, "for update of r, p;");
    expectSql(schema, "public.can_manage_event_payments(v_order.event_id)");
    expectSql(schema, "v_order.registration_status <> 'payment_submitted'");
    expectSql(schema, "update public.registrations");
    expectSql(schema, "update public.payments");
    expectSql(schema, "update public.payment_proofs");
    expectSql(schema, "insert into public.audit_logs");
    expectSql(schema, "'payment.approved'");
    expectSql(schema, "'payment.rejected'");
    expectSql(schema, "grant execute on function public.review_payment_atomic(uuid, text, text, text) to authenticated;");
    assert.doesNotMatch(schema, /grant execute on function public\.review_payment_atomic\(uuid, text, text, text\) to anon/);
  });

  it("keeps seat locking and assignment atomic", () => {
    expectSql(schema, "create unique index seat_locks_one_active_per_seat");
    expectSql(schema, "create table public.seat_assignments");
    expectSql(schema, "unique (event_id, seat_id)");
    expectSql(schema, "unique (attendee_id)");
    expectSql(schema, "create or replace function public.expire_seat_locks_for_event(");
    expectSql(schema, "create or replace function public.create_seat_lock_atomic(");
    expectSql(schema, "create or replace function public.confirm_seat_assignment_atomic(");
    expectSql(schema, "perform public.expire_seat_locks_for_event(v_registration.event_id);");
    expectSql(schema, "for update;");
    expectSql(schema, "v_seat.status <> 'available'");
    expectSql(schema, "insert into public.seat_locks");
    expectSql(schema, "update public.seats");
    expectSql(schema, "set status = 'held'");
    expectSql(schema, "insert into public.seat_assignments");
    expectSql(schema, "status = 'confirmed'");
    expectSql(schema, "grant execute on function public.create_seat_lock_atomic(uuid, uuid) to authenticated;");
    expectSql(schema, "grant execute on function public.confirm_seat_assignment_atomic(uuid, uuid) to authenticated;");
    assert.doesNotMatch(schema, /grant execute on function public\.create_seat_lock_atomic\(uuid, uuid\) to anon/);
    assert.doesNotMatch(schema, /grant execute on function public\.confirm_seat_assignment_atomic\(uuid, uuid\) to anon/);
  });

  it("defines helper and trigger functions before they are used", () => {
    const firstPolicyIndex = schema.indexOf("create policy");
    assert.notEqual(firstPolicyIndex, -1, "Missing RLS policies");

    const helperFunctions = [
      "current_app_user_id",
      "can_manage_event",
      "can_edit_event",
      "can_manage_event_finance",
      "can_manage_event_payments",
      "can_handle_event_refunds",
      "is_platform_admin"
    ];

    for (const functionName of helperFunctions) {
      const definitionIndex = schema.indexOf(`create or replace function public.${functionName}`);
      assert.notEqual(definitionIndex, -1, `Missing helper function public.${functionName}`);
      assert.ok(definitionIndex < firstPolicyIndex, `Helper function public.${functionName} must be defined before policies`);
    }

    const triggerPairs = [
      ["set_updated_at", "users_set_updated_at"],
      ["prevent_public_id_over_limit", "users_prevent_public_id_over_limit"],
      ["create_payment_for_registration", "registrations_create_payment"],
      ["mark_payment_submitted_from_proof", "payment_proofs_mark_submitted"],
      ["sync_seat_status_on_assignment", "seat_assignments_sync_seat_status"]
    ];

    for (const [functionName, triggerName] of triggerPairs) {
      const definitionIndex = schema.indexOf(`create or replace function public.${functionName}`);
      const triggerIndex = schema.indexOf(`create trigger ${triggerName}`);
      assert.notEqual(definitionIndex, -1, `Missing trigger function public.${functionName}`);
      assert.notEqual(triggerIndex, -1, `Missing trigger ${triggerName}`);
      assert.ok(definitionIndex < triggerIndex, `Trigger ${triggerName} must be created after public.${functionName}`);
    }
  });
});

describe("commercial seed contract", () => {
  it("uses current enum values in sample data", () => {
    expectSql(seed, "'registration_open'");
    expectSql(seed, "'cohost'");
    expectSql(seed, "'payment_submitted'");

    assert.doesNotMatch(seed, /'co_host'/);
    assert.doesNotMatch(seed, /'registration'\s*\)/);
  });

  it("includes organizer-collected payment setup data", () => {
    expectSql(seed, "insert into public.organizer_verifications");
    expectSql(seed, "insert into public.platform_settings");
    expectSql(seed, "insert into public.collection_code_versions");
    expectSql(seed, "'wechat'");
    expectSql(seed, "'active'");
  });

  it("uses conflict targets backed by schema uniqueness", () => {
    for (const conflict of extractSeedConflictTargets()) {
      if (!conflict.columns) {
        continue;
      }

      const uniqueTargets = extractUniqueTargets(conflict.table);
      assert.equal(
        uniqueTargets.has(conflict.columns),
        true,
        `Seed uses on conflict (${conflict.columns}) for public.${conflict.table}, but schema has no matching primary key or unique constraint`
      );
    }
  });

  it("inserts parent records before child records in the demo seed", () => {
    assert.ok(indexOfSeedInsert("users") < indexOfSeedInsert("events"));
    assert.ok(indexOfSeedInsert("users") < indexOfSeedInsert("user_auth_identities"));
    assert.ok(indexOfSeedInsert("events") < indexOfSeedInsert("event_organizers"));
    assert.ok(indexOfSeedInsert("events") < indexOfSeedInsert("collection_code_versions"));
    assert.ok(indexOfSeedInsert("events") < indexOfSeedInsert("registrations"));
    assert.ok(indexOfSeedInsert("collection_code_versions") < indexOfSeedInsert("registrations"));
    assert.ok(indexOfSeedInsert("registrations") < indexOfSeedInsert("registration_attendees"));
    assert.ok(indexOfSeedInsert("registration_attendees") < indexOfSeedInsert("seat_assignments"));
    assert.ok(indexOfSeedInsert("seats") < indexOfSeedInsert("seat_assignments"));
  });
});

describe("commercial storage contract", () => {
  it("creates all required commercial v0.1 buckets as private buckets", () => {
    const buckets = extractStorageBucketIds();
    const bucketById = new Map(buckets.map((bucket) => [bucket.id, bucket]));
    const requiredBuckets = [
      "activity-covers",
      "activity-materials",
      "collection-codes",
      "payment-proofs",
      "refund-proofs",
      "expense-proofs",
      "complaint-evidence",
      "exports"
    ];

    for (const bucketId of requiredBuckets) {
      const bucket = bucketById.get(bucketId);
      assert.ok(bucket, `Missing Storage bucket ${bucketId}`);
      assert.equal(bucket.name, bucketId, `Storage bucket ${bucketId} must use matching id and name`);
      assert.equal(bucket.isPublic, false, `Storage bucket ${bucketId} must be private`);
    }
  });

  it("keeps Storage policies attached to storage.objects", () => {
    const requiredPolicyNames = [
      "collection codes readable by payable orders and payment roles",
      "payment roles can manage collection code files",
      "participants can upload own payment proof files",
      "payment proof files readable by owner and payment roles",
      "refund roles can upload refund proof files",
      "refund proof files readable by owner refund roles and admins",
      "finance roles can manage expense proof files",
      "export files readable by requester event managers and admins"
    ];

    for (const policyName of requiredPolicyNames) {
      expectSql(storageSql, `create policy "${policyName}"`);
      expectSql(storageSql, `on storage.objects`);
    }
  });

  it("uses business-id-based object paths for sensitive file policies", () => {
    expectSql(storageSql, "payment-proofs/{event_id}/{registration_id}/{payment_id}/{filename}");
    expectSql(storageSql, "collection-codes/{event_id}/{collection_code_version_id}/{filename}");
    expectSql(storageSql, "refund-proofs/{event_id}/{refund_request_id}/{filename}");
    expectSql(storageSql, "exports/{event_id}/{export_job_id}/{filename}");
    expectSql(storageSql, "public.storage_folder_uuid(name, 1)");
    expectSql(storageSql, "public.storage_folder_uuid(name, 2)");
  });

  it("keeps sensitive Storage access aligned with commercial permission helpers", () => {
    expectSql(storageSql, "public.can_manage_event_payments");
    expectSql(storageSql, "public.can_handle_event_refunds");
    expectSql(storageSql, "public.can_manage_event_finance");
    expectSql(storageSql, "public.is_platform_admin");
    expectSql(storageSql, "public.current_app_user_id");
  });
});
