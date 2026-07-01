import { NavLink } from "react-router-dom";
import { ScanLine, History, Boxes, Settings } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/data/session";
import { EMPLOYEES, STATIONS } from "@/data/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "สถานีตรวจสอบ", en: "Verify", icon: ScanLine, end: true },
  { to: "/history", label: "ประวัติ & Dashboard", en: "History", icon: History, end: false },
  { to: "/settings", label: "ตั้งค่า", en: "Settings", icon: Settings, end: false },
];

export function Header() {
  const { stationId, employeeId, setStationId, setEmployeeId } = useSession();
  const operators = EMPLOYEES.filter((e) => e.role === "operator");

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 items-center justify-center overflow-hidden rounded-lg bg-hazard-stripes">
            <span className="absolute inset-[3px] flex items-center justify-center rounded-md bg-background">
              <Boxes className="size-5 text-primary" />
            </span>
          </div>
          <div className="leading-none">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-bold tracking-tight text-foreground">
                UBE
              </span>
              <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
                Container Lock Verification
              </span>
            </div>
            <div className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
              ระบบตรวจสอบการล็อกคอนเทนเนอร์
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Session pickers */}
        <div className="ml-auto flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="h-9 w-[110px] font-mono text-xs sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>สถานี (Station)</SelectLabel>
                {STATIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.id} · {s.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger className="h-9 w-[130px] text-xs sm:w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>พนักงาน (Operator)</SelectLabel>
                {operators.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 border-t border-border/60 px-4 py-1.5 md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            {item.en}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
