import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CONTAINER_TYPES } from "./constants";

// ---------------------------------------------------------------------------
// App-wide configuration for the verification terminal. Persisted to
// localStorage so a station keeps its setup. Consumed by the Verify Station
// (default source, threshold, sound) and the verification call.
// ---------------------------------------------------------------------------

const KEY = "ube.settings.v1";

export interface Settings {
  /** Below this confidence a "both locked" result becomes Uncertain. */
  confidenceThreshold: number; // 0..1
  containerType: string;
  soundOnResult: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  confidenceThreshold: 0.72,
  containerType: CONTAINER_TYPES[0].id,
  soundOnResult: true,
};

interface SettingsStore {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsStore | null>(null);

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo<SettingsStore>(
    () => ({ settings, update, reset }),
    [settings, update, reset],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsStore {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
