import { type RefObject } from "react";
import { ScanLine, RotateCcw, CheckCircle2 } from "lucide-react";
import type { LockStatus } from "@/types";
import type { SampleVideo } from "@/data/constants";
import { LOCK_VISUAL } from "@/components/verdict-visual";
import { lockStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Phase = "idle" | "verifying" | "result";

interface Props {
  side: "A" | "B";
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The currently selected sample clip for this side. */
  sample: SampleVideo;
  /** All selectable sample clips. */
  samples: SampleVideo[];
  phase: Phase;
  /** Per-side result status once verified (drives tint + status pill). */
  statusAfter?: LockStatus;
  /** Whether this side's clip has played through to its final frame. */
  ended: boolean;
  /** Clip finished playing — final frame is now frozen on screen. */
  onEnded: () => void;
  /** Operator picked a different sample clip. */
  onSelectSample: (id: string) => void;
  /** Replay the current clip from the beginning. */
  onReplay: () => void;
}

export function SideCameraPanel({
  side,
  videoRef,
  sample,
  samples,
  phase,
  statusAfter,
  ended,
  onEnded,
  onSelectSample,
  onReplay,
}: Props) {
  const resultColor =
    phase === "result" && statusAfter ? LOCK_VISUAL[statusAfter].color : undefined;
  const frameColor = resultColor ?? "var(--hazard)";

  return (
    <div
      className="scanlines relative aspect-[4/3] h-full w-full overflow-hidden rounded-xl border bg-black transition-shadow duration-500"
      style={{
        borderColor:
          resultColor ?? "color-mix(in oklab, var(--border) 90%, transparent)",
        boxShadow: resultColor
          ? `0 0 0 1px ${resultColor}, 0 0 46px -22px ${resultColor}`
          : undefined,
      }}
    >
      {/* Sample footage feed — plays once, freezes on the final frame */}
      <video
        key={sample.id}
        ref={videoRef}
        src={sample.src}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={(e) => {
          // At exactly `duration` some browsers paint black instead of the
          // last frame — nudge back a hair so the real frame stays visible
          // (and gets captured by Verify).
          const v = e.currentTarget;
          if (Number.isFinite(v.duration) && v.duration > 0.2) {
            v.currentTime = v.duration - 0.1;
          }
          onEnded();
        }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />

      {/* Target reticle */}
      <Reticle color={frameColor} />

      {/* Scanning sweep */}
      {phase === "verifying" && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div
            className="animate-sweep absolute inset-x-0 h-16"
            style={{
              background:
                "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--hazard) 55%, transparent), transparent)",
            }}
          />
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-primary/40 bg-black/70 px-3 py-1 backdrop-blur">
            <ScanLine className="size-3.5 animate-pulse text-primary" />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Scan {side}
            </span>
          </div>
        </div>
      )}

      {/* Side label (top-left) */}
      <div
        className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-md border bg-black/60 px-2 py-1 backdrop-blur"
        style={{ borderColor: `color-mix(in oklab, ${frameColor} 45%, transparent)` }}
      >
        <span className="font-mono text-xs font-bold" style={{ color: frameColor }}>
          กล้องด้าน {side}
        </span>
      </div>

      {/* Sample picker + replay (top-right, idle only) */}
      {phase === "idle" && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onReplay}
            title="เล่นคลิปใหม่"
            className="ease-out-strong flex size-7 items-center justify-center rounded-full border border-primary/40 bg-black/60 text-primary backdrop-blur transition-[background-color,transform] duration-150 hover:bg-black/80 active:scale-95"
          >
            <RotateCcw className="size-3" />
          </button>
          <Select value={sample.id} onValueChange={onSelectSample}>
            <SelectTrigger className="h-7 w-auto gap-1 rounded-full border-primary/40 bg-black/60 px-2.5 py-0 text-xs font-semibold text-primary shadow-none backdrop-blur hover:bg-black/80 focus:ring-primary/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {samples.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Playback state pill (bottom, idle only) */}
      {phase === "idle" && (
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-center">
          {ended ? (
            <span className="flex items-center gap-1.5 rounded-md border border-pass/40 bg-black/70 px-2.5 py-1 backdrop-blur">
              <CheckCircle2 className="size-3.5 text-pass" />
              <span className="text-xs font-semibold text-pass">
                เฟรมสุดท้าย · พร้อมตรวจ
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-md border border-border bg-black/70 px-2.5 py-1 backdrop-blur">
              <span className="animate-blink size-1.5 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">
                กำลังเล่นคลิป…
              </span>
            </span>
          )}
        </div>
      )}

      {/* Result status pill (bottom) */}
      {phase === "result" && statusAfter && (
        <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-center">
          {(() => {
            const v = LOCK_VISUAL[statusAfter];
            const Icon = v.icon;
            return (
              <span
                className="flex items-center gap-1.5 rounded-md border bg-black/70 px-2.5 py-1 backdrop-blur"
                style={{ borderColor: `color-mix(in oklab, ${v.color} 45%, transparent)` }}
              >
                <Icon className={cn("size-3.5", v.text)} />
                <span className={cn("text-xs font-semibold", v.text)}>
                  {lockStatusLabel(statusAfter).split(" · ")[0]}
                </span>
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function Reticle({ color }: { color: string }) {
  const corners = [
    "left-0 top-0 border-l-2 border-t-2 rounded-tl-md",
    "right-0 top-0 border-r-2 border-t-2 rounded-tr-md",
    "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-md",
    "right-0 bottom-0 border-r-2 border-b-2 rounded-br-md",
  ];
  return (
    <div className="pointer-events-none absolute inset-[12%] z-10">
      {corners.map((c) => (
        <span
          key={c}
          className={cn("absolute size-5", c)}
          style={{ borderColor: color }}
        />
      ))}
    </div>
  );
}
