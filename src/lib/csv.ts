import type { VerificationLog } from "@/types";
import { effectiveVerdict } from "@/types";
import { formatDate, formatTime } from "./format";

function esc(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADERS = [
  "ID",
  "Date",
  "Time",
  "Station",
  "Employee",
  "Side A",
  "Side A Confidence",
  "Side B",
  "Side B Confidence",
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
      formatDate(log.timestamp),
      formatTime(log.timestamp),
      log.stationId,
      log.employeeId,
      r.sideA.status,
      r.sideA.confidence,
      r.sideB.status,
      r.sideB.confidence,
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
  return "﻿" + [HEADERS.join(","), ...rows].join("\r\n");
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
