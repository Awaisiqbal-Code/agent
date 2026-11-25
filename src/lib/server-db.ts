import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { applyDueMeetingReminders } from "./meeting-reminders";
import { normalizePolicy } from "./policy";
import { createSeedState } from "./seed";
import type { AppState, Employee, Session, TimeEvent } from "./types";
import { tenantRoot, tenantStorePath } from "./tenant-paths";

export type SharedState = Omit<AppState, "currentUserId">;

export type PersistedStore = {
  version: number;
  updatedAt: string;
  tenantId: string;
  state: SharedState;
};

function normalizeEmployees(employees: Employee[]): Employee[] {
  return employees.map((e) => ({
    ...e,
    presence: e.presence === "online" ? "online" : "offline",
  }));
}

/** Close open break/work/idle events whose session already ended. */
function sealOrphanTimeEvents(
  sessions: Session[],
  timeEvents: TimeEvent[],
): TimeEvent[] {
  const closed = new Map(
    sessions
      .filter((s) => Boolean(s.endTime) || s.status === "ended" || s.status === "interrupted")
      .map((s) => [s.id, s.endTime ?? s.startTime]),
  );
  return timeEvents.map((e) => {
    if (e.endTime) return e;
    const sessionEnd = closed.get(e.sessionId);
    if (!sessionEnd) return e;
    return { ...e, endTime: sessionEnd };
  });
}

function toShared(state: AppState | SharedState): SharedState {
  const { currentUserId: _ignored, ...rest } = state as AppState;
  const sessions = rest.sessions ?? [];
  const timeEvents = sealOrphanTimeEvents(sessions, rest.timeEvents ?? []);
  return {
    ...rest,
    policy: normalizePolicy(rest.policy),
    employees: normalizeEmployees(rest.employees ?? []),
    sessions,
    timeEvents,
    tasks: rest.tasks ?? [],
    submissions: rest.submissions ?? [],
    screenshots: rest.screenshots ?? [],
    reports: rest.reports ?? [],
    backups: rest.backups ?? [],
    auditLogs: rest.auditLogs ?? [],
    meetingGroups: rest.meetingGroups ?? [],
    meetings: rest.meetings ?? [],
    notifications: rest.notifications ?? [],
    chatMessages: rest.chatMessages ?? [],
  };
}

function ensureTenantStore(tenantId: string): PersistedStore {
  if (!tenantId) throw new Error("tenantId required");
  const root = tenantRoot(tenantId);
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const STORE_PATH = tenantStorePath(tenantId);
  if (!existsSync(STORE_PATH)) {
    const seed = toShared(createSeedState());
    const initial: PersistedStore = {
      version: 1,
      updatedAt: new Date().toISOString(),
      tenantId,
      state: seed,
    };
    writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  const raw = readFileSync(STORE_PATH, "utf8");
  const parsed = JSON.parse(raw) as PersistedStore & { tenantId?: string };
  return { ...parsed, tenantId };
}

export function readStore(tenantId: string): PersistedStore {
  const store = ensureTenantStore(tenantId);
  let sealed = toShared(store.state);
  const orphanChanged =
    JSON.stringify(sealed.timeEvents) !== JSON.stringify(store.state.timeEvents);
  const withReminders = applyDueMeetingReminders(sealed);
  if (withReminders) sealed = withReminders;
  if (orphanChanged || withReminders) {
    const next: PersistedStore = {
      version: store.version + 1,
      updatedAt: new Date().toISOString(),
      tenantId,
      state: sealed,
    };
    writeFileSync(tenantStorePath(tenantId), JSON.stringify(next, null, 2));
    return next;
  }
  return { ...store, tenantId, state: sealed };
}

export function writeStore(
  tenantId: string,
  state: SharedState,
  expectedVersion?: number,
): PersistedStore {
  const current = ensureTenantStore(tenantId);
  if (expectedVersion != null && expectedVersion !== current.version) {
    const err = new Error("VERSION_CONFLICT") as Error & {
      code: string;
      store: PersistedStore;
    };
    err.code = "VERSION_CONFLICT";
    err.store = current;
    throw err;
  }
  const next: PersistedStore = {
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
    tenantId,
    state: toShared(state),
  };
  const STORE_PATH = tenantStorePath(tenantId);
  const tmp = join(dirname(STORE_PATH), `.store.${process.pid}.tmp`);
  writeFileSync(tmp, JSON.stringify(next, null, 2));
  renameSync(tmp, STORE_PATH);
  return next;
}

export function resetStore(tenantId: string): PersistedStore {
  const root = tenantRoot(tenantId);
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const next: PersistedStore = {
    version: 1,
    updatedAt: new Date().toISOString(),
    tenantId,
    state: toShared(createSeedState()),
  };
  writeFileSync(tenantStorePath(tenantId), JSON.stringify(next, null, 2));
  return next;
}

/** Count active employees for seat limits (excludes pending/rejected). */
export function countActiveSeats(tenantId: string): number {
  try {
    const store = readStore(tenantId);
    return store.state.employees.filter(
      (e) => e.status === "active" || e.status === "pending",
    ).length;
  } catch {
    return 0;
  }
}
