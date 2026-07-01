import { useEffect, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

// Themed, Thai-first date picker (Buddhist era) replacing the OS-native
// <input type="date"> popup so it matches the app's dark/azure style.

const TH_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const TH_MONTHS_ABBR = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const TH_DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function parse(value?: string): { y: number; m: number; d: number } | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function fmt(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(m + 1)}-${p(d)}`;
}

interface Props {
  value?: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "เลือกวันที่",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const now = new Date();
  const [view, setView] = useState(() =>
    selected
      ? { y: selected.y, m: selected.m }
      : { y: now.getFullYear(), m: now.getMonth() },
  );

  // Jump the visible month to the selected date whenever the picker opens.
  useEffect(() => {
    if (open && selected) setView({ y: selected.y, m: selected.m });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = new Date(view.y, view.m, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isDisabled = (d: number) => {
    const v = fmt(view.y, view.m, d);
    if (min && v < min) return true;
    if (max && v > max) return true;
    return false;
  };

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const m = v.m + delta;
      if (m < 0) return { y: v.y - 1, m: 11 };
      if (m > 11) return { y: v.y + 1, m: 0 };
      return { y: v.y, m };
    });
  };

  const pick = (d: number) => {
    onChange(fmt(view.y, view.m, d));
    setOpen(false);
  };

  const display = selected
    ? `${selected.d} ${TH_MONTHS_ABBR[selected.m]} ${selected.y + 543}`
    : placeholder;

  const isToday = (d: number) =>
    view.y === now.getFullYear() &&
    view.m === now.getMonth() &&
    d === now.getDate();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border border-input bg-background/60 px-3 text-sm shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "data-[state=open]:border-ring",
            className,
          )}
        >
          <Calendar className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 text-left", !selected && "text-muted-foreground")}>
            {display}
          </span>
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="ล้างวันที่"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[268px]">
        {/* Header */}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="font-mono text-sm font-semibold">
            {TH_MONTHS[view.m]} {view.y + 543}
          </div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Day-of-week */}
        <div className="mb-1 grid grid-cols-7 gap-0.5">
          {TH_DOW.map((d) => (
            <div
              key={d}
              className="flex h-7 items-center justify-center font-mono text-[10px] text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} className="size-8" />;
            const isSel =
              selected &&
              selected.y === view.y &&
              selected.m === view.m &&
              selected.d === d;
            const disabled = isDisabled(d);
            return (
              <button
                key={d}
                type="button"
                disabled={disabled}
                onClick={() => pick(d)}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-sm tabular transition-colors",
                  disabled && "cursor-not-allowed text-muted-foreground/30",
                  !disabled && !isSel && "hover:bg-accent",
                  isSel &&
                    "bg-primary font-semibold text-primary-foreground hover:bg-primary",
                  !isSel && isToday(d) && !disabled &&
                    "border border-primary/50 text-primary",
                )}
              >
                {d}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-2">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={() => {
              const v = fmt(now.getFullYear(), now.getMonth(), now.getDate());
              if ((!min || v >= min) && (!max || v <= max)) {
                onChange(v);
                setOpen(false);
              }
            }}
            className="rounded px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            วันนี้
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
