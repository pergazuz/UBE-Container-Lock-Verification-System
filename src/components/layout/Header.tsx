import { NavLink } from "react-router-dom";
import {
  ScanLine,
  History,
  Boxes,
  Settings,
  ClipboardList,
  UsersRound,
  LogOut,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/data/session";
import { useAuth } from "@/data/auth";
import { useSettings } from "@/data/settings";
import { STATIONS } from "@/data/constants";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "สถานีตรวจสอบ", en: "Verify", icon: ScanLine, end: true },
  { to: "/history", label: "ประวัติ & Dashboard", en: "History", icon: History, end: false },
  { to: "/logs", label: "บันทึกเหตุการณ์", en: "Logs", icon: ClipboardList, end: false },
  { to: "/users", label: "ผู้ใช้", en: "Users", icon: UsersRound, end: false, supervisorOnly: true },
  { to: "/settings", label: "ตั้งค่า", en: "Settings", icon: Settings, end: false },
];

export function Header() {
  const { stationId, setStationId } = useSession();
  const { currentUser, logout } = useAuth();
  const { settings } = useSettings();

  const nav = NAV.filter(
    (item) => !item.supervisorOnly || currentUser?.role === "supervisor",
  );

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
              <span className="hidden text-[11px] font-medium text-muted-foreground xl:inline">
                Container Lock Verification
              </span>
            </div>
            <div className="mt-0.5 hidden text-[11px] text-muted-foreground xl:block">
              ระบบตรวจสอบการล็อกคอนเทนเนอร์
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
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

        {/* Station + signed-in user */}
        <div className="ml-auto flex items-center gap-2">
          <Select value={stationId} onValueChange={setStationId}>
            <SelectTrigger className="h-9 w-[110px] font-mono text-xs sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>สถานี (Station)</SelectLabel>
                {STATIONS.map((s) => {
                  const closed = settings.closedStations.includes(s.id);
                  return (
                    // Supervisors may still enter a closed station to inspect
                    // it; operators can't select it at all.
                    <SelectItem
                      key={s.id}
                      value={s.id}
                      disabled={closed && currentUser?.role !== "supervisor"}
                    >
                      {s.id} · {s.name}
                      {closed ? " · ปิด" : ""}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          {currentUser && (
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 py-1 pl-2.5 pr-1">
              <div className="leading-tight">
                <div className="max-w-[120px] truncate text-xs font-medium text-foreground">
                  {currentUser.name}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {currentUser.id}
                </div>
              </div>
              <Badge
                variant={currentUser.role === "supervisor" ? "hazard" : "outline"}
                className="hidden px-1.5 py-0 text-[9px] sm:inline-flex"
              >
                {currentUser.role === "supervisor" ? "SUPERVISOR" : "OPERATOR"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-fail"
                onClick={logout}
                title="ออกจากระบบ (Logout)"
              >
                <LogOut className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 border-t border-border/60 px-4 py-1.5 md:hidden">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground",
              )
            }
          >
            <item.icon className="size-4" />
            <span className="text-xs">{item.en}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
