import { useMemo, useState } from "react";
import { Search, Download, RotateCcw, Inbox, ShieldCheck, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCards } from "./StatsCards";
import { LogThumbnail } from "./LogThumbnail";
import { LogDetailDialog } from "./LogDetailDialog";
import { VerdictBadge } from "@/components/VerdictBadge";
import { Badge } from "@/components/ui/badge";
import { useLogStore } from "@/data/store";
import { useAuth, userName } from "@/data/auth";
import { STATIONS, stationName } from "@/data/constants";
import { exportLogsExcel } from "@/lib/excel";
import { formatDate, formatTime, lockStatusLabel, toDateInputValue } from "@/lib/format";
import {
  SIDE_KEYS,
  effectiveVerdict,
  type AttemptType,
  type LockStatus,
  type VerificationLog,
  type Verdict,
} from "@/types";
import { LOCK_VISUAL } from "@/components/verdict-visual";
import { cn } from "@/lib/utils";

type VerdictFilter = "all" | Verdict;
type AttemptFilter = "all" | AttemptType;

export function HistoryView() {
  const { logs, resetToSeed } = useLogStore();
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<VerdictFilter>("all");
  const [attempt, setAttempt] = useState<AttemptFilter>("all");
  const [station, setStation] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => (selectedId ? logs.find((l) => l.id === selectedId) ?? null : null),
    [logs, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (verdict !== "all" && effectiveVerdict(log) !== verdict) return false;
      if (attempt !== "all" && log.attempt !== attempt) return false;
      if (station !== "all" && log.stationId !== station) return false;
      if (dateFrom && toDateInputValue(log.timestamp) < dateFrom) return false;
      if (dateTo && toDateInputValue(log.timestamp) > dateTo) return false;
      if (q) {
        const hay =
          `${log.id} ${log.containerId} ${log.employeeId} ${userName(log.employeeId)} ${log.stationId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, query, verdict, attempt, station, dateFrom, dateTo]);

  const hasFilters =
    Boolean(query) ||
    verdict !== "all" ||
    attempt !== "all" ||
    station !== "all" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  function clearFilters() {
    setQuery("");
    setVerdict("all");
    setAttempt("all");
    setStation("all");
    setDateFrom("");
    setDateTo("");
  }

  function handleExport() {
    exportLogsExcel(filtered, `ube-logs-${toDateInputValue(Date.now())}.xlsx`);
  }

  return (
    <div className="flex flex-col gap-6">
      <StatsCards logs={logs} />

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card/40 p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา Container ID / รายการ / พนักงาน / สถานี…"
              className="pl-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 xl:flex xl:items-end">
            <FilterField label="ผลลัพธ์">
              <Select
                value={verdict}
                onValueChange={(v) => setVerdict(v as VerdictFilter)}
              >
                <SelectTrigger className="w-full xl:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                  <SelectItem value="Uncertain">Uncertain</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="ประเภทงาน">
              <Select
                value={attempt}
                onValueChange={(v) => setAttempt(v as AttemptFilter)}
              >
                <SelectTrigger className="w-full xl:w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="initial">งานใหม่</SelectItem>
                  <SelectItem value="rework">Rework</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="สถานี">
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger className="w-full xl:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานี</SelectItem>
                  {STATIONS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.id}
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
                className="w-full xl:w-[150px]"
              />
            </FilterField>

            <FilterField label="ถึงวันที่">
              <DatePicker
                value={dateTo}
                min={dateFrom || undefined}
                onChange={setDateTo}
                placeholder="ถึงวันที่"
                className="w-full xl:w-[150px]"
              />
            </FilterField>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {filtered.length} / {logs.length} รายการ
            </span>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={clearFilters}
              >
                <RotateCcw className="size-3" /> ล้างตัวกรอง
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => resetToSeed(currentUser?.id)}
              title="สร้างข้อมูลตัวอย่างใหม่ (POC)"
            >
              <RotateCcw className="size-3.5" /> รีเซ็ตข้อมูลตัวอย่าง
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={!filtered.length}
            >
              <Download /> ส่งออก Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <LogTable logs={filtered} onSelect={(log) => setSelectedId(log.id)} />
      )}

      <LogDetailDialog log={selected} onOpenChange={(o) => !o && setSelectedId(null)} />
    </div>
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

function LogTable({
  logs,
  onSelect,
}: {
  logs: VerificationLog[];
  onSelect: (log: VerificationLog) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/40 panel-glow">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Frames</th>
              <th className="px-4 py-3 font-medium">ตู้ (Container)</th>
              <th className="px-4 py-3 font-medium">วันที่ / เวลา</th>
              <th className="px-4 py-3 font-medium">สถานี</th>
              <th className="px-4 py-3 font-medium">ผู้ตรวจ</th>
              <th className="px-4 py-3 font-medium">ด้าน A–D</th>
              <th className="px-4 py-3 font-medium">ผล</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <LogRow key={log.id} log={log} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogRow({
  log,
  onSelect,
}: {
  log: VerificationLog;
  onSelect: (log: VerificationLog) => void;
}) {
  const final = effectiveVerdict(log);
  return (
    <tr
      onClick={() => onSelect(log)}
      className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/30"
    >
      <td className="px-4 py-2.5">
        <div className="grid w-[76px] grid-cols-2 gap-0.5">
          {SIDE_KEYS.map((k) => (
            <LogThumbnail
              key={k}
              src={log.images?.[k]}
              label={k}
              className="h-7 w-9"
            />
          ))}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="font-mono text-xs font-semibold text-foreground">
          {log.containerId}
        </div>
        {log.attempt === "rework" && (
          <Badge variant="uncertain" className="mt-1 gap-1 px-1.5 py-0 text-[10px]">
            <Wrench className="size-2.5" /> Rework
          </Badge>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="text-foreground/90">{formatDate(log.timestamp)}</div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {formatTime(log.timestamp)} น.
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="font-mono text-xs text-foreground/90">{log.stationId}</div>
        <div className="max-w-[140px] truncate text-[11px] text-muted-foreground">
          {stationName(log.stationId)}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="text-foreground/90">{userName(log.employeeId)}</div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {log.employeeId}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {SIDE_KEYS.map((k) => (
            <SideChip key={k} side={k} status={log.result.sides[k].status} />
          ))}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-col items-start gap-1">
          <VerdictBadge verdict={final} />
          {log.override && (
            <Badge variant="hazard" className="gap-1 px-1.5 py-0 text-[10px]">
              <ShieldCheck className="size-2.5" /> Override
            </Badge>
          )}
        </div>
      </td>
    </tr>
  );
}

function SideChip({ side, status }: { side: string; status: LockStatus }) {
  const v = LOCK_VISUAL[status];
  const Icon = v.icon;
  return (
    <span className="flex items-center gap-1.5 text-[11px]">
      <span className="font-mono text-muted-foreground">{side}</span>
      <Icon className={cn("size-3", v.text)} />
      <span className={cn("font-medium", v.text)}>
        {lockStatusLabel(status).split(" · ")[0]}
      </span>
    </span>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/30 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-secondary/50">
        <Inbox className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">
        {hasFilters
          ? "ไม่พบรายการที่ตรงกับตัวกรอง"
          : "ยังไม่มีประวัติการตรวจสอบ"}
      </p>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear}>
          <RotateCcw /> ล้างตัวกรอง
        </Button>
      )}
    </div>
  );
}
