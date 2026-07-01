import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
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
import { SUPERVISORS } from "@/data/constants";
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
  const [supervisorId, setSupervisorId] = useState(SUPERVISORS[0].id);
  const [verdict, setVerdict] = useState<Verdict>(
    currentVerdict === "Pass" ? "Fail" : "Pass",
  );
  const [note, setNote] = useState("");

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) {
      setSupervisorId(SUPERVISORS[0].id);
      setVerdict(currentVerdict === "Pass" ? "Fail" : "Pass");
      setNote("");
    }
  }, [open, currentVerdict]);

  function handleSubmit() {
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
                {SUPERVISORS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit}>บันทึกการแก้ไข</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
