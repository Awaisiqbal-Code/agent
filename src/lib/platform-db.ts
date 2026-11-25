import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { createEmptyPlatform } from "./platform-seed";
import type {
  Company,
  PersistedPlatform,
  PlatformState,
  PlatformUser,
  SubscriptionPlan,
  SubscriptionStatus,
} from "./platform-types";

function dataDir() {
  return process.env.DATA_DIR && process.env.DATA_DIR.trim().length > 0
    ? process.env.DATA_DIR
    : join(process.cwd(), "data");
}

function platformPath() {
  return join(dataDir(), "platform.json");
}

function ensureDir() {
  const dir = dataDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readPlatform(): PersistedPlatform {
  ensureDir();
  const path = platformPath();
  if (!existsSync(path)) {
    const initial = createEmptyPlatform();
    writeFileSync(path, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as PersistedPlatform;
  // Soft-fill newer fields
  if (!parsed.state.plans?.length) {
    parsed.state.plans = createEmptyPlatform().state.plans;
  }
  if (!parsed.state.settings) {
    parsed.state.settings = createEmptyPlatform().state.settings;
  }
  return parsed;
}

export function writePlatform(state: PlatformState, expectedVersion?: number): PersistedPlatform {
  const current = readPlatform();
  if (expectedVersion != null && expectedVersion !== current.version) {
    const err = new Error("PLATFORM_VERSION_CONFLICT") as Error & {
      code: string;
      store: PersistedPlatform;
    };
    err.code = "PLATFORM_VERSION_CONFLICT";
    err.store = current;
    throw err;
  }
  const next: PersistedPlatform = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    state,
  };
  const path = platformPath();
  const tmp = join(dirname(path), `.platform.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, path);
  return next;
}

export function findPlan(
  state: PlatformState,
  planIdOrCode: string,
): SubscriptionPlan | undefined {
  return state.plans.find(
    (p) => p.id === planIdOrCode || p.code === planIdOrCode,
  );
}

export function companyBySlug(
  state: PlatformState,
  slug: string,
): Company | undefined {
  const s = slug.toLowerCase().trim();
  return state.companies.find(
    (c) => c.slug === s && c.status !== "deleted",
  );
}

export function companyById(
  state: PlatformState,
  id: string,
): Company | undefined {
  return state.companies.find((c) => c.id === id && c.status !== "deleted");
}

export function isSubscriptionUsable(company: Company): boolean {
  if (company.status === "suspended" || company.status === "inactive") {
    return false;
  }
  if (company.status === "deleted") return false;
  if (
    company.subscriptionStatus === "expired" ||
    company.subscriptionStatus === "suspended"
  ) {
    return false;
  }
  const exp = new Date(company.subscriptionExpiresAt).getTime();
  if (Number.isFinite(exp) && exp < Date.now()) return false;
  return true;
}

/** Company admins may still sign in to renew/view billing when expired. */
export function canCompanyAdminAccess(company: Company): boolean {
  if (company.status === "deleted") return false;
  if (company.status === "suspended") return false;
  return true;
}

export function refreshSubscriptionStatus(company: Company): Company {
  const exp = new Date(company.subscriptionExpiresAt).getTime();
  if (
    Number.isFinite(exp) &&
    exp < Date.now() &&
    company.subscriptionStatus !== "suspended"
  ) {
    return { ...company, subscriptionStatus: "expired" as SubscriptionStatus };
  }
  return company;
}

export function redactPlatformUser(user: PlatformUser) {
  const { password: _p, ...rest } = user;
  return { ...rest, password: "" };
}

export function appendPlatformAudit(
  state: PlatformState,
  entry: Omit<PlatformState["auditLogs"][number], "id" | "timestamp"> & {
    id?: string;
    timestamp?: string;
  },
): PlatformState {
  const log = {
    id: entry.id ?? `paud_${Date.now().toString(36)}`,
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    outcome: entry.outcome,
    detail: entry.detail,
  };
  return {
    ...state,
    auditLogs: [log, ...state.auditLogs].slice(0, 5000),
  };
}
