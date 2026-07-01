import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Override, VerificationLog, VerificationResult } from "@/types";
import { generateSeedLogs } from "./seed";

// ---------------------------------------------------------------------------
// In-memory log store backed by localStorage. This stands in for a real
// backend/database during the POC. Swapping to a real API means replacing the
// read/write internals here while keeping the same hook surface.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "ube.logs.v1";

interface AddLogInput {
  stationId: string;
  employeeId: string;
  imageA?: string;
  imageB?: string;
  result: VerificationResult;
}

interface LogStore {
  logs: VerificationLog[];
  addLog: (input: AddLogInput) => VerificationLog;
  applyOverride: (logId: string, override: Override) => void;
  clearAll: () => void;
  resetToSeed: () => void;
}

const LogStoreContext = createContext<LogStore | null>(null);

function load(): VerificationLog[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VerificationLog[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function save(logs: VerificationLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // Storage may be full (image data URLs are large) — non-fatal for POC.
  }
}

function makeId(ts: number): string {
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(36)
    .toUpperCase()
    .padStart(3, "0");
  return `V-${ts.toString(36).toUpperCase()}-${rand}`;
}

export function LogStoreProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<VerificationLog[]>(() => {
    const existing = load();
    if (existing) return existing;
    const seeded = generateSeedLogs(Date.now());
    save(seeded);
    return seeded;
  });

  useEffect(() => {
    save(logs);
  }, [logs]);

  const addLog = useCallback((input: AddLogInput): VerificationLog => {
    const ts = Date.now();
    const log: VerificationLog = {
      id: makeId(ts),
      timestamp: ts,
      stationId: input.stationId,
      employeeId: input.employeeId,
      imageA: input.imageA,
      imageB: input.imageB,
      result: input.result,
    };
    setLogs((prev) => [log, ...prev]);
    return log;
  }, []);

  const applyOverride = useCallback((logId: string, override: Override) => {
    setLogs((prev) =>
      prev.map((l) => (l.id === logId ? { ...l, override } : l)),
    );
  }, []);

  const clearAll = useCallback(() => setLogs([]), []);

  const resetToSeed = useCallback(() => {
    setLogs(generateSeedLogs(Date.now()));
  }, []);

  const value = useMemo<LogStore>(
    () => ({ logs, addLog, applyOverride, clearAll, resetToSeed }),
    [logs, addLog, applyOverride, clearAll, resetToSeed],
  );

  return (
    <LogStoreContext.Provider value={value}>
      {children}
    </LogStoreContext.Provider>
  );
}

export function useLogStore(): LogStore {
  const ctx = useContext(LogStoreContext);
  if (!ctx) {
    throw new Error("useLogStore must be used within a LogStoreProvider");
  }
  return ctx;
}
