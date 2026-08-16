import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Boxes, KeyRound, Loader2, LogIn, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEED_CREDENTIALS, useAuth } from "@/data/auth";

/**
 * Terminal sign-in. Every action in the system is recorded against the
 * signed-in account (see the user log), so the station starts here.
 */
export function LoginView() {
  const { ready, currentUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (ready && currentUser) return <Navigate to={from} replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    setError("");
    const res = await login(username, password);
    setBusy(false);
    if (res.ok) navigate(from, { replace: true });
    else setError(res.error);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-lg bg-hazard-stripes">
            <span className="absolute inset-[3px] flex items-center justify-center rounded-md bg-background">
              <Boxes className="size-5 text-primary" />
            </span>
          </div>
          <div className="leading-none">
            <div className="font-mono text-lg font-bold tracking-tight">UBE</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Container Lock Verification · เข้าสู่ระบบ
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-5 panel-glow"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="username">ชื่อผู้ใช้ (Username)</Label>
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoCapitalize="none"
                autoComplete="username"
                className="h-11 pl-9 font-mono"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">รหัสผ่าน (Password)</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11 pl-9"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-sm font-medium text-fail">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={busy || !ready}>
            {busy || !ready ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            เข้าสู่ระบบ
          </Button>
        </form>

        {/* POC seed accounts so the demo is usable on first run */}
        <div className="mt-4 rounded-lg border border-border/70 bg-secondary/30 px-4 py-3">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            บัญชีตัวอย่าง (POC)
          </div>
          <div className="flex flex-col gap-1 font-mono text-xs text-foreground/80">
            {SEED_CREDENTIALS.map((c) => (
              <div key={c.username} className="flex items-center justify-between gap-3">
                <span>
                  {c.username} / {c.password}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {c.role === "supervisor" ? "หัวหน้างาน" : "พนักงาน"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
