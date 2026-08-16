import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  SlidersHorizontal,
  Camera,
  Database,
  Info,
  Download,
  RotateCcw,
  Trash2,
  ShieldAlert,
  Volume2,
  Check,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSettings, type Settings } from "@/data/settings";
import { useLogStore } from "@/data/store";
import { useAuth } from "@/data/auth";
import { CONTAINER_TYPES, STATIONS } from "@/data/constants";
import { logsToCsv, downloadCsv } from "@/lib/csv";
import { toDateInputValue } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { settings, update, reset } = useSettings();
  const { logs, clearAll, resetToSeed, logEvent } = useLogStore();
  const { currentUser } = useAuth();
  const [confirmClear, setConfirmClear] = useState(false);

  // Verification criteria and station availability are supervisor decisions;
  // operators get a read-only view of both.
  const isSupervisor = currentUser?.role === "supervisor";

  // Collapse rapid changes (e.g. dragging the threshold slider) into one
  // settings_changed event so the user log stays readable.
  const pending = useRef(new Map<string, string>());
  const timer = useRef<number | undefined>(undefined);
  const flush = useCallback(() => {
    if (!pending.current.size) return;
    logEvent({
      kind: "settings_changed",
      actor: currentUser?.id,
      detail: [...pending.current.values()].join(" · "),
    });
    pending.current.clear();
  }, [logEvent, currentUser]);

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    flush();
  }, [flush]);

  const change = useCallback(
    (patch: Partial<Settings>, field: string, detail: string) => {
      update(patch);
      pending.current.set(field, detail);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 1500);
    },
    [update, flush],
  );

  const pct = Math.round(settings.confidenceThreshold * 100);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <Check className="size-3 text-pass" />
          บันทึกอัตโนมัติ
        </Badge>
      </div>

      {/* ---- Verification ---- */}
      <Section
        icon={<SlidersHorizontal className="size-4" />}
        title="การตรวจสอบ (Verification)"
        desc="เกณฑ์การตัดสินผลและชนิดคอนเทนเนอร์"
      >
        {!isSupervisor && <SupervisorOnlyNote />}

        <Row
          label="เกณฑ์ความมั่นใจขั้นต่ำ · Confidence threshold"
          hint="ถ้าโมเดลมั่นใจต่ำกว่าค่านี้ ผลจะเป็น Uncertain และขอให้ตรวจซ้ำ — ตั้งสูงขึ้น = เข้มงวดขึ้น (ลดโอกาส Pass ผิดพลาด)"
        >
          <div className="flex w-full items-center gap-3 sm:w-72">
            <input
              type="range"
              min={50}
              max={95}
              step={1}
              value={pct}
              disabled={!isSupervisor}
              onChange={(e) =>
                change(
                  { confidenceThreshold: Number(e.target.value) / 100 },
                  "threshold",
                  `เกณฑ์ความมั่นใจ → ${e.target.value}%`,
                )
              }
              className="h-1.5 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="tabular w-12 text-right font-mono text-sm font-semibold text-primary">
              {pct}%
            </span>
          </div>
        </Row>

        <Separator />

        <Row
          label="ชนิดคอนเทนเนอร์ · Container type"
          hint="v1 รองรับชนิดมาตรฐาน 1 แบบ — ออกแบบให้เพิ่มชนิดอื่นได้ในอนาคต"
        >
          <Select
            value={settings.containerType}
            disabled={!isSupervisor}
            onValueChange={(v) =>
              change({ containerType: v }, "containerType", `ชนิดคอนเทนเนอร์ → ${v}`)
            }
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTAINER_TYPES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
      </Section>

      {/* ---- Cameras ---- */}
      <Section
        icon={<Camera className="size-4" />}
        title="กล้อง & แหล่งภาพ (Cameras)"
        desc="ค่าเริ่มต้นของกล้องประจำสถานี"
      >
        <Row
          label="เสียงแจ้งผล · Sound on result"
          hint="เล่นเสียงสั้น ๆ เมื่อได้ผล Pass / Fail"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="size-4 text-muted-foreground" />
            <Switch
              checked={settings.soundOnResult}
              onCheckedChange={(v) =>
                change(
                  { soundOnResult: v },
                  "sound",
                  `เสียงแจ้งผล → ${v ? "เปิด" : "ปิด"}`,
                )
              }
            />
          </div>
        </Row>

        <Separator />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
              สถานีที่ตั้งค่าไว้ · Stations ({STATIONS.length})
            </span>
            {!isSupervisor && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Lock className="size-3" /> เปิด/ปิดสถานีได้เฉพาะหัวหน้างาน
              </span>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {STATIONS.map((s) => {
              const closed = settings.closedStations.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-lg border border-border bg-secondary/30 p-3 transition-opacity",
                    closed && "opacity-70",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {s.id}
                    </span>
                    <Badge
                      variant={closed ? "fail" : "pass"}
                      className="px-1.5 py-0 text-[10px]"
                    >
                      {closed ? "ปิด" : "เปิด"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {s.name}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="hazard" className="px-1.5 py-0 text-[10px]">
                        4 CAM
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        A · B · C · D
                      </span>
                    </div>
                    {isSupervisor && (
                      <Switch
                        checked={!closed}
                        onCheckedChange={(open) => {
                          update({
                            closedStations: open
                              ? settings.closedStations.filter((id) => id !== s.id)
                              : [...settings.closedStations, s.id],
                          });
                          logEvent({
                            kind: "settings_changed",
                            actor: currentUser?.id,
                            stationId: s.id,
                            detail: `${open ? "เปิด" : "ปิด"}ใช้งานสถานี ${s.id} (${s.name})`,
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* ---- Data ---- */}
      <Section
        icon={<Database className="size-4" />}
        title="ข้อมูล (Data)"
        desc="จัดการประวัติการตรวจสอบที่เก็บในเครื่อง"
      >
        <Row
          label="ประวัติการตรวจสอบ"
          hint={`มีทั้งหมด ${logs.length} รายการ (เก็บใน localStorage ของเบราว์เซอร์)`}
        >
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!logs.length}
              onClick={() =>
                downloadCsv(
                  `ube-logs-${toDateInputValue(Date.now())}.csv`,
                  logsToCsv(logs),
                )
              }
            >
              <Download /> ส่งออกทั้งหมด (CSV)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => resetToSeed(currentUser?.id)}
            >
              <RotateCcw /> รีเซ็ตข้อมูลตัวอย่าง
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!logs.length}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 /> ลบประวัติทั้งหมด
            </Button>
          </div>
        </Row>

        <Separator />

        <Row
          label="รีเซ็ตการตั้งค่า"
          hint="คืนค่าการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้น"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!isSupervisor}
            title={!isSupervisor ? "รีเซ็ตได้เฉพาะหัวหน้างาน" : undefined}
            onClick={() => {
              reset();
              logEvent({
                kind: "settings_changed",
                actor: currentUser?.id,
                detail: "คืนค่าการตั้งค่าทั้งหมดเป็นค่าเริ่มต้น",
              });
            }}
          >
            <RotateCcw /> คืนค่าเริ่มต้น
          </Button>
        </Row>
      </Section>

      {/* ---- About ---- */}
      <Section
        icon={<Info className="size-4" />}
        title="เกี่ยวกับระบบ (About)"
        desc="ข้อมูลเวอร์ชันและเทคโนโลยี"
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <About label="ระบบ" value="UBE Container Lock Verification" />
        </div>
      </Section>

      {/* ---- Confirm clear dialog ---- */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg border border-fail/30 bg-fail/10">
              <ShieldAlert className="size-5 text-fail" />
            </div>
            <DialogTitle>ลบประวัติทั้งหมด?</DialogTitle>
            <DialogDescription>
              การกระทำนี้จะลบรายการตรวจสอบทั้งหมด ({logs.length} รายการ)
              ออกจากเครื่องอย่างถาวร ไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmClear(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearAll(currentUser?.id);
                setConfirmClear(false);
              }}
            >
              <Trash2 /> ลบทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Shown to operators atop sections whose controls only supervisors may edit. */
function SupervisorOnlyNote() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
      <Lock className="size-3.5 shrink-0" />
      ดูได้อย่างเดียว — แก้ไขการตั้งค่าส่วนนี้ได้เฉพาะหัวหน้างาน (Supervisor)
    </div>
  );
}

function Section({
  icon,
  title,
  desc,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3 border-b border-border/70 p-5">
        <div className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </Card>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-md">
        <Label className="normal-case tracking-normal text-foreground">
          {label}
        </Label>
        {hint && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function About({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-foreground/90">{value}</div>
    </div>
  );
}
