import {
  Activity,
  CircleCheckBig,
  CircleX,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { effectiveVerdict, type VerificationLog } from "@/types";
import { cn } from "@/lib/utils";

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

interface Stat {
  label: string;
  sub: string;
  value: string;
  icon: LucideIcon;
  color: string;
  accent?: boolean;
}

export function StatsCards({ logs }: { logs: VerificationLog[] }) {
  const today = logs.filter((l) => isToday(l.timestamp));
  const todayCount = today.length;
  const todayPass = today.filter((l) => effectiveVerdict(l) === "Pass").length;
  const todayFail = today.filter((l) => effectiveVerdict(l) === "Fail").length;
  const overrides = logs.filter((l) => l.override).length;
  const passRate = todayCount ? Math.round((todayPass / todayCount) * 100) : 0;

  const stats: Stat[] = [
    {
      label: "ตรวจสอบวันนี้",
      sub: "Verifications today",
      value: String(todayCount),
      icon: Activity,
      color: "var(--hazard)",
      accent: true,
    },
    {
      label: "ผ่านวันนี้ · Pass",
      sub: `Pass rate ${passRate}%`,
      value: String(todayPass),
      icon: CircleCheckBig,
      color: "var(--pass)",
    },
    {
      label: "ไม่ผ่านวันนี้ · Fail",
      sub: "Fail / recheck today",
      value: String(todayFail),
      icon: CircleX,
      color: "var(--fail)",
    },
    {
      label: "แก้ไขโดยหัวหน้า",
      sub: "Overrides (all time)",
      value: String(overrides),
      icon: ShieldCheck,
      color: "var(--primary)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const Icon = stat.icon;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card/60 p-4 panel-glow",
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-20 blur-2xl"
        style={{ background: stat.color }}
      />
      <div className="flex items-center justify-between">
        <span
          className="flex size-8 items-center justify-center rounded-lg border"
          style={{
            borderColor: `color-mix(in oklab, ${stat.color} 40%, transparent)`,
            background: `color-mix(in oklab, ${stat.color} 12%, transparent)`,
          }}
        >
          <Icon className="size-4" style={{ color: stat.color }} />
        </span>
      </div>
      <div
        className="mt-3 font-mono text-3xl font-bold leading-none tabular"
        style={{ color: stat.accent ? stat.color : "var(--foreground)" }}
      >
        {stat.value}
      </div>
      <div className="mt-1.5 text-xs font-medium text-foreground/90">
        {stat.label}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
        {stat.sub}
      </div>
    </div>
  );
}
