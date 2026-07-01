import { useCallback, useState } from "react";
import {
  ScanSearch,
  Loader2,
  X,
  ListChecks,
  Sparkles,
  Camera,
  MonitorPlay,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SideCameraPanel, type FrameSource } from "./SideCameraPanel";
import { ResultDisplay } from "./ResultDisplay";
import { OverrideDialog } from "./OverrideDialog";
import { useCamera } from "./useCamera";
import { verifyContainer } from "@/lib/verifyContainer";
import { useLogStore } from "@/data/store";
import { useSession } from "@/data/session";
import { employeeName, stationName } from "@/data/constants";
import type { Override, VerificationLog } from "@/types";

type Phase = "idle" | "verifying" | "result";

interface SideState {
  source: FrameSource;
  image?: string;
  fromCamera: boolean;
}

const EMPTY_SIDE: SideState = { source: "none", fromCamera: false };

export function VerifyStation() {
  const { stationId, employeeId } = useSession();
  const { addLog, applyOverride } = useLogStore();
  const camA = useCamera();
  const camB = useCamera();

  const [a, setA] = useState<SideState>(EMPTY_SIDE);
  const [b, setB] = useState<SideState>(EMPTY_SIDE);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<VerificationLog | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  // --- helpers to address a side generically ---
  const cams = { A: camA, B: camB };
  const setters = { A: setA, B: setB };

  const startCamera = useCallback(
    async (side: "A" | "B") => {
      await cams[side].start();
      setters[side]({ source: "camera", fromCamera: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const uploadSide = useCallback((side: "A" | "B", file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      setters[side]({
        source: "image",
        image: reader.result as string,
        fromCamera: false,
      });
    reader.readAsDataURL(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const demoSide = useCallback((side: "A" | "B") => {
    cams[side].stop();
    setters[side]({ source: "demo", fromCamera: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startBothCameras = useCallback(() => {
    void startCamera("A");
    void startCamera("B");
  }, [startCamera]);

  const demoBoth = useCallback(() => {
    demoSide("A");
    demoSide("B");
  }, [demoSide]);

  const changeSources = useCallback(() => {
    camA.stop();
    camB.stop();
    setA(EMPTY_SIDE);
    setB(EMPTY_SIDE);
  }, [camA, camB]);

  const handleVerify = useCallback(async () => {
    // Freeze frames from any live cameras.
    let imgA = a.image;
    let imgB = b.image;
    if (a.source === "camera") {
      imgA = camA.capture();
      setA({ source: "image", image: imgA, fromCamera: true });
    }
    if (b.source === "camera") {
      imgB = camB.capture();
      setB({ source: "image", image: imgB, fromCamera: true });
    }

    setPhase("verifying");
    const result = await verifyContainer({
      stationId,
      employeeId,
      imageA: imgA,
      imageB: imgB,
    });
    const newLog = addLog({
      stationId,
      employeeId,
      imageA: imgA,
      imageB: imgB,
      result,
    });
    setLog(newLog);
    setPhase("result");
  }, [a, b, camA, camB, stationId, employeeId, addLog]);

  const resetSide = useCallback((s: SideState): SideState => {
    if (s.source === "image" && s.fromCamera) {
      return { source: "camera", fromCamera: false };
    }
    if (s.source === "image") return EMPTY_SIDE;
    return s; // demo / camera stay
  }, []);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setLog(null);
    setA((prev) => resetSide(prev));
    setB((prev) => resetSide(prev));
  }, [resetSide]);

  const handleOverrideSubmit = useCallback(
    (override: Override) => {
      if (!log) return;
      applyOverride(log.id, override);
      setLog({ ...log, override });
    },
    [log, applyOverride],
  );

  const sideReady = (s: SideState, camState: string) =>
    (s.source === "camera" && camState === "live") ||
    s.source === "image" ||
    s.source === "demo";

  const canVerify =
    phase === "idle" &&
    sideReady(a, camA.state) &&
    sideReady(b, camB.state);

  const anySource = a.source !== "none" || b.source !== "none";

  const statusA = phase === "result" && log ? log.result.sideA.status : undefined;
  const statusB = phase === "result" && log ? log.result.sideB.status : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      {/* ---- Left: dual cameras + verify ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              กล้อง 2 ตัว · Dual-Camera (ด้าน A + ด้าน B)
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground">
              {stationName(stationId)}
            </p>
          </div>
          {phase === "idle" && (
            <div className="flex items-center gap-1.5">
              {anySource ? (
                <Button variant="ghost" size="sm" onClick={changeSources}>
                  <X /> ล้างแหล่งภาพ
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={startBothCameras}>
                    <Camera /> เปิดกล้องทั้งคู่
                  </Button>
                  <Button variant="secondary" size="sm" onClick={demoBoth}>
                    <MonitorPlay /> Demo ทั้งคู่
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SideCameraPanel
            side="A"
            videoRef={camA.videoRef}
            cameraState={camA.state}
            source={a.source}
            imageDataUrl={a.image}
            phase={phase}
            statusAfter={statusA}
            onStartCamera={() => startCamera("A")}
            onUpload={(f) => uploadSide("A", f)}
            onUseDemo={() => demoSide("A")}
          />
          <SideCameraPanel
            side="B"
            videoRef={camB.videoRef}
            cameraState={camB.state}
            source={b.source}
            imageDataUrl={b.image}
            phase={phase}
            statusAfter={statusB}
            onStartCamera={() => startCamera("B")}
            onUpload={(f) => uploadSide("B", f)}
            onUseDemo={() => demoSide("B")}
          />
        </div>

        {/* Hero Verify button */}
        <div className="relative">
          <Button
            size="lg"
            onClick={handleVerify}
            disabled={!canVerify}
            className="relative h-16 w-full text-lg font-semibold tracking-wide"
          >
            {phase === "verifying" ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                กำลังตรวจสอบ… (Verifying)
              </>
            ) : (
              <>
                <ScanSearch className="size-5" />
                Verify — ตรวจสอบการล็อกทั้งสองด้าน
              </>
            )}
          </Button>
          {canVerify && (
            <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-md" />
          )}
        </div>

        {!canVerify && phase === "idle" && (
          <p className="text-center text-[11px] text-muted-foreground">
            เลือกแหล่งภาพให้ครบทั้ง ด้าน A และ ด้าน B ก่อนกด Verify
          </p>
        )}

        <p className="text-center font-mono text-[11px] text-muted-foreground">
          ผู้ตรวจ · {employeeName(employeeId)} ({employeeId})
        </p>
      </section>

      {/* ---- Right: instructions / result ---- */}
      <section className="min-w-0">
        {phase === "result" && log ? (
          <ResultDisplay
            log={log}
            onOverride={() => setOverrideOpen(true)}
            onReset={handleReset}
          />
        ) : phase === "verifying" ? (
          <VerifyingPanel />
        ) : (
          <InstructionsPanel />
        )}
      </section>

      {log && (
        <OverrideDialog
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          modelVerdict={log.result.overall}
          currentVerdict={log.override?.overriddenVerdict ?? log.result.overall}
          onSubmit={handleOverrideSubmit}
        />
      )}
    </div>
  );
}

const STEPS = [
  "วางคอนเทนเนอร์ในจุดที่กำหนด ให้กล้องด้าน A และ ด้าน B เห็นตัวล็อกของแต่ละด้านชัดเจน",
  "เลือกแหล่งภาพของแต่ละกล้อง: กล้องประจำสถานี, ถ่ายจากแท็บเล็ต หรือโหมด Demo",
  "กดปุ่ม Verify — ระบบจะจับภาพจากกล้องทั้งสองตัวพร้อมกัน แล้วรอผลภายใน 2–3 วินาที",
  "ระบบสรุปผล Pass / Fail จากสถานะของ ด้าน A และ ด้าน B ประกอบกัน",
];

function InstructionsPanel() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-border bg-card/40 p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <ListChecks className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">ขั้นตอนการตรวจสอบ</h3>
          <p className="text-xs text-muted-foreground">
            Container Lock Verification · 2 กล้อง
          </p>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-secondary font-mono text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="pt-0.5 text-sm text-foreground/85">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs text-muted-foreground text-balance">
          <span className="font-medium text-foreground">โหมด POC:</span>{" "}
          ผลการตรวจเป็นข้อมูลจำลอง (mock) สำหรับสาธิต flow การใช้งาน —
          พร้อมเชื่อมต่อโมเดล AI จริงในเฟสถัดไปโดยไม่ต้องแก้ UI
        </p>
      </div>
    </div>
  );
}

function VerifyingPanel() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 rounded-xl border border-border bg-card/40 p-6">
      <div className="relative flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
        <ScanSearch className="size-8 text-primary" />
      </div>
      <div className="space-y-1 text-center">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Analyzing frames
        </p>
        <p className="text-sm text-muted-foreground">
          กำลังประเมินสถานะการล็อกจากกล้องทั้งสองตัว…
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {["จับภาพจากกล้องด้าน A + ด้าน B", "วิเคราะห์ตัวล็อกด้าน A", "วิเคราะห์ตัวล็อกด้าน B"].map(
          (t, i) => (
            <div
              key={t}
              className="animate-rise flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"
              style={{ animationDelay: `${i * 180}ms` }}
            >
              <Loader2 className="size-3.5 animate-spin text-primary/70" />
              {t}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
