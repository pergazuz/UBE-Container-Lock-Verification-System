import {
  CircleCheckBig,
  CircleAlert,
  CircleX,
  Lock,
  LockOpen,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import type { LockStatus, Verdict } from "@/types";

interface VerdictVisual {
  icon: LucideIcon;
  /** tailwind text color class */
  text: string;
  /** badge variant name */
  badge: "pass" | "fail" | "uncertain";
  /** css var color for glows/borders */
  color: string;
  labelTh: string;
}

export const VERDICT_VISUAL: Record<Verdict, VerdictVisual> = {
  Pass: {
    icon: CircleCheckBig,
    text: "text-pass",
    badge: "pass",
    color: "var(--pass)",
    labelTh: "ผ่าน — ล็อกครบทั้งสองด้าน",
  },
  Fail: {
    icon: CircleX,
    text: "text-fail",
    badge: "fail",
    color: "var(--fail)",
    labelTh: "ไม่ผ่าน — กรุณาตรวจสอบ",
  },
  Uncertain: {
    icon: CircleAlert,
    text: "text-uncertain",
    badge: "uncertain",
    color: "var(--uncertain)",
    labelTh: "ไม่แน่ใจ — ต้องตรวจซ้ำ",
  },
};

interface LockVisual {
  icon: LucideIcon;
  text: string;
  color: string;
}

export const LOCK_VISUAL: Record<LockStatus, LockVisual> = {
  Locked: { icon: Lock, text: "text-pass", color: "var(--pass)" },
  Unlocked: { icon: LockOpen, text: "text-fail", color: "var(--fail)" },
  NotVisible: { icon: EyeOff, text: "text-muted-foreground", color: "var(--muted-foreground)" },
};
