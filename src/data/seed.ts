import {
  SIDE_KEYS,
  type AppEvent,
  type LockStatus,
  type SideImages,
  type SideKey,
  type SideResult,
  type VerificationLog,
  type VerificationResult,
  type Verdict,
} from "@/types";
import { EMPLOYEES, SAMPLE_VIDEOS, STATIONS, SUPERVISORS } from "./constants";

// Deterministic-ish demo history so the dashboard isn't empty on first run.
// (Uses Math.random once at seed time; results are then persisted.)

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function side(status: LockStatus): SideResult {
  const confidence =
    status === "Locked"
      ? rand(0.78, 0.98)
      : status === "Unlocked"
        ? rand(0.7, 0.96)
        : rand(0.4, 0.65);
  return { status, confidence: round2(confidence) };
}

/** Random per-side status; rework attempts skew heavily to Locked. */
function pickStatus(rework: boolean): LockStatus {
  const r = Math.random() * 100;
  if (rework) return r < 88 ? "Locked" : r < 96 ? "Unlocked" : "NotVisible";
  return r < 80 ? "Locked" : r < 93 ? "Unlocked" : "NotVisible";
}

function buildResult(statuses: Record<SideKey, LockStatus>): VerificationResult {
  const sides = Object.fromEntries(
    SIDE_KEYS.map((k) => [k, side(statuses[k])]),
  ) as Record<SideKey, SideResult>;
  const confidence = round2(
    Math.min(...SIDE_KEYS.map((k) => sides[k].confidence)),
  );
  const anyNotVisible = SIDE_KEYS.some((k) => statuses[k] === "NotVisible");
  const anyUnlocked = SIDE_KEYS.some((k) => statuses[k] === "Unlocked");
  let overall: Verdict = "Pass";
  if (anyNotVisible || anyUnlocked) overall = "Fail";
  else if (confidence < 0.72) overall = "Uncertain";
  return { sides, overall, confidence, containerPresent: true };
}

function randomStatuses(rework: boolean): Record<SideKey, LockStatus> {
  return Object.fromEntries(
    SIDE_KEYS.map((k) => [k, pickStatus(rework)]),
  ) as Record<SideKey, LockStatus>;
}

const FRAME_BASE = `${import.meta.env.BASE_URL}frames/`;
const LOCKED_FRAMES = SAMPLE_VIDEOS.filter((v) => v.finalStatus === "Locked").map(
  (v) => `${FRAME_BASE}f-${v.id}.jpg`,
);
const UNLOCKED_FRAMES = SAMPLE_VIDEOS.filter(
  (v) => v.finalStatus === "Unlocked",
).map((v) => `${FRAME_BASE}f-${v.id}.jpg`);
/** Blurred/darkened stills — the camera's view when the latch isn't visible. */
const OBSCURED_FRAMES = ["3cd8a0f9", "c6f63c2d"].map(
  (id) => `${FRAME_BASE}nv-${id}.jpg`,
);

function frameFor(status: LockStatus): string {
  const pool =
    status === "Locked"
      ? LOCKED_FRAMES
      : status === "Unlocked"
        ? UNLOCKED_FRAMES
        : OBSCURED_FRAMES;
  return pick(pool);
}

function imagesFor(result: VerificationResult): SideImages {
  return Object.fromEntries(
    SIDE_KEYS.map((k) => [k, frameFor(result.sides[k].status)]),
  ) as SideImages;
}

/** QR payload used as the container's primary key, e.g. "UBE-7K2FQ9". */
function mkContainerId(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 34)];
  }
  return `UBE-${s}`;
}

const verifyKind = (v: Verdict) =>
  v === "Pass" ? "verify_pass" : v === "Fail" ? "verify_fail" : "verify_uncertain";

export interface SeedData {
  logs: VerificationLog[];
  events: AppEvent[];
}

export function generateSeed(now: number): SeedData {
  const logs: VerificationLog[] = [];
  const count = 26;
  const operators = EMPLOYEES.filter((e) => e.role === "operator");
  let seq = 0;

  const mkLog = (
    timestamp: number,
    containerId: string,
    attempt: VerificationLog["attempt"],
    result: VerificationResult,
    employeeId: string,
    stationId: string,
  ): VerificationLog => ({
    id: `V-${timestamp.toString(36).toUpperCase()}-${seq++}`,
    containerId,
    attempt,
    timestamp,
    stationId,
    employeeId,
    images: imagesFor(result),
    result,
  });

  for (let i = 0; i < count; i++) {
    // Spread across the last ~6 days, clustered in working hours.
    const daysAgo = Math.floor(rand(0, 6));
    const hour = Math.floor(rand(8, 17));
    const minute = Math.floor(rand(0, 60));
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, Math.floor(rand(0, 60)), 0);
    const timestamp = d.getTime();
    if (timestamp > now) continue;

    const result = buildResult(randomStatuses(false));
    const emp = pick(operators);
    const station = pick(STATIONS);
    const containerId = mkContainerId();

    const log = mkLog(timestamp, containerId, "initial", result, emp.id, station.id);

    if (result.overall !== "Pass") {
      if (Math.random() < 0.55) {
        // The container came back after fixing → a rework attempt on the same
        // ID, usually passing this time.
        const reworkTs = timestamp + Math.floor(rand(20, 150)) * 60_000;
        if (reworkTs < now) {
          logs.push(
            mkLog(
              reworkTs,
              containerId,
              "rework",
              buildResult(randomStatuses(true)),
              pick(operators).id,
              station.id,
            ),
          );
        }
      } else if (Math.random() < 0.35) {
        // Others get a supervisor override (false-positive correction) —
        // exactly the retraining signal we want to capture.
        const sup = pick(SUPERVISORS);
        log.override = {
          overriddenVerdict: "Pass",
          supervisorId: sup.id,
          note: "ตรวจสอบด้วยสายตาแล้วล็อกเรียบร้อย (แก้ไขผลที่ระบบอ่านผิด)",
          at: timestamp + 45_000,
        };
      }
    }

    logs.push(log);
  }

  logs.sort((x, y) => y.timestamp - x.timestamp);

  // ---- Events: one verify event per log, plus overrides and daily logins ----
  const events: AppEvent[] = [];
  let eseq = 0;
  const mkEvent = (e: Omit<AppEvent, "id">): AppEvent => ({
    id: `E-${e.ts.toString(36).toUpperCase()}-${eseq++}`,
    ...e,
  });

  for (const log of logs) {
    events.push(
      mkEvent({
        ts: log.timestamp,
        kind: verifyKind(log.result.overall),
        actor: log.employeeId,
        stationId: log.stationId,
        containerId: log.containerId,
        detail:
          log.attempt === "rework"
            ? `งานแก้ไข (Rework) · ${log.result.overall}`
            : log.result.reason,
      }),
    );
    if (log.override) {
      events.push(
        mkEvent({
          ts: log.override.at,
          kind: "override",
          actor: log.override.supervisorId,
          stationId: log.stationId,
          containerId: log.containerId,
          detail: `${log.result.overall} → ${log.override.overriddenVerdict} · ${log.override.note ?? ""}`,
        }),
      );
    }
  }

  // A morning login per operator that verified that day.
  const byDay = new Map<string, Set<string>>();
  for (const log of logs) {
    const day = new Date(log.timestamp).toDateString();
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day)!.add(log.employeeId);
  }
  for (const [day, actors] of byDay) {
    for (const actor of actors) {
      const d = new Date(day);
      d.setHours(7, Math.floor(rand(30, 59)), Math.floor(rand(0, 60)), 0);
      events.push(mkEvent({ ts: d.getTime(), kind: "login", actor }));
    }
  }

  events.sort((x, y) => y.ts - x.ts);

  return { logs, events };
}
