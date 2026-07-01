import { useRef, type RefObject } from "react";
import { Camera, Upload, MonitorPlay, ShieldAlert, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LatchGraphic } from "./LatchGraphic";
import type { CameraState } from "./useCamera";
import type { LockStatus } from "@/types";
import { LOCK_VISUAL } from "@/components/verdict-visual";
import { lockStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type FrameSource = "none" | "camera" | "image" | "demo";
export type Phase = "idle" | "verifying" | "result";

interface Props {
  side: "A" | "B";
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraState: CameraState;
  source: FrameSource;
  imageDataUrl?: string;
  phase: Phase;
  /** Per-side result status once verified (drives tint + demo latch). */
  statusAfter?: LockStatus;
  onStartCamera: () => void;
  onUpload: (file: File) => void;
  onUseDemo: () => void;
}

export function SideCameraPanel({
  side,
  videoRef,
  cameraState,
  source,
  imageDataUrl,
  phase,
  statusAfter,
  onStartCamera,
  onUpload,
  onUseDemo,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const resultColor =
    phase === "result" && statusAfter ? LOCK_VISUAL[statusAfter].color : undefined;
  const frameColor = resultColor ?? "var(--hazard)";

  return (
    <div
      className="scanlines relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-black transition-shadow duration-500"
      style={{
        borderColor: resultColor ?? "color-mix(in oklab, var(--border) 90%, transparent)",
        boxShadow: resultColor
          ? `0 0 0 1px ${resultColor}, 0 0 46px -22px ${resultColor}`
          : undefined,
      }}
    >
      {/* ---- Frame content ---- */}
      <video
        ref={videoRef}
        muted
        playsInline
        className={cn(
          "absolute inset-0 h-full w-full object-cover",
          source === "camera" ? "opacity-100" : "opacity-0",
        )}
      />

      {source === "image" && imageDataUrl && (
        <img
          src={imageDataUrl}
          alt={`Side ${side} frame`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {source === "demo" && (
        <div className="absolute inset-0 bg-grid">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          <LatchGraphic
            side={side}
            status={statusAfter}
            className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl"
          />
        </div>
      )}

      {source === "none" && (
        <EmptyZone
          side={side}
          cameraState={cameraState}
          onStartCamera={onStartCamera}
          onUpload={() => fileRef.current?.click()}
          onUseDemo={onUseDemo}
        />
      )}

      {/* ---- Target reticle (frame present, before result) ---- */}
      {source !== "none" && <Reticle color={frameColor} />}

      {/* ---- Scanning sweep ---- */}
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

      {/* ---- Side label (top-left) ---- */}
      <div
        className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-md border bg-black/60 px-2 py-1 backdrop-blur"
        style={{ borderColor: `color-mix(in oklab, ${frameColor} 45%, transparent)` }}
      >
        <span
          className="font-mono text-xs font-bold"
          style={{ color: frameColor }}
        >
          กล้องด้าน {side}
        </span>
      </div>

      {/* ---- Source chip (top-right) ---- */}
      {source === "camera" && cameraState === "live" && phase !== "verifying" && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-fail/40 bg-black/60 px-2 py-0.5 backdrop-blur">
          <span className="size-1.5 rounded-full bg-fail animate-blink" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-fail">
            Live
          </span>
        </div>
      )}
      {source === "demo" && phase !== "verifying" && (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full border border-primary/40 bg-black/60 px-2 py-0.5 backdrop-blur">
          <MonitorPlay className="size-2.5 text-primary" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
            Demo
          </span>
        </div>
      )}

      {/* ---- Result status pill (bottom) ---- */}
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

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
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

function EmptyZone({
  side,
  cameraState,
  onStartCamera,
  onUpload,
  onUseDemo,
}: {
  side: "A" | "B";
  cameraState: CameraState;
  onStartCamera: () => void;
  onUpload: () => void;
  onUseDemo: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-grid p-4 text-center">
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50" />
      <div className="relative flex size-11 items-center justify-center rounded-xl border border-border bg-card/70">
        <Camera className="size-5 text-muted-foreground" />
      </div>
      <p className="relative text-xs font-medium text-foreground/90">
        เลือกแหล่งภาพสำหรับด้าน {side}
      </p>

      {cameraState === "denied" && (
        <div className="relative flex items-center gap-1.5 rounded-md border border-fail/30 bg-fail/10 px-2 py-1 text-[10px] text-fail">
          <ShieldAlert className="size-3" />
          ไม่ได้รับอนุญาตกล้อง
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-center gap-1.5">
        <Button
          size="sm"
          className="h-8 px-2.5 text-xs"
          onClick={onStartCamera}
          disabled={cameraState === "starting"}
        >
          <Camera />
          {cameraState === "starting" ? "เปิด…" : "กล้อง"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-xs"
          onClick={onUpload}
        >
          <Upload />
          อัปโหลด
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="h-8 px-2.5 text-xs"
          onClick={onUseDemo}
        >
          <MonitorPlay />
          Demo
        </Button>
      </div>
    </div>
  );
}
