import type {
  LockStatus,
  SideResult,
  VerificationLog,
  VerificationResult,
  Verdict,
} from "@/types";
import { EMPLOYEES, STATIONS, SUPERVISORS } from "./constants";

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

function buildResult(a: LockStatus, b: LockStatus): VerificationResult {
  const sideA = side(a);
  const sideB = side(b);
  const confidence = round2(Math.min(sideA.confidence, sideB.confidence));
  let overall: Verdict = "Pass";
  if (a === "NotVisible" || b === "NotVisible") overall = "Fail";
  else if (a === "Unlocked" || b === "Unlocked") overall = "Fail";
  else if (confidence < 0.72) overall = "Uncertain";
  return { sideA, sideB, overall, confidence, containerPresent: true };
}

const COMBOS: Array<[LockStatus, LockStatus, number]> = [
  ["Locked", "Locked", 60],
  ["Locked", "Unlocked", 14],
  ["Unlocked", "Locked", 12],
  ["Unlocked", "Unlocked", 6],
  ["Locked", "NotVisible", 5],
  ["NotVisible", "Locked", 3],
];

function pickCombo(): [LockStatus, LockStatus] {
  const total = COMBOS.reduce((s, [, , w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [a, b, w] of COMBOS) {
    r -= w;
    if (r <= 0) return [a, b];
  }
  return ["Locked", "Locked"];
}

export function generateSeedLogs(now: number): VerificationLog[] {
  const logs: VerificationLog[] = [];
  const count = 28;
  const operators = EMPLOYEES.filter((e) => e.role === "operator");

  for (let i = 0; i < count; i++) {
    // Spread across the last ~6 days, clustered in working hours.
    const daysAgo = Math.floor(rand(0, 6));
    const hour = Math.floor(rand(8, 18));
    const minute = Math.floor(rand(0, 60));
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, Math.floor(rand(0, 60)), 0);
    const timestamp = d.getTime();
    if (timestamp > now) continue;

    const [a, b] = pickCombo();
    const result = buildResult(a, b);
    const emp = pick(operators);
    const station = pick(STATIONS);

    const log: VerificationLog = {
      id: `V-${timestamp.toString(36).toUpperCase()}-${i}`,
      timestamp,
      stationId: station.id,
      employeeId: emp.id,
      result,
    };

    // ~15% of Fails get a supervisor override (false-positive correction),
    // which is exactly the retraining signal we want to capture.
    if (result.overall !== "Pass" && Math.random() < 0.18) {
      const sup = pick(SUPERVISORS);
      log.override = {
        overriddenVerdict: "Pass",
        supervisorId: sup.id,
        note: "ตรวจสอบด้วยสายตาแล้วล็อกเรียบร้อย (แก้ไขผลที่ระบบอ่านผิด)",
        at: timestamp + 45_000,
      };
    }

    logs.push(log);
  }

  return logs.sort((x, y) => y.timestamp - x.timestamp);
}
