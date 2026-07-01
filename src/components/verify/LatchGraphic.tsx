import type { LockStatus } from "@/types";

interface Props {
  status?: LockStatus;
  side: "A" | "B";
  className?: string;
}

const COLOR: Record<LockStatus, string> = {
  Locked: "var(--pass)",
  Unlocked: "var(--fail)",
  NotVisible: "var(--muted-foreground)",
};

/**
 * Close-up of a single side latch as seen by that side's dedicated camera.
 * Lever lies flat when Locked, kicks up when Unlocked, and is dimmed when the
 * latch can't be seen. Used for the per-side Demo frame and the detail view.
 */
export function LatchGraphic({ status = "NotVisible", side, className }: Props) {
  const c = COLOR[status];
  const dim = status === "NotVisible";
  // Lever pivots at the hinge (right end); kicks up when unlocked.
  const rotate = status === "Unlocked" ? -42 : 0;

  return (
    <svg
      viewBox="0 0 240 200"
      className={className}
      role="img"
      aria-label={`Side ${side} latch, ${status}`}
    >
      <defs>
        <linearGradient id={`wall-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#28323f" />
          <stop offset="1" stopColor="#19212b" />
        </linearGradient>
      </defs>

      {/* container wall */}
      <rect x="18" y="26" width="204" height="148" rx="10" fill={`url(#wall-${side})`} stroke="#3a4553" strokeWidth="2" />
      {/* horizontal seam where lid meets body */}
      <line x1="18" y1="100" x2="222" y2="100" stroke="#141a22" strokeWidth="3" />

      {/* strike plate on the lid (upper half) */}
      <rect x="96" y="60" width="48" height="26" rx="4" fill="#0f151c" stroke={c} strokeWidth="2" opacity={dim ? 0.5 : 1} />

      {/* hasp base on the body (lower half) */}
      <rect x="150" y="104" width="30" height="40" rx="5" fill="#0f151c" stroke={c} strokeWidth="2" opacity={dim ? 0.55 : 1} />

      {/* lever — hinged at the hasp, swings over the strike plate */}
      <g transform={`rotate(${rotate} 162 116)`} opacity={dim ? 0.5 : 1}>
        <rect x="70" y="108" width="96" height="16" rx="5" fill={c} />
        <circle cx="162" cy="116" r="5" fill="#0f151c" stroke={c} strokeWidth="2" />
        {/* catch that engages the strike plate when flat */}
        <rect x="74" y="104" width="12" height="10" rx="2" fill={c} />
      </g>

      {/* status dot */}
      <circle cx="200" cy="46" r="5" fill={c} />

      {/* side label */}
      <text x="34" y="52" fill={c} fontSize="20" fontWeight="700" fontFamily="var(--font-mono)">
        {side}
      </text>

      {dim && (
        <text x="120" y="130" fill={c} fontSize="26" fontWeight="700" textAnchor="middle" fontFamily="var(--font-mono)">
          ?
        </text>
      )}
    </svg>
  );
}
