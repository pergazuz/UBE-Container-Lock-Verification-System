import { Badge } from "@/components/ui/badge";
import { VERDICT_VISUAL } from "@/components/verdict-visual";
import { verdictLabel } from "@/lib/format";
import type { Verdict } from "@/types";
import { cn } from "@/lib/utils";

export function VerdictBadge({
  verdict,
  className,
}: {
  verdict: Verdict;
  className?: string;
}) {
  const v = VERDICT_VISUAL[verdict];
  const Icon = v.icon;
  return (
    <Badge variant={v.badge} className={cn("font-mono", className)}>
      <Icon className="size-3" />
      {verdictLabel(verdict)}
    </Badge>
  );
}
