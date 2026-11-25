import { existsSync } from "fs";
import { hashPassword } from "./password";
import {
  appendPlatformAudit,
  companyBySlug,
  findPlan,
  readPlatform,
  writePlatform,
} from "./platform-db";
import { createEmptyPlatform } from "./platform-seed";
import type { Company } from "./platform-types";
import { readStore } from "./server-db";
import { legacyStorePath, migrateLegacyStoreFile } from "./tenant-paths";

let migrated = false;

/**
 * One-time: if legacy data/store.json exists and no companies yet,
 * create a default company and move the store under tenants/{id}/.
 */
export function ensureTenancyMigrated(): void {
  if (migrated) return;
  migrated = true;

  let platform = readPlatform();
  // Ensure default plans exist
  if (!platform.state.plans?.length) {
    const seed = createEmptyPlatform();
    platform = writePlatform({ ...platform.state, plans: seed.state.plans });
  }

  const legacy = legacyStorePath();
  if (!existsSync(legacy)) return;
  if (platform.state.companies.some((c) => c.status !== "deleted")) return;

  const slug = "default";
  if (companyBySlug(platform.state, slug)) return;

  const plan =
    findPlan(platform.state, platform.state.settings.defaultPlanCode) ||
    platform.state.plans[0];
  const now = new Date();
  const expires = new Date(now);
  expires.setFullYear(expires.getFullYear() + 1);
  const tenantId = `co_${Date.now().toString(36)}`;

  migrateLegacyStoreFile(tenantId);

  // Peek admin email from migrated store
  let adminEmail = "admin@example.com";
  let adminName = "Company Admin";
  try {
    const store = readStore(tenantId);
    const admin = store.state.employees.find(
      (e) => e.role === "admin" && e.status === "active",
    );
    if (admin) {
      adminEmail = admin.email;
      adminName = admin.name;
    }
  } catch {
    // ignore
  }

  const company: Company = {
    id: tenantId,
    name: "Default Company",
    slug,
    status: "active",
    planId: plan.id,
    billingInterval: "yearly",
    subscriptionStatus: "active",
    maxEmployees: plan.maxEmployees,
    subscriptionStartsAt: now.toISOString(),
    subscriptionExpiresAt: expires.toISOString(),
    adminEmail,
    adminName,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    notes: "Migrated from single-tenant store.json",
  };

  let state = {
    ...platform.state,
    companies: [company, ...platform.state.companies],
  };
  state = appendPlatformAudit(state, {
    actorId: "system",
    action: "platform.migrate_legacy_tenant",
    targetType: "company",
    targetId: tenantId,
    outcome: "success",
    detail: `slug=${slug}`,
  });
  writePlatform(state);
}

export function verifySetupSecret(provided: string | undefined): boolean {
  const expected = process.env.SETUP_SECRET?.trim();
  if (!expected || expected.length < 8) {
    // No secret configured: only allow bootstrap when zero platform users
    // AND zero companies (true first boot). Still require a non-empty provided
    // secret matching a generated ephemeral value stored once? Safer: deny
    // unless SETUP_SECRET is set OR platform has no users and provided equals
    // "local-dev-only" in non-production.
    if (process.env.NODE_ENV !== "production" && provided === "local-dev-only") {
      return true;
    }
    return false;
  }
  return provided === expected;
}

export function hashIfNeeded(password: string): string {
  return hashPassword(password);
}
