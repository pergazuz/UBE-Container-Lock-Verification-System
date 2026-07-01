import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogThumbnail({
  src,
  label,
  className,
}: {
  src?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-secondary/60",
        className,
      )}
    >
      {src ? (
        <img src={src} alt="frame" className="h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute inset-0 bg-grid opacity-40" />
          <Boxes className="size-3.5 text-muted-foreground" />
        </>
      )}
      {label && (
        <span className="absolute left-0.5 top-0.5 rounded bg-black/55 px-1 font-mono text-[8px] font-bold leading-tight text-foreground/80">
          {label}
        </span>
      )}
    </div>
  );
}
