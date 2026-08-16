import { SIDE_KEYS, effectiveVerdict, isAuditKind } from "@/types";
import type { AppEvent, VerificationLog } from "@/types";
import { userName } from "@/data/auth";
import { formatDate, formatTime } from "./format";

function esc(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const LOG_HEADERS = [
  "ID",
  "Container ID",
  "Attempt",
  "Date",
  "Time",
  "Station",
  "Employee",
  ...SIDE_KEYS.flatMap((k) => [`Side ${k}`, `Side ${k} Confidence`]),
  "Model Verdict",
  "Model Confidence",
  "Final Verdict",
  "Overridden",
  "Supervisor",
  "Override Note",
];

export function logsToCsv(logs: VerificationLog[]): string {
  const rows = logs.map((log) => {
    const r = log.result;
    return [
      log.id,
      log.containerId,
      log.attempt === "rework" ? "Rework" : "Initial",
      formatDate(log.timestamp),
      formatTime(log.timestamp),
      log.stationId,
      log.employeeId,
      ...SIDE_KEYS.flatMap((k) => [r.sides[k].status, r.sides[k].confidence]),
      r.overall,
      r.confidence,
      effectiveVerdict(log),
      log.override ? "yes" : "no",
      log.override?.supervisorId ?? "",
      log.override?.note ?? "",
    ]
      .map(esc)
      .join(",");
  });
  // BOM so Excel opens the Thai columns/labels in UTF-8 correctly.
  return "﻿" + [LOG_HEADERS.join(","), ...rows].join("\r\n");
}

const EVENT_HEADERS = [
  "ID",
  "Date",
  "Time",
  "Event",
  "Audit",
  "Actor ID",
  "Actor Name",
  "Station",
  "Container ID",
  "Detail",
];

export function eventsToCsv(events: AppEvent[]): string {
  const rows = events.map((e) =>
    [
      e.id,
      formatDate(e.ts),
      formatTime(e.ts),
      e.kind,
      isAuditKind(e.kind) ? "yes" : "no",
      e.actor ?? "",
      e.actor ? userName(e.actor) : "",
      e.stationId ?? "",
      e.containerId ?? "",
      e.detail ?? "",
    ]
      .map(esc)
      .join(","),
  );
  return "﻿" + [EVENT_HEADERS.join(","), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
