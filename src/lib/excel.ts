import { SIDE_KEYS, effectiveVerdict, isAuditKind } from "@/types";
import type { AppEvent, VerificationLog } from "@/types";
import { userName } from "@/data/auth";
import { formatDate, formatTime } from "./format";

// ---------------------------------------------------------------------------
// Excel (.xlsx) export for the verification history and the event log.
// Real workbooks rather than CSV so Thai text and columns open correctly in
// Excel on any locale, no BOM/list-separator games required.
// SheetJS is heavy (~100KB gzip), so it's imported lazily on first export
// instead of riding in the main bundle.
// ---------------------------------------------------------------------------

type Cell = string | number;

const LOG_HEADERS = [
  "ID",
  "Container ID",
  "Attempt",
  "Date",
  "Time",
  "Station",
  "Employee ID",
  "Employee",
  ...SIDE_KEYS.flatMap((k) => [`Side ${k}`, `Side ${k} Confidence`]),
  "Model Verdict",
  "Model Confidence",
  "Final Verdict",
  "Overridden",
  "Supervisor",
  "Override Note",
];

function logRow(log: VerificationLog): Cell[] {
  const r = log.result;
  return [
    log.id,
    log.containerId,
    log.attempt === "rework" ? "Rework" : "Initial",
    formatDate(log.timestamp),
    formatTime(log.timestamp),
    log.stationId,
    log.employeeId,
    userName(log.employeeId),
    ...SIDE_KEYS.flatMap((k) => [r.sides[k].status, r.sides[k].confidence]),
    r.overall,
    r.confidence,
    effectiveVerdict(log),
    log.override ? "yes" : "no",
    log.override?.supervisorId ?? "",
    log.override?.note ?? "",
  ];
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

function eventRow(e: AppEvent): Cell[] {
  return [
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
  ];
}

/** Build the workbook (columns sized to content) and trigger the download. */
async function download(
  headers: string[],
  rows: Cell[][],
  sheetName: string,
  filename: string,
) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map((h, i) => ({
    wch: Math.min(
      42,
      Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length)) + 2,
    ),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  XLSX.writeFile(wb, filename);
}

export function exportLogsExcel(logs: VerificationLog[], filename: string) {
  void download(LOG_HEADERS, logs.map(logRow), "Verifications", filename);
}

export function exportEventsExcel(events: AppEvent[], filename: string) {
  void download(EVENT_HEADERS, events.map(eventRow), "Events", filename);
}
