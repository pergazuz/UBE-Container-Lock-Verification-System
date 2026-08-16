import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/data/auth";
import type { Override, Verdict } from "@/types";
import { verdictLabel } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelVerdict: Verdict;
  currentVerdict: Verdict;
  onSubmit: (override: Override) => void;
}

const VERDICT_OPTIONS: Verdict[] = ["Pass", "Fail", "Uncertain"];

export function OverrideDialog({
  open,
  onOpenChange,
  modelVerdict,
  currentVerdict,
  onSubmit,
}: Props) {
  const { users, currentUser, verifyPassword } = useAuth();
  const supervisors = useMemo(
    () => users.filter((u) => u.role === "supervisor" && u.active),
    [users],
  );
  // If a supervisor is signed in, they sign off as themselves by default.
  const defaultSupervisor =
    currentUser?.role === "supervisor" ? currentUser.id : supervisors[0]?.id ?? "";

  const [supervisorId, setSupervisorId] = useState(defaultSupervisor);
  const [password, setPassword] = useState("");
  const [verdict, setVerdict] = useState<Verdict>(
    currentVerdict === "Pass" ? "Fail" : "Pass",
  );
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setSupervisorId(defaultSupervisor);
      setVerdict(currentVerdict === "Pass" ? "Fail" : "Pass");
      setPassword("");
      setNote("");
      setError("");
    }
  }, [open, currentVerdict, defaultSupervisor]);

  async function handleSubmit() {
    if (busy || !supervisorId) return;
    setBusy(true);
    setError("");
    // The override is a supervisor's signature — confirm it with their password.
    const ok = await verifyPassword(supervisorId, password);
    setBusy(false);
    if (!ok) {
      setError("รหัสผ่านหัวหน้างานไม่ถูกต้อง");
      return;
    }
    onSubmit({
      overriddenVerdict: verdict,
      supervisorId,
      note: note.trim() || undefined,
      at: Date.now(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <DialogTitle>แก้ไขผล (Supervisor Override)</DialogTitle>
          <DialogDescription>
            บันทึกการแก้ไขผลโดยหัวหน้างานสำหรับกรณีที่ระบบอ่านผิด
            ข้อมูลนี้จะถูกเก็บแยกไว้เพื่อใช้ปรับปรุงโมเดล (retraining)
            — ยืนยันตัวตนด้วยรหัสผ่านหัวหน้างาน
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            ผลจากระบบ (Model):{" "}
            <span className="font-mono font-semibold text-foreground">
              {verdictLabel(modelVerdict)}
            </span>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="supervisor">หัวหน้างาน (Supervisor)</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger id="supervisor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supervisors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sup-password">รหัสผ่านหัวหน้างาน</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="verdict">ผลที่แก้ไขเป็น</Label>
            <Select
              value={verdict}
              onValueChange={(v) => setVerdict(v as Verdict)}
            >
              <SelectTrigger id="verdict">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERDICT_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {verdictLabel(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ตรวจสอบด้วยสายตาแล้วล็อกเรียบร้อย"
            />
          </div>

          {error && (
            <div className="rounded-md border border-fail/40 bg-fail/10 px-3 py-2 text-sm font-medium text-fail">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !password || !supervisorId}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            บันทึกการแก้ไข
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
