import { type RefObject } from "react";
import { ScanLine, RefreshCw } from "lucide-react";
import type { LockStatus } from "@/types";
import { LOCK_VISUAL } from "@/components/verdict-visual";
import { lockStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Phase = "idle" | "verifying" | "result";

interface Props {
  side: "A" | "B";
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string;
  phase: Phase;
  /** Per-side result status once verified (drives tint + status pill). */
  statusAfter?: LockStatus;
  /** Load the next sample clip for this side. */
  onCycle: () => void;
}

export function SideCameraPanel({
  side,
  videoRef,
  videoSrc,
  phase,
  statusAfter,
  onCycle,
}: Props) {
  const resultColor =
    phase === "result" && statusAfter ? LOCK_VISUAL[statusAfter].color : undefined;
  const frameColor = resultColor ?? "var(--hazard)";

  return (
    <div
      className="scanlines relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-black transition-shadow duration-500"
      style={{
        borderColor:
          resultColor ?? "color-mix(in oklab, var(--border) 90%, transparent)",
        boxShadow: resultColor
          ? `0 0 0 1px ${resultColor}, 0 0 46px -22px ${resultColor}`
          : undefined,
      }}
    >
      {/* Sample footage feed */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
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

      {/* Sample controls (top-right, idle only) */}
      {phase === "idle" && (
        <button
          type="button"
          onClick={onCycle}
          title="เปลี่ยนคลิปตัวอย่าง"
          className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-primary/40 bg-black/60 px-2.5 py-1 text-primary backdrop-blur transition-colors hover:bg-black/80"
        >
          <RefreshCw className="size-3" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
            Sample
          </span>
        </button>
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
