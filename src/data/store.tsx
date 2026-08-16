import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppEvent,
  AttemptType,
  EventKind,
  Override,
  SideImages,
  VerificationLog,
  VerificationResult,
  Verdict,
} from "@/types";
import { generateSeed } from "./seed";

// ---------------------------------------------------------------------------
// In-memory log + event store backed by localStorage. This stands in for a
// real backend/database during the POC. Swapping to a real API means replacing
// the read/write internals here while keeping the same hook surface.
//
// Two records live here:
//  - logs:   one row per verification (keyed by scanned container QR)
//  - events: the chronological user log — verify results + audit events
//    (login, override, settings, user management), pipe_counting-style.
// ---------------------------------------------------------------------------

// v3: seed logs carry real camera stills (public/frames) instead of no images.
const LOGS_KEY = "ube.logs.v3";
const EVENTS_KEY = "ube.events.v1";
/** Oldest events are dropped past this — image-free, so the cap is generous. */
const EVENTS_CAP = 3000;

interface AddLogInput {
  containerId: string;
  attempt: AttemptType;
  stationId: string;
  employeeId: string;
  images?: SideImages;
  result: VerificationResult;
}

export interface LogEventInput {
  kind: EventKind;
  actor?: string;
  stationId?: string;
  containerId?: string;
  detail?: string;
}

interface LogStore {
  logs: VerificationLog[];
  events: AppEvent[];
  /** Persists the verification AND appends the matching verify_* event. */
  addLog: (input: AddLogInput) => VerificationLog;
  /** Applies the correction AND appends an `override` audit event. */
  applyOverride: (logId: string, override: Override) => void;
  /** Appends an audit/user event (login, settings_changed, …). */
  logEvent: (input: LogEventInput) => void;
  /** Newest log for a scanned container ID — drives rework detection. */
  latestForContainer: (containerId: string) => VerificationLog | undefined;
  clearAll: (actor?: string) => void;
  resetToSeed: (actor?: string) => void;
}

const LogStoreContext = createContext<LogStore | null>(null);

function load<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full (image data URLs are large) — non-fatal for POC.
  }
}

/** First run (or after a version bump): write seed logs + events together. */
function ensureSeeded() {
  if (localStorage.getItem(LOGS_KEY)) return;
  const seeded = generateSeed(Date.now());
  save(LOGS_KEY, seeded.logs);
  save(EVENTS_KEY, seeded.events);
}

function makeId(prefix: string, ts: number): string {
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `${prefix}-${ts.toString(36).toUpperCase()}-${rand}`;
}

const verifyKind = (v: Verdict): EventKind =>
  v === "Pass" ? "verify_pass" : v === "Fail" ? "verify_fail" : "verify_uncertain";

export function LogStoreProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<VerificationLog[]>(() => {
    ensureSeeded();
    return load<VerificationLog>(LOGS_KEY) ?? [];
  });
  const [events, setEvents] = useState<AppEvent[]>(
    () => load<AppEvent>(EVENTS_KEY) ?? [],
  );

  useEffect(() => {
    save(LOGS_KEY, logs);
  }, [logs]);

  useEffect(() => {
    save(EVENTS_KEY, events);
  }, [events]);

  const logEvent = useCallback((input: LogEventInput) => {
    const ts = Date.now();
    const event: AppEvent = { id: makeId("E", ts), ts, ...input };
    setEvents((prev) => [event, ...prev].slice(0, EVENTS_CAP));
  }, []);

  const addLog = useCallback(
    (input: AddLogInput): VerificationLog => {
      const ts = Date.now();
      const log: VerificationLog = {
        id: makeId("V", ts),
        containerId: input.containerId,
        attempt: input.attempt,
        timestamp: ts,
        stationId: input.stationId,
        employeeId: input.employeeId,
        images: input.images,
        result: input.result,
      };
      setLogs((prev) => [log, ...prev]);
      logEvent({
        kind: verifyKind(input.result.overall),
        actor: input.employeeId,
        stationId: input.stationId,
        containerId: input.containerId,
        detail:
          (input.attempt === "rework" ? "งานแก้ไข (Rework) · " : "") +
          (input.result.reason ?? `ผล ${input.result.overall}`),
      });
      return log;
    },
    [logEvent],
  );

  const applyOverride = useCallback(
    (logId: string, override: Override) => {
      const target = logs.find((l) => l.id === logId);
      setLogs((prev) =>
        prev.map((l) => (l.id === logId ? { ...l, override } : l)),
      );
      logEvent({
        kind: "override",
        actor: override.supervisorId,
        stationId: target?.stationId,
        containerId: target?.containerId,
        detail:
          `${target?.result.overall ?? "?"} → ${override.overriddenVerdict}` +
          (override.note ? ` · ${override.note}` : ""),
      });
    },
    [logs, logEvent],
  );

  const latestForContainer = useCallback(
    (containerId: string) =>
      // logs are newest-first, so the first hit is the latest attempt
      logs.find((l) => l.containerId === containerId),
    [logs],
  );

  const clearAll = useCallback(
    (actor?: string) => {
      setLogs([]);
      logEvent({ kind: "data_reset", actor, detail: "ลบประวัติการตรวจสอบทั้งหมด" });
    },
    [logEvent],
  );

  const resetToSeed = useCallback((actor?: string) => {
    const seeded = generateSeed(Date.now());
    const ts = Date.now();
    setLogs(seeded.logs);
    setEvents([
      {
        id: makeId("E", ts),
        ts,
        kind: "data_reset",
        actor,
        detail: "รีเซ็ตข้อมูลตัวอย่าง (สร้างประวัติจำลองใหม่)",
      },
      ...seeded.events,
    ]);
  }, []);

  const value = useMemo<LogStore>(
    () => ({
      logs,
      events,
      addLog,
      applyOverride,
      logEvent,
      latestForContainer,
      clearAll,
      resetToSeed,
    }),
    [logs, events, addLog, applyOverride, logEvent, latestForContainer, clearAll, resetToSeed],
  );

  return (
    <LogStoreContext.Provider value={value}>
      {children}
    </LogStoreContext.Provider>
  );
}

export function useLogStore(): LogStore {
  const ctx = useContext(LogStoreContext);
  if (!ctx) {
    throw new Error("useLogStore must be used within a LogStoreProvider");
  }
  return ctx;
}
