import type { LockStatus, Verdict } from "@/types";

// Thai-primary formatting helpers. Technical terms (Pass/Fail/Locked/…) stay in
// English per the UI language spec; surrounding copy is Thai.

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("th-TH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function formatDate(ts: number): string {
  return dateFmt.format(new Date(ts));
}

export function formatTime(ts: number): string {
  return timeFmt.format(new Date(ts));
}

export function formatDateTime(ts: number): string {
  return `${formatDate(ts)} · ${formatTime(ts)}`;
}

/** yyyy-mm-dd in local time, for <input type="date"> and range filtering. */
export function toDateInputValue(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatConfidence(c: number): string {
  return `${Math.round(c * 100)}%`;
}

/** Thai label for a per-side lock status (English term retained in parentheses). */
export function lockStatusLabel(status: LockStatus): string {
  switch (status) {
    case "Locked":
      return "Locked · ล็อกแล้ว";
    case "Unlocked":
      return "Unlocked · ยังไม่ล็อก";
    case "NotVisible":
      return "Not Visible · มองไม่เห็น";
  }
}

export function verdictLabel(v: Verdict): string {
  switch (v) {
    case "Pass":
      return "PASS";
    case "Fail":
      return "FAIL";
    case "Uncertain":
      return "UNCERTAIN";
  }
}
