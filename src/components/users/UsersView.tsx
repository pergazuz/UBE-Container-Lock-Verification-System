import { useMemo, useState } from "react";
import {
  KeyRound,
  Loader2,
  Power,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MIN_PASSWORD, useAuth } from "@/data/auth";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

export function UsersView() {
  const { users, currentUser, setUserActive, setUserRole } = useAuth();
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const sorted = useMemo(
    () =>
      [...users].sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          a.username.localeCompare(b.username),
      ),
    [users],
  );

  function run(res: { ok: true } | { ok: false; error: string }) {
    setActionError(res.ok ? "" : res.error);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          ระบบต้องมีหัวหน้างานที่ใช้งานได้อย่างน้อย 1 คนเสมอ — ทุกการแก้ไขถูกบันทึกในบันทึกเหตุการณ์
        </p>
        <Button size="sm" onClick={() => setCreating(true)}>
          <UserPlus /> เพิ่มผู้ใช้
        </Button>
      </div>

      {actionError && (
        <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-sm font-medium text-fail">
          {actionError}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card/40 panel-glow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">ผู้ใช้</th>
                <th className="px-4 py-3 font-medium">บทบาท</th>
                <th className="px-4 py-3 font-medium">สถานะ</th>
                <th className="px-4 py-3 font-medium">เข้าระบบล่าสุด</th>
                <th className="px-4 py-3 text-right font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const isMe = u.id === currentUser?.id;
                return (
                  <tr
                    key={u.username}
                    className={cn(
                      "border-b border-border/60 last:border-0 hover:bg-secondary/30",
                      !u.active && "opacity-55",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-foreground">
                          {u.username}
                        </span>
                        {isMe && (
                          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-primary">
                            (คุณ)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {u.name} · <span className="font-mono">{u.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={u.role}
                        onValueChange={(v) => run(setUserRole(u.username, v as Role))}
                      >
                        <SelectTrigger className="h-9 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">พนักงาน</SelectItem>
                          <SelectItem value="supervisor">หัวหน้างาน</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.active ? "pass" : "fail"}>
                        {u.active ? "ใช้งานได้" : "ปิดใช้งาน"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {u.lastLoginAt ? `${formatDateTime(u.lastLoginAt)} น.` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResetting(u.username)}
                        >
                          <KeyRound className="size-3.5" /> รีเซ็ตรหัสผ่าน
                        </Button>
                        <Button
                          variant={u.active ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => run(setUserActive(u.username, !u.active))}
                        >
                          <Power className="size-3.5" />
                          {u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateDialog open={creating} onClose={() => setCreating(false)} />
      <ResetDialog username={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createUser } = useAuth();
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("operator");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setUsername("");
    setName("");
    setPassword("");
    setRole("operator");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await createUser({ username, name, password, role });
    setBusy(false);
    if (res.ok) {
      reset();
      onClose();
    } else setError(res.error);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มผู้ใช้ใหม่</DialogTitle>
          <DialogDescription>
            บัญชีสำหรับเข้าใช้งานสถานีตรวจสอบ — ชื่อผู้ใช้เป็นตัวพิมพ์เล็ก a-z 0-9 . _ -
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="new-username">ชื่อผู้ใช้ (Username)</Label>
            <Input
              id="new-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-name">ชื่อ-นามสกุล</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-password">รหัสผ่าน</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              อย่างน้อย {MIN_PASSWORD} ตัวอักษร
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>บทบาท</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">พนักงาน (Operator)</SelectItem>
                <SelectItem value="supervisor">หัวหน้างาน (Supervisor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-sm font-medium text-fail">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus />}
              สร้างบัญชี
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({
  username,
  onClose,
}: {
  username: string | null;
  onClose: () => void;
}) {
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || busy) return;
    setBusy(true);
    const res = await resetPassword(username, password);
    setBusy(false);
    if (res.ok) {
      setPassword("");
      setError("");
      onClose();
    } else setError(res.error);
  }

  return (
    <Dialog
      open={Boolean(username)}
      onOpenChange={(o) => {
        if (!o) {
          setPassword("");
          setError("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
          <DialogDescription>
            ตั้งรหัสผ่านใหม่ให้บัญชี{" "}
            <span className="font-mono font-semibold">{username}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="grid gap-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="reset-password">รหัสผ่านใหม่</Label>
            <Input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              อย่างน้อย {MIN_PASSWORD} ตัวอักษร
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-sm font-medium text-fail">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={busy || !password}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound />}
              บันทึกรหัสผ่าน
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
