import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createPublicIdFromEmail,
  getSafeInternalPath,
  isPublicRoutePath,
  isValidEmail,
  normalizeEmail,
  normalizePublicId,
  publicIdPattern
} from "../src/lib/auth.ts";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const middlewareSource = readFileSync(join(repoRoot, "middleware.ts"), "utf8");
const appRoot = join(repoRoot, "src", "app");

function listPageRoutes(dir = appRoot, segments: string[] = []): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      return listPageRoutes(entryPath, [...segments, entry.name]);
    }

    if (entry.name !== "page.tsx") {
      return [];
    }

    return [`/${segments.join("/")}`.replace(/\/$/, "") || "/"];
  });
}

function samplePathForRoute(route: string) {
  return route.replace(/\[[^\]]+\]/g, "sample-id");
}

describe("auth normalization rules", () => {
  it("normalizes emails and public GatherUp IDs", () => {
    assert.equal(normalizeEmail("  Miki@Example.COM  "), "miki@example.com");
    assert.equal(normalizePublicId("  gu-miki  "), "GU-MIKI");
  });

  it("validates emails before account creation", () => {
    assert.equal(isValidEmail("miki@example.com"), true);
    assert.equal(isValidEmail("miki@"), false);
    assert.equal(isValidEmail("not an email"), false);
  });

  it("creates deterministic prototype public IDs from email", () => {
    assert.equal(createPublicIdFromEmail("miki@example.com"), "GU-MIKI");
    assert.equal(createPublicIdFromEmail("___@example.com"), "GU-USER");
  });

  it("keeps public IDs in the supported commercial format", () => {
    assert.equal(publicIdPattern.test("GU-MIKI"), true);
    assert.equal(publicIdPattern.test("GU-ABC-123"), true);
    assert.equal(publicIdPattern.test("miki"), false);
    assert.equal(publicIdPattern.test("GU-AB"), false);
  });
});

describe("route auth rules", () => {
  it("allows only safe internal redirect paths", () => {
    assert.equal(getSafeInternalPath("/organizer/events/new"), "/organizer/events/new");
    assert.equal(getSafeInternalPath("/events/abc/register?step=payment"), "/events/abc/register?step=payment");
    assert.equal(getSafeInternalPath(null, "/me"), "/me");
    assert.equal(getSafeInternalPath("https://evil.example/events"), "/");
    assert.equal(getSafeInternalPath("//evil.example/events"), "/");
    assert.equal(getSafeInternalPath("/login?next=/organizer"), "/");
  });

  it("keeps only login and public event detail routes public", () => {
    assert.equal(isPublicRoutePath("/login"), true);
    assert.equal(isPublicRoutePath("/events/event-1"), true);
    assert.equal(isPublicRoutePath("/events/event-1/"), true);
    assert.equal(isPublicRoutePath("/events/event-1/register"), false);
    assert.equal(isPublicRoutePath("/organizer"), false);
    assert.equal(isPublicRoutePath("/me/orders/ORD-1"), false);
  });

  it("requires every app page route to be explicitly classified", () => {
    const publicRoutes = new Set([
      "/events/[eventId]",
      "/login"
    ]);
    const protectedRoutes = new Set([
      "/",
      "/admin",
      "/dev/status",
      "/events/[eventId]/register",
      "/me",
      "/me/orders/[orderNumber]",
      "/onboarding",
      "/organizer",
      "/organizer/events/[eventId]",
      "/organizer/events/[eventId]/finance",
      "/organizer/events/new",
      "/venues",
      "/venues/[venueId]"
    ]);
    const knownRoutes = new Set([...publicRoutes, ...protectedRoutes]);

    for (const route of listPageRoutes().sort()) {
      assert.equal(knownRoutes.has(route), true, `${route} must be classified as public or protected`);
      assert.equal(isPublicRoutePath(samplePathForRoute(route)), publicRoutes.has(route), `${route} public classification mismatch`);
    }
  });

  it("uses Supabase SSR middleware auth instead of prototype session cookies", () => {
    assert.match(middlewareSource, /createServerClient/);
    assert.match(middlewareSource, /supabase\.auth\.getUser\(\)/);
    assert.match(middlewareSource, /pathname\.startsWith\("\/api\/"\)/);
    assert.doesNotMatch(middlewareSource, /SESSION_COOKIE/);
    assert.doesNotMatch(middlewareSource, /supabase\.auth\.getSession\(\)/);
  });
});
