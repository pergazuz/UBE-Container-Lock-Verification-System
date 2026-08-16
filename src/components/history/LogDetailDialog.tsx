import { useState } from "react";
import { PencilLine, ShieldCheck, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SideStatus } from "@/components/verify/SideStatus";
import { LatchGraphic } from "@/components/verify/LatchGraphic";
import { VerdictBadge } from "@/components/VerdictBadge";
import { OverrideDialog } from "@/components/verify/OverrideDialog";
import { useLogStore } from "@/data/store";
import { userName } from "@/data/auth";
import { stationName } from "@/data/constants";
import { formatConfidence, formatDateTime } from "@/lib/format";
import {
  SIDE_KEYS,
  effectiveVerdict,
  type LockStatus,
  type Override,
  type SideKey,
  type VerificationLog,
} from "@/types";

interface Props {
  log: VerificationLog | null;
  onOpenChange: (open: boolean) => void;
}

export function LogDetailDialog({ log, onOpenChange }: Props) {
  const { applyOverride } = useLogStore();
  const [overrideOpen, setOverrideOpen] = useState(false);

  if (!log) return null;
  const finalVerdict = effectiveVerdict(log);

  function handleOverride(override: Override) {
    if (log) applyOverride(log.id, override);
  }

  return (
    <>
      <Dialog open={Boolean(log)} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle>รายละเอียดการตรวจสอบ</DialogTitle>
              <VerdictBadge verdict={finalVerdict} />
              {log.attempt === "rework" && (
                <Badge variant="uncertain" className="gap-1 px-1.5 py-0 text-[10px]">
                  <Wrench className="size-2.5" /> Rework
                </Badge>
              )}
            </div>
            <DialogDescription className="font-mono text-xs">
              ตู้ {log.containerId} · {log.id} · {formatDateTime(log.timestamp)} น.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* Frames — one per side camera (A–D) */}
            <div className="grid grid-cols-2 gap-3">
              {SIDE_KEYS.map((k) => (
                <FramePreview
                  key={k}
                  side={k}
                  src={log.images?.[k]}
                  status={log.result.sides[k].status}
                />
              ))}
            </div>

            {/* Sides */}
            <div className="grid gap-3 sm:grid-cols-2">
              {SIDE_KEYS.map((k) => (
                <SideStatus key={k} side={k} result={log.result.sides[k]} />
              ))}
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-secondary/30 p-3 text-sm sm:grid-cols-3">
              <Meta label="ตู้ (Container)" value={log.containerId} mono />
              <Meta
                label="ประเภทงาน"
                value={log.attempt === "rework" ? "งานแก้ไข (Rework)" : "งานใหม่ (Initial)"}
              />
              <Meta label="สถานี" value={stationName(log.stationId)} />
              <Meta label="ผู้ตรวจ" value={userName(log.employeeId)} />
              <Meta
                label="Model Verdict"
                value={`${log.result.overall} · ${formatConfidence(log.result.confidence)}`}
              />
            </div>

            {log.override && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                <span>
                  แก้ไขเป็น{" "}
                  <span className="font-mono font-semibold">
                    {log.override.overriddenVerdict}
                  </span>{" "}
                  โดย {userName(log.override.supervisorId)}
                  {log.override.note ? ` · “${log.override.note}”` : ""}
                </span>
              </div>
            )}

            <Separator />

            <Button variant="outline" onClick={() => setOverrideOpen(true)}>
              <PencilLine />
              {log.override ? "แก้ไขผลอีกครั้ง" : "แก้ไขผล (Supervisor Override)"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        modelVerdict={log.result.overall}
        currentVerdict={finalVerdict}
        onSubmit={handleOverride}
      />
    </>
  );
}

function FramePreview({
  side,
  src,
  status,
}: {
  side: SideKey;
  src?: string;
  status: LockStatus;
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-black">
      {src ? (
        <img
          src={src}
          alt={`Side ${side} frame`}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-grid">
          <LatchGraphic
            side={side}
            status={status}
            className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}
      <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground/90 backdrop-blur">
        ด้าน {side}
      </span>
    </div>
  );
}

function Meta({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`truncate text-sm text-foreground/90 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
