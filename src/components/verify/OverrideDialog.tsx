import { useEffect, useMemo, useState } from "react";
import { KeyRound, Loader2, ShieldCheck, UserCheck } from "lucide-react";
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

  // A signed-in supervisor already proved who they are at login — they sign
  // the override as themselves with no password re-entry. An operator needs a
  // supervisor to authorize on the spot (pick account + password).
  const isSupervisor = currentUser?.role === "supervisor";

  const [supervisorId, setSupervisorId] = useState(supervisors[0]?.id ?? "");
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
      setSupervisorId(supervisors[0]?.id ?? "");
      setVerdict(currentVerdict === "Pass" ? "Fail" : "Pass");
      setPassword("");
      setNote("");
      setError("");
    }
  }, [open, currentVerdict, supervisors]);

  async function handleSubmit() {
    if (busy) return;
    const signerId = isSupervisor ? currentUser!.id : supervisorId;
    if (!signerId) return;
    if (!isSupervisor) {
      setBusy(true);
      setError("");
      const ok = await verifyPassword(supervisorId, password);
      setBusy(false);
      if (!ok) {
        setError("รหัสผ่านหัวหน้างานไม่ถูกต้อง");
        return;
      }
    }
    onSubmit({
      overriddenVerdict: verdict,
      supervisorId: signerId,
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
            {isSupervisor
              ? " — ลงชื่อด้วยบัญชีที่เข้าสู่ระบบอยู่"
              : " — ต้องให้หัวหน้างานยืนยันด้วยรหัสผ่าน"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            ผลจากระบบ (Model):{" "}
            <span className="font-mono font-semibold text-foreground">
              {verdictLabel(modelVerdict)}
            </span>
          </div>

          {isSupervisor ? (
            // Signed-in supervisor: identity comes from the session.
            <div className="flex items-center gap-2.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2.5">
              <UserCheck className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 text-sm">
                <span className="font-medium text-foreground">
                  ลงชื่อแก้ไขโดย {currentUser!.name}
                </span>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  ({currentUser!.id})
                </span>
                <div className="text-[11px] text-muted-foreground">
                  เข้าสู่ระบบในฐานะหัวหน้างานแล้ว — ไม่ต้องกรอกรหัสผ่านซ้ำ
                </div>
              </div>
            </div>
          ) : (
            <>
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
            </>
          )}

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
          <Button
            onClick={handleSubmit}
            disabled={
              busy || (isSupervisor ? false : !password || !supervisorId)
            }
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            บันทึกการแก้ไข
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
