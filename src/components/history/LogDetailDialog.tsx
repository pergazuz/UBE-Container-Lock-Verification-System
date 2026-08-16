import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PencilLine,
  ShieldCheck,
  Wrench,
  ZoomIn,
} from "lucide-react";
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
import { LOCK_VISUAL } from "@/components/verdict-visual";
import { useLogStore } from "@/data/store";
import { useAuth, userName } from "@/data/auth";
import { stationName } from "@/data/constants";
import { formatConfidence, formatDateTime, lockStatusLabel } from "@/lib/format";
import {
  SIDE_KEYS,
  effectiveVerdict,
  type LockStatus,
  type Override,
  type SideKey,
  type VerificationLog,
} from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  log: VerificationLog | null;
  onOpenChange: (open: boolean) => void;
}

export function LogDetailDialog({ log, onOpenChange }: Props) {
  const { applyOverride } = useLogStore();
  const { currentUser } = useAuth();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [zoomSide, setZoomSide] = useState<SideKey | null>(null);

  // Overriding a verdict is a supervisor-only action — operators don't get
  // the button at all.
  const canOverride = currentUser?.role === "supervisor";

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
            {/* Frames — one per side camera (A–D), click to zoom */}
            <div className="grid grid-cols-2 gap-3">
              {SIDE_KEYS.map((k) => (
                <FramePreview
                  key={k}
                  side={k}
                  src={log.images?.[k]}
                  status={log.result.sides[k].status}
                  onZoom={() => setZoomSide(k)}
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

            {canOverride && (
              <>
                <Separator />

                <Button variant="outline" onClick={() => setOverrideOpen(true)}>
                  <PencilLine />
                  {log.override ? "แก้ไขผลอีกครั้ง" : "แก้ไขผล (Supervisor Override)"}
                </Button>
              </>
            )}
          </div>

          {/* Nested INSIDE this dialog's content: clicks in the nested dialogs
              then bubble through this dialog's React tree, so its dismissable
              layer doesn't mistake them for outside clicks and close this
              dialog along with the inner one. */}
          {canOverride && (
            <OverrideDialog
              open={overrideOpen}
              onOpenChange={setOverrideOpen}
              modelVerdict={log.result.overall}
              currentVerdict={finalVerdict}
              onSubmit={handleOverride}
            />
          )}

          <FrameLightbox
            log={log}
            side={zoomSide}
            onNavigate={setZoomSide}
            onOpenChange={(o) => !o && setZoomSide(null)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Full-size viewer for one side's frame. Click the image to magnify; while
 * magnified the zoom follows the cursor. ←/→ or the edge buttons move
 * between sides that have a frame.
 */
function FrameLightbox({
  log,
  side,
  onNavigate,
  onOpenChange,
}: {
  log: VerificationLog;
  side: SideKey | null;
  onNavigate: (side: SideKey) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  // A fresh side starts un-magnified.
  useEffect(() => {
    setZoomed(false);
    setOrigin("50% 50%");
  }, [side]);

  const available = SIDE_KEYS.filter((k) => log.images?.[k]);
  const src = side ? log.images?.[side] : undefined;
  const status = side ? log.result.sides[side].status : undefined;
  const visual = status ? LOCK_VISUAL[status] : undefined;

  const step = (dir: 1 | -1) => {
    if (!side || available.length < 2) return;
    const i = available.indexOf(side);
    onNavigate(available[(i + dir + available.length) % available.length]);
  };

  return (
    <Dialog open={Boolean(side && src)} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[94vw] gap-3 bg-black/95 p-3 sm:max-w-3xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-8 text-sm">
            <span className="font-mono">
              กล้องด้าน {side} · ตู้ {log.containerId}
            </span>
            {status && visual && (
              <span
                className={cn("flex items-center gap-1 text-xs font-semibold", visual.text)}
              >
                <visual.icon className="size-3.5" />
                {lockStatusLabel(status)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <div
            className={cn(
              "overflow-hidden rounded-lg bg-black",
              zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
            onClick={() => setZoomed((z) => !z)}
            onMouseMove={(e) => {
              if (!zoomed) return;
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin(
                `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`,
              );
            }}
          >
            {src && (
              <img
                src={src}
                alt={`Side ${side} frame`}
                draggable={false}
                className="mx-auto max-h-[72vh] w-auto select-none transition-transform duration-200 ease-out"
                style={{
                  transformOrigin: origin,
                  transform: zoomed ? "scale(2.6)" : undefined,
                }}
              />
            )}
          </div>

          {available.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                title="ด้านก่อนหน้า"
                className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-black/70 text-foreground/90 backdrop-blur transition-colors hover:bg-black/90"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                title="ด้านถัดไป"
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-black/70 text-foreground/90 backdrop-blur transition-colors hover:bg-black/90"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>

        <p className="text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          คลิกภาพเพื่อขยาย · ← → เปลี่ยนด้าน
        </p>
      </DialogContent>
    </Dialog>
  );
}

function FramePreview({
  side,
  src,
  status,
  onZoom,
}: {
  side: SideKey;
  src?: string;
  status: LockStatus;
  onZoom: () => void;
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-black">
      {src ? (
        <button
          type="button"
          onClick={onZoom}
          title="คลิกเพื่อขยายภาพ"
          className="group absolute inset-0 cursor-zoom-in"
        >
          <img
            src={src}
            alt={`Side ${side} frame`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-black/70 px-2.5 py-1 backdrop-blur">
              <ZoomIn className="size-3.5 text-foreground/90" />
              <span className="text-xs font-medium text-foreground/90">ขยาย</span>
            </span>
          </span>
        </button>
      ) : (
        <div className="absolute inset-0 bg-grid">
          <LatchGraphic
            side={side}
            status={status}
            className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2"
          />
        </div>
      )}
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground/90 backdrop-blur">
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
