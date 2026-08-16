import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck } from "lucide-react";
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

/**
 * Overriding a verdict is supervisor-only: the buttons that open this dialog
 * are hidden from operators, and the signed-in supervisor already proved who
 * they are at login — the override is signed with the session account, no
 * password re-entry.
 */
export function OverrideDialog({
  open,
  onOpenChange,
  modelVerdict,
  currentVerdict,
  onSubmit,
}: Props) {
  const { currentUser } = useAuth();
  const supervisor =
    currentUser?.role === "supervisor" ? currentUser : null;

  const [verdict, setVerdict] = useState<Verdict>(
    currentVerdict === "Pass" ? "Fail" : "Pass",
  );
  const [note, setNote] = useState("");

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setVerdict(currentVerdict === "Pass" ? "Fail" : "Pass");
      setNote("");
    }
  }, [open, currentVerdict]);

  function handleSubmit() {
    if (!supervisor) return;
    onSubmit({
      overriddenVerdict: verdict,
      supervisorId: supervisor.id,
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
            ข้อมูลนี้จะถูกเก็บแยกไว้เพื่อใช้ปรับปรุงโมเดล (retraining) —
            ลงชื่อด้วยบัญชีที่เข้าสู่ระบบอยู่
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            ผลจากระบบ (Model):{" "}
            <span className="font-mono font-semibold text-foreground">
              {verdictLabel(modelVerdict)}
            </span>
          </div>

          {supervisor && (
            // Identity comes from the session — no password re-entry.
            <div className="flex items-center gap-2.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-2.5">
              <UserCheck className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 text-sm">
                <span className="font-medium text-foreground">
                  ลงชื่อแก้ไขโดย {supervisor.name}
                </span>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  ({supervisor.id})
                </span>
                <div className="text-[11px] text-muted-foreground">
                  เข้าสู่ระบบในฐานะหัวหน้างานแล้ว — ไม่ต้องกรอกรหัสผ่านซ้ำ
                </div>
              </div>
            </div>
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={!supervisor}>
            บันทึกการแก้ไข
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
