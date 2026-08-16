import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Role, UserAccount } from "@/types";
import { EMPLOYEES } from "./constants";
import { useLogStore } from "./store";

// ---------------------------------------------------------------------------
// User accounts + sign-in session, modeled after pipe_counting's panel auth.
// POC: the account table lives in localStorage and passwords are SHA-256
// hashes (Web Crypto) — production replaces this with an auth service doing
// argon2id, without changing the hook surface.
//
// AuthProvider must sit INSIDE LogStoreProvider: it writes login/logout/
// user-management events into the shared user log.
// ---------------------------------------------------------------------------

const USERS_KEY = "ube.users.v1";
const SESSION_KEY = "ube.auth.v1";

/** Checked by the forms for an immediate answer. */
export const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
export const MIN_PASSWORD = 6;

/** Shown on the login screen so the POC is usable on first run. */
export const SEED_CREDENTIALS: Array<{
  username: string;
  password: string;
  role: Role;
}> = [
  { username: "somchai", password: "ube1234", role: "operator" },
  { username: "wilaiporn", password: "super1234", role: "supervisor" },
];

/** Login name + password per seeded employee (see EMPLOYEES in constants). */
const SEED_LOGINS: Record<string, { username: string; password: string }> = {
  "EMP-1042": { username: "somchai", password: "ube1234" },
  "EMP-1088": { username: "kanokwan", password: "ube1234" },
  "EMP-1103": { username: "apiwat", password: "ube1234" },
  "SUP-2001": { username: "wilaiporn", password: "super1234" },
  "SUP-2007": { username: "thanakorn", password: "super1234" },
};

async function sha256Hex(text: string): Promise<string> {
  // crypto.subtle needs a secure context; POC fallback keeps dev-over-LAN alive.
  if (!crypto?.subtle) return `plain:${text}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function loadUsers(): UserAccount[] | null {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserAccount[];
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

function saveUsers(users: UserAccount[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* ignore */
  }
}

async function seedUsers(now: number): Promise<UserAccount[]> {
  return Promise.all(
    EMPLOYEES.map(async (e) => {
      const login = SEED_LOGINS[e.id];
      return {
        id: e.id,
        username: login.username,
        name: e.name,
        role: e.role,
        passwordHash: await sha256Hex(login.password),
        active: true,
        createdAt: now,
      } satisfies UserAccount;
    }),
  );
}

// Non-reactive name lookup for render helpers (tables, CSV) — kept in sync by
// the provider. Falls back to the seed employee list, then the raw id.
const nameCache = new Map<string, string>();
export function userName(id: string): string {
  return (
    nameCache.get(id) ?? EMPLOYEES.find((e) => e.id === id)?.name ?? id
  );
}

type ActionResult = { ok: true } | { ok: false; error: string };

interface AuthStore {
  /** False until the account table is loaded/seeded — gate routing on it. */
  ready: boolean;
  users: UserAccount[];
  currentUser: UserAccount | null;
  login: (username: string, password: string) => Promise<ActionResult>;
  logout: () => void;
  /** Confirms a user's password (supervisor sign-off on overrides). */
  verifyPassword: (userId: string, password: string) => Promise<boolean>;
  createUser: (input: {
    username: string;
    name: string;
    password: string;
    role: Role;
  }) => Promise<ActionResult>;
  setUserActive: (username: string, active: boolean) => ActionResult;
  setUserRole: (username: string, role: Role) => ActionResult;
  resetPassword: (username: string, password: string) => Promise<ActionResult>;
}

const AuthContext = createContext<AuthStore | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { logEvent } = useLogStore();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [ready, setReady] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });

  // Load or seed the account table (async because of password hashing).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = loadUsers();
      const table = existing ?? (await seedUsers(Date.now()));
      if (cancelled) return;
      if (!existing) saveUsers(table);
      setUsers(table);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) saveUsers(users);
    nameCache.clear();
    for (const u of users) nameCache.set(u.id, u.name);
  }, [users, ready]);

  useEffect(() => {
    try {
      if (currentUsername) localStorage.setItem(SESSION_KEY, currentUsername);
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* session simply won't survive a reload */
    }
  }, [currentUsername]);

  const currentUser = useMemo(() => {
    const u = users.find((x) => x.username === currentUsername);
    // A deactivated account loses its session on the next render.
    return u && u.active ? u : null;
  }, [users, currentUsername]);

  const login = useCallback(
    async (username: string, password: string): Promise<ActionResult> => {
      const uname = username.trim().toLowerCase();
      const user = users.find((u) => u.username === uname);
      const hash = await sha256Hex(password);
      if (!user || user.passwordHash !== hash) {
        logEvent({
          kind: "login_failed",
          actor: uname || undefined,
          detail: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        });
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      }
      if (!user.active) {
        logEvent({ kind: "login_failed", actor: user.id, detail: "บัญชีถูกปิดใช้งาน" });
        return { ok: false, error: "บัญชีนี้ถูกปิดใช้งาน — ติดต่อหัวหน้างาน" };
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.username === uname ? { ...u, lastLoginAt: Date.now() } : u,
        ),
      );
      setCurrentUsername(uname);
      logEvent({ kind: "login", actor: user.id });
      return { ok: true };
    },
    [users, logEvent],
  );

  const logout = useCallback(() => {
    if (currentUser) logEvent({ kind: "logout", actor: currentUser.id });
    setCurrentUsername(null);
  }, [currentUser, logEvent]);

  const verifyPassword = useCallback(
    async (userId: string, password: string): Promise<boolean> => {
      const user = users.find((u) => u.id === userId && u.active);
      if (!user) return false;
      return (await sha256Hex(password)) === user.passwordHash;
    },
    [users],
  );

  const createUser = useCallback(
    async (input: {
      username: string;
      name: string;
      password: string;
      role: Role;
    }): Promise<ActionResult> => {
      const uname = input.username.trim().toLowerCase();
      const name = input.name.trim();
      if (!USERNAME_RE.test(uname)) {
        return { ok: false, error: "ชื่อผู้ใช้: a-z 0-9 . _ - ยาว 3–20 ตัวอักษร" };
      }
      if (!name) return { ok: false, error: "กรุณากรอกชื่อ-นามสกุล" };
      if (input.password.length < MIN_PASSWORD) {
        return { ok: false, error: `รหัสผ่านอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` };
      }
      if (users.some((u) => u.username === uname)) {
        return { ok: false, error: "มีชื่อผู้ใช้นี้อยู่แล้ว" };
      }
      const ts = Date.now();
      const user: UserAccount = {
        id: `${input.role === "supervisor" ? "SUP" : "EMP"}-${ts.toString(36).toUpperCase()}`,
        username: uname,
        name,
        role: input.role,
        passwordHash: await sha256Hex(input.password),
        active: true,
        createdAt: ts,
      };
      setUsers((prev) => [...prev, user]);
      logEvent({
        kind: "user_created",
        actor: currentUser?.id,
        detail: `สร้างบัญชี ${uname} (${input.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"})`,
      });
      return { ok: true };
    },
    [users, currentUser, logEvent],
  );

  /** The panel must always keep one active supervisor able to sign in. */
  const isLastActiveSupervisor = useCallback(
    (username: string) => {
      const active = users.filter((u) => u.active && u.role === "supervisor");
      return active.length === 1 && active[0].username === username;
    },
    [users],
  );

  const setUserActive = useCallback(
    (username: string, active: boolean): ActionResult => {
      if (!active && currentUser?.username === username) {
        return { ok: false, error: "ปิดใช้งานบัญชีของตัวเองไม่ได้" };
      }
      if (!active && isLastActiveSupervisor(username)) {
        return { ok: false, error: "ต้องเหลือหัวหน้างานที่ใช้งานได้อย่างน้อย 1 คน" };
      }
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, active } : u)),
      );
      logEvent({
        kind: "user_updated",
        actor: currentUser?.id,
        detail: `${active ? "เปิด" : "ปิด"}ใช้งานบัญชี ${username}`,
      });
      return { ok: true };
    },
    [currentUser, isLastActiveSupervisor, logEvent],
  );

  const setUserRole = useCallback(
    (username: string, role: Role): ActionResult => {
      if (role === "operator" && isLastActiveSupervisor(username)) {
        return { ok: false, error: "ต้องเหลือหัวหน้างานที่ใช้งานได้อย่างน้อย 1 คน" };
      }
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, role } : u)),
      );
      logEvent({
        kind: "user_updated",
        actor: currentUser?.id,
        detail: `เปลี่ยนบทบาท ${username} → ${role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}`,
      });
      return { ok: true };
    },
    [currentUser, isLastActiveSupervisor, logEvent],
  );

  const resetPassword = useCallback(
    async (username: string, password: string): Promise<ActionResult> => {
      if (password.length < MIN_PASSWORD) {
        return { ok: false, error: `รหัสผ่านอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` };
      }
      const passwordHash = await sha256Hex(password);
      setUsers((prev) =>
        prev.map((u) => (u.username === username ? { ...u, passwordHash } : u)),
      );
      logEvent({
        kind: "user_updated",
        actor: currentUser?.id,
        detail: `รีเซ็ตรหัสผ่านของ ${username}`,
      });
      return { ok: true };
    },
    [currentUser, logEvent],
  );

  const value = useMemo<AuthStore>(
    () => ({
      ready,
      users,
      currentUser,
      login,
      logout,
      verifyPassword,
      createUser,
      setUserActive,
      setUserRole,
      resetPassword,
    }),
    [
      ready,
      users,
      currentUser,
      login,
      logout,
      verifyPassword,
      createUser,
      setUserActive,
      setUserRole,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthStore {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
