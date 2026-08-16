import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { STATIONS } from "./constants";

// Which physical station this terminal is. In production this comes from the
// station's own config; here it's a picker in the header. (Who is operating
// the terminal now comes from the signed-in account — see data/auth.tsx.)

const KEY = "ube.station.v1";

interface Session {
  stationId: string;
  setStationId: (id: string) => void;
}

const SessionContext = createContext<Session | null>(null);

function loadStation(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stationId, setStationId] = useState(
    () => loadStation() ?? STATIONS[0].id,
  );

  useEffect(() => {
    try {
      localStorage.setItem(KEY, stationId);
    } catch {
      /* ignore */
    }
  }, [stationId]);

  const value = useMemo<Session>(
    () => ({ stationId, setStationId }),
    [stationId],
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
