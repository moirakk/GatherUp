import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const nextConfig = readFileSync(join(repoRoot, "next.config.ts"), "utf8");

describe("project configuration", () => {
  it("keeps npm dependencies pinned to exact versions", () => {
    const dependencyGroups = [packageJson.dependencies ?? {}, packageJson.devDependencies ?? {}];

    for (const dependencies of dependencyGroups) {
      for (const [name, version] of Object.entries(dependencies)) {
        assert.doesNotMatch(version, /latest|^\^|^~/, `${name} should be pinned to an exact version`);
      }
    }
  });

  it("keeps production security headers configured", () => {
    for (const header of [
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy"
    ]) {
      assert.match(nextConfig, new RegExp(header), `Missing ${header} header`);
    }

    assert.match(nextConfig, /value: "DENY"/);
    assert.match(nextConfig, /value: "nosniff"/);
    assert.match(nextConfig, /strict-origin-when-cross-origin/);
  });

  it("allows Supabase-hosted images through the Next image optimizer", () => {
    assert.match(nextConfig, /remotePatterns/);
    assert.match(nextConfig, /hostname: "\*\.supabase\.co"/);
  });
});
