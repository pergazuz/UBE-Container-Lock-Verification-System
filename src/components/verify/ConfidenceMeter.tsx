import { formatConfidence } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  value: number; // 0..1
  color?: string; // css var
  className?: string;
  showLabel?: boolean;
}

export function ConfidenceMeter({
  value,
  color = "var(--hazard)",
  className,
  showLabel = true,
}: Props) {
  const pct = Math.round(value * 100);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      {showLabel && (
        <span className="tabular w-9 text-right font-mono text-xs text-muted-foreground">
          {formatConfidence(value)}
        </span>
      )}
    </div>
  );
}
