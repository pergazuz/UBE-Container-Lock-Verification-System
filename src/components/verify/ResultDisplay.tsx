import { RotateCcw, ShieldCheck, Info, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SideStatus } from "./SideStatus";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { VERDICT_VISUAL } from "@/components/verdict-visual";
import { effectiveVerdict, type VerificationLog } from "@/types";
import { formatConfidence, formatTime, verdictLabel } from "@/lib/format";
import { employeeName } from "@/data/constants";

interface Props {
  log: VerificationLog;
  onOverride: () => void;
  onReset: () => void;
}

export function ResultDisplay({ log, onOverride, onReset }: Props) {
  const { result } = log;
  const finalVerdict = effectiveVerdict(log);
  const visual = VERDICT_VISUAL[finalVerdict];
  const Icon = visual.icon;
  const overridden = Boolean(log.override);

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Headline verdict ---- */}
      <div
        className="animate-rise relative overflow-hidden rounded-xl border p-5"
        style={{
          borderColor: `color-mix(in oklab, ${visual.color} 45%, transparent)`,
          background: `radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, ${visual.color} 16%, transparent), transparent 60%)`,
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="animate-stamp flex size-16 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              borderColor: `color-mix(in oklab, ${visual.color} 50%, transparent)`,
              background: `color-mix(in oklab, ${visual.color} 14%, transparent)`,
            }}
          >
            <Icon className="size-9" style={{ color: visual.color }} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="font-mono text-3xl font-bold leading-none tracking-tight"
              style={{ color: visual.color }}
            >
              {verdictLabel(finalVerdict)}
            </div>
            <p className="mt-1.5 text-sm text-foreground/90">{visual.labelTh}</p>
          </div>
        </div>

        {overridden && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              แก้ไขโดยหัวหน้างาน {employeeName(log.override!.supervisorId)} —
              ผลเดิมจากระบบคือ{" "}
              <span className="font-mono font-semibold">
                {verdictLabel(result.overall)}
              </span>
              {log.override!.note ? ` · “${log.override!.note}”` : ""}
            </span>
          </div>
        )}
      </div>

      {/* ---- Reason (Fail / Uncertain) ---- */}
      {!overridden && result.reason && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground/90">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>{result.reason}</span>
        </div>
      )}

      {/* ---- Per-side breakdown ---- */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SideStatus side="A" result={result.sideA} delayMs={80} />
        <SideStatus side="B" result={result.sideB} delayMs={160} />
      </div>

      {/* ---- Overall confidence ---- */}
      <div className="rounded-lg border border-border bg-card/50 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Model Confidence
          </span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {formatConfidence(result.confidence)}
          </span>
        </div>
        <ConfidenceMeter
          value={result.confidence}
          color={visual.color}
          showLabel={false}
        />
      </div>

      {/* ---- Meta ---- */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>ID {log.id}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>เวลา {formatTime(log.timestamp)} น.</span>
        <Separator orientation="vertical" className="h-3" />
        <Badge variant={visual.badge} className="px-1.5 py-0 text-[10px]">
          {overridden ? "OVERRIDDEN" : "AUTO"}
        </Badge>
      </div>

      {/* ---- Actions ---- */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={onReset} className="flex-1" size="lg">
          <RotateCcw />
          Verify ครั้งใหม่
        </Button>
        <Button
          onClick={onOverride}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          <PencilLine />
          {overridden ? "แก้ไขผลอีกครั้ง" : "แก้ไขผล (Override)"}
        </Button>
      </div>
    </div>
  );
}
