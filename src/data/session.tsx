import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { EMPLOYEES, STATIONS } from "./constants";

// Active operator + station for the terminal. In production this comes from an
// auth/session service (badge scan, station config); here it's a simple picker.

const KEY = "ube.session.v1";

interface Session {
  stationId: string;
  employeeId: string;
  setStationId: (id: string) => void;
  setEmployeeId: (id: string) => void;
}

const SessionContext = createContext<Session | null>(null);

function loadSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as { stationId: string; employeeId: string };
  } catch {
    /* ignore */
  }
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const initial = loadSession();
  const [stationId, setStationId] = useState(
    initial?.stationId ?? STATIONS[0].id,
  );
  const [employeeId, setEmployeeId] = useState(
    initial?.employeeId ??
      EMPLOYEES.find((e) => e.role === "operator")!.id,
  );

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ stationId, employeeId }));
  }, [stationId, employeeId]);

  const value = useMemo<Session>(
    () => ({ stationId, employeeId, setStationId, setEmployeeId }),
    [stationId, employeeId],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
