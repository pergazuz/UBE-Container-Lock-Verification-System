import { useMemo, useState } from "react";
import { Download, EyeOff, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLogStore } from "@/data/store";
import { useAuth, userName } from "@/data/auth";
import { eventsToCsv, downloadCsv } from "@/lib/csv";
import { formatDate, formatTime, toDateInputValue } from "@/lib/format";
import { isAuditKind, type AppEvent, type EventKind } from "@/types";

// ---------------------------------------------------------------------------
// The user log: verification events + audit events (login, override, settings,
// user management) in one chronological record — pipe_counting-style. Line
// data is shared; personnel data is not: operators see the verification
// events, sign-ins and admin actions stay with the supervisors.
// ---------------------------------------------------------------------------

const KIND_META: Record<EventKind, { label: string; variant: BadgeProps["variant"] }> = {
  verify_pass: { label: "ตรวจสอบ · PASS", variant: "pass" },
  verify_fail: { label: "ตรวจสอบ · FAIL", variant: "fail" },
  verify_uncertain: { label: "ตรวจสอบ · UNCERTAIN", variant: "uncertain" },
  override: { label: "แก้ไขผล (Override)", variant: "hazard" },
  login: { label: "เข้าสู่ระบบ", variant: "default" },
  logout: { label: "ออกจากระบบ", variant: "default" },
  login_failed: { label: "เข้าสู่ระบบไม่สำเร็จ", variant: "fail" },
  user_created: { label: "สร้างผู้ใช้", variant: "hazard" },
  user_updated: { label: "แก้ไขผู้ใช้", variant: "uncertain" },
  settings_changed: { label: "แก้ไขการตั้งค่า", variant: "uncertain" },
  data_reset: { label: "รีเซ็ตข้อมูล", variant: "outline" },
};

const KIND_ORDER: EventKind[] = [
  "verify_pass",
  "verify_fail",
  "verify_uncertain",
  "override",
  "login",
  "logout",
  "login_failed",
  "user_created",
  "user_updated",
  "settings_changed",
  "data_reset",
];

/** Rendered-row cap so a long history doesn't lock the table up. */
const MAX_ROWS = 500;

export function LogsView() {
  const { events } = useLogStore();
  const { currentUser } = useAuth();
  const [kind, setKind] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const seesAll = currentUser?.role === "supervisor";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => seesAll || !isAuditKind(e.kind))
      .filter((e) => kind === "all" || e.kind === kind)
      .filter((e) => {
        const day = toDateInputValue(e.ts);
        if (dateFrom && day < dateFrom) return false;
        if (dateTo && day > dateTo) return false;
        return true;
      })
      .filter((e) => {
        if (!q) return true;
        const hay =
          `${e.actor ?? ""} ${e.actor ? userName(e.actor) : ""} ${e.containerId ?? ""} ${e.stationId ?? ""} ${e.detail ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [events, seesAll, kind, query, dateFrom, dateTo]);

  const display = filtered.slice(0, MAX_ROWS);

  const hasFilters =
    kind !== "all" || Boolean(query) || Boolean(dateFrom) || Boolean(dateTo);

  // Operators never get an audit kind in the dropdown — picking one would only
  // ever return an empty table.
  const kindOptions = seesAll
    ? KIND_ORDER
    : KIND_ORDER.filter((k) => !isAuditKind(k));

  return (
    <div className="flex flex-col gap-4">
      {!seesAll && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-2.5 text-xs font-medium text-muted-foreground">
          <EyeOff className="size-3.5" />
          แสดงเฉพาะเหตุการณ์การตรวจสอบ — เหตุการณ์บัญชีผู้ใช้และการตั้งค่าระบบเห็นได้เฉพาะหัวหน้างาน
        </div>
      )}

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา ผู้ใช้ / Container ID / รายละเอียด…"
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:items-end">
            <FilterField label="เหตุการณ์">
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-full lg:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {kindOptions.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_META[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="ตั้งแต่วันที่">
              <DatePicker
                value={dateFrom}
                max={dateTo || undefined}
                onChange={setDateFrom}
                placeholder="ตั้งแต่วันที่"
                className="w-full lg:w-[150px]"
              />
            </FilterField>
            <FilterField label="ถึงวันที่">
              <DatePicker
                value={dateTo}
                min={dateFrom || undefined}
                onChange={setDateTo}
                placeholder="ถึงวันที่"
                className="w-full lg:w-[150px]"
              />
            </FilterField>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {display.length < filtered.length
                ? `${display.length} / ${filtered.length} เหตุการณ์ (แสดงล่าสุด)`
                : `${filtered.length} เหตุการณ์`}
            </span>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  setKind("all");
                  setQuery("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                <RotateCcw className="size-3" /> ล้างตัวกรอง
              </Button>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadCsv(
                `ube-events-${toDateInputValue(Date.now())}.csv`,
                eventsToCsv(filtered),
              )
            }
            disabled={!filtered.length}
          >
            <Download /> ส่งออก CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card/40 panel-glow">
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-secondary/90 backdrop-blur">
              <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">เวลา</th>
                <th className="px-4 py-3 font-medium">เหตุการณ์</th>
                <th className="px-4 py-3 font-medium">ผู้ใช้</th>
                <th className="px-4 py-3 font-medium">สถานี</th>
                <th className="px-4 py-3 font-medium">ตู้ (Container)</th>
                <th className="px-4 py-3 font-medium">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {display.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
              {!display.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: AppEvent }) {
  const meta = KIND_META[event.kind];
  const actorName = event.actor ? userName(event.actor) : null;
  return (
    <tr className="border-b border-border/60 last:border-0 hover:bg-secondary/30">
      <td className="whitespace-nowrap px-4 py-2.5">
        <div className="text-foreground/90">{formatDate(event.ts)}</div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {formatTime(event.ts)} น.
        </div>
      </td>
      <td className="px-4 py-2.5">
        <Badge variant={meta.variant} className="whitespace-nowrap">
          {meta.label}
        </Badge>
      </td>
      <td className="px-4 py-2.5">
        {event.actor ? (
          <>
            <div className="text-foreground/90">{actorName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {event.actor}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-foreground/90">
        {event.stationId ?? "—"}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-foreground/90">
        {event.containerId ?? "—"}
      </td>
      <td
        className="max-w-[360px] truncate px-4 py-2.5 text-xs text-muted-foreground"
        title={event.detail}
      >
        {event.detail ?? "—"}
      </td>
    </tr>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
