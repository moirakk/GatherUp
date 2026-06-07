import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, normalize } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const markdownFiles = [
  "README.md",
  "docs/index-v0.1.md",
  "docs/current-state-v0.1.md",
  "docs/product-operating-map-v0.1.md",
  "docs/commercial-v0.1-prd.md",
  "docs/decision-log-v0.1.md",
  "docs/commercial-v0.1-engineering-plan.md",
  "docs/schema-validation-checklist-v0.1.md",
  "docs/supabase-sql-execution-runbook-v0.1.md",
  "docs/supabase-clean-project-validation-v0.1.md",
  "docs/supabase-live-validation-log-v0.1.md",
  "docs/service-layer-contract-v0.1.md",
  "docs/github-repository-profile-v0.1.md"
];

const requiredSupportFiles = [
  "supabase/validation/00-clean-project-preflight.sql",
  "supabase/validation/01-coverage-audit.sql",
  "supabase/validation/02-post-seed-counts.sql",
  "supabase/validation/03-identity-integrity.sql",
  "supabase/validation/04-payment-setup.sql",
  "supabase/validation/05-storage-buckets.sql"
];

function extractLocalLinks(markdown: string) {
  return Array.from(markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g), (match) => match[1]).filter((href) => {
    return !href.startsWith("http://") && !href.startsWith("https://") && !href.startsWith("#") && !href.startsWith("mailto:");
  });
}

describe("documentation links", () => {
  it("keeps all documented local links resolvable", () => {
    for (const file of markdownFiles) {
      const absoluteFile = join(repoRoot, file);
      const markdown = readFileSync(absoluteFile, "utf8");
      const baseDir = dirname(absoluteFile);

      for (const href of extractLocalLinks(markdown)) {
        const cleanHref = href.split("#")[0];
        const target = normalize(join(baseDir, cleanHref));
        assert.ok(existsSync(target), `${file} links to missing local target ${href}`);
      }
    }
  });

  it("does not link to deleted prototype or early baseline documents", () => {
    const deletedTargets = [
      "](./prototype",
      "](../prototype",
      "product-v0.1.md",
      "data-rules-v0.1.md",
      "database-schema-v0.1.md",
      "information-architecture-v0.1.md",
      "mvp-backlog-v0.1.md",
      "prototype-screens-v0.1.md",
      "technical-architecture-v0.1.md",
      "supabase-setup-v0.1.md",
      "supabase-live-setup-checklist-v0.1.md"
    ];

    for (const file of markdownFiles) {
      const markdown = readFileSync(join(repoRoot, file), "utf8");

      for (const deletedTarget of deletedTargets) {
        assert.equal(markdown.includes(deletedTarget), false, `${file} still references deleted target ${deletedTarget}`);
      }
    }
  });

  it("keeps the curated documentation set small and intentional", () => {
    for (const file of markdownFiles) {
      assert.equal(extname(file), ".md");
      assert.ok(existsSync(join(repoRoot, file)), `Missing curated doc ${file}`);
    }

    for (const file of requiredSupportFiles) {
      assert.ok(existsSync(join(repoRoot, file)), `Missing required support file ${file}`);
    }
  });
});
