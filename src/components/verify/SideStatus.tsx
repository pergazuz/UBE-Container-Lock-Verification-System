import type { SideResult, SideKey } from "@/types";
import { lockStatusLabel } from "@/lib/format";
import { LOCK_VISUAL } from "@/components/verdict-visual";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { cn } from "@/lib/utils";

interface Props {
  side: SideKey;
  result: SideResult;
  delayMs?: number;
}

export function SideStatus({ side, result, delayMs = 0 }: Props) {
  const visual = LOCK_VISUAL[result.status];
  const Icon = visual.icon;
  return (
    <div
      className="animate-rise flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className="flex size-11 shrink-0 items-center justify-center rounded-md border"
        style={{
          borderColor: `color-mix(in oklab, ${visual.color} 40%, transparent)`,
          background: `color-mix(in oklab, ${visual.color} 12%, transparent)`,
        }}
      >
        <Icon className={cn("size-5", visual.text)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            ด้าน {side}
          </span>
          <span className={cn("text-sm font-semibold", visual.text)}>
            {lockStatusLabel(result.status)}
          </span>
        </div>
        <ConfidenceMeter
          value={result.confidence}
          color={visual.color}
          className="mt-2"
        />
      </div>
    </div>
  );
}
