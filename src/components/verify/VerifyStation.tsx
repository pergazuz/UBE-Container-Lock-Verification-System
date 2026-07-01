import { useCallback, useRef, useState } from "react";
import { ScanSearch, Loader2, Shuffle, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SideCameraPanel } from "./SideCameraPanel";
import { ResultDisplay } from "./ResultDisplay";
import { OverrideDialog } from "./OverrideDialog";
import { verifyContainer } from "@/lib/verifyContainer";
import { useLogStore } from "@/data/store";
import { useSession } from "@/data/session";
import { useSettings } from "@/data/settings";
import { employeeName, stationName, SAMPLE_VIDEOS } from "@/data/constants";
import type { Override, VerificationLog, Verdict } from "@/types";

type Phase = "idle" | "verifying" | "result";

const N = SAMPLE_VIDEOS.length;
const next = (i: number) => (i + 1) % N;

/** Grab the current frame of a playing <video> as a JPEG data URL. */
function captureFrame(video: HTMLVideoElement | null): string | undefined {
  if (!video || !video.videoWidth) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function VerifyStation() {
  const { stationId, employeeId } = useSession();
  const { addLog, applyOverride } = useLogStore();
  const { settings } = useSettings();

  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const [aIdx, setAIdx] = useState(0);
  const [bIdx, setBIdx] = useState(1 % N);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<VerificationLog | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const handleVerify = useCallback(async () => {
    const imgA = captureFrame(videoARef.current);
    const imgB = captureFrame(videoBRef.current);
    // Freeze the analysed frame on screen while processing / showing result.
    videoARef.current?.pause();
    videoBRef.current?.pause();

    setPhase("verifying");
    const result = await verifyContainer({
      stationId,
      employeeId,
      imageA: imgA,
      imageB: imgB,
      confidenceThreshold: settings.confidenceThreshold,
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
    if (settings.soundOnResult) playResultSound(result.overall);
  }, [stationId, employeeId, addLog, settings]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setLog(null);
    videoARef.current?.play().catch(() => undefined);
    videoBRef.current?.play().catch(() => undefined);
  }, []);

  const shuffle = useCallback(() => {
    setAIdx((i) => next(i));
    setBIdx((i) => {
      const nb = next(next(i));
      return nb;
    });
  }, []);

  const handleOverrideSubmit = useCallback(
    (override: Override) => {
      if (!log) return;
      applyOverride(log.id, override);
      setLog({ ...log, override });
    },
    [log, applyOverride],
  );

  const statusA = phase === "result" && log ? log.result.sideA.status : undefined;
  const statusB = phase === "result" && log ? log.result.sideB.status : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      {/* ---- Left: dual sample-video cameras + verify ---- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              กล้อง 2 ตัว · Dual-Camera (ด้าน A + ด้าน B)
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground">
              {stationName(stationId)} · ภาพตัวอย่าง (sample footage)
            </p>
          </div>
          {phase === "idle" && (
            <Button variant="outline" size="sm" onClick={shuffle}>
              <Shuffle /> สุ่มตัวอย่างใหม่
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <SideCameraPanel
            side="A"
            videoRef={videoARef}
            videoSrc={SAMPLE_VIDEOS[aIdx]}
            phase={phase}
            statusAfter={statusA}
            onCycle={() => setAIdx((i) => next(i))}
          />
          <SideCameraPanel
            side="B"
            videoRef={videoBRef}
            videoSrc={SAMPLE_VIDEOS[bIdx]}
            phase={phase}
            statusAfter={statusB}
            onCycle={() => setBIdx((i) => next(i))}
          />
        </div>

        {/* Hero Verify button */}
        <div className="relative">
          <Button
            size="lg"
            onClick={handleVerify}
            disabled={phase !== "idle"}
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
          {phase === "idle" && (
            <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-md" />
          )}
        </div>

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

/** Short audio cue on result — pleasant chime for Pass, low buzz otherwise. */
function playResultSound(verdict: Verdict) {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes =
      verdict === "Pass"
        ? [660, 990]
        : verdict === "Uncertain"
          ? [520, 520]
          : [300, 200];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = verdict === "Pass" ? "sine" : "square";
      osc.frequency.value = freq;
      const t = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
    setTimeout(() => ctx.close(), 600);
  } catch {
    /* audio not available — ignore */
  }
}

const STEPS = [
  "กล้องด้าน A และ ด้าน B แสดงภาพจากกล้องประจำสถานี (POC ใช้ภาพตัวอย่าง)",
  "ปรับ/สุ่มคลิปตัวอย่างได้ที่ปุ่ม Sample บนแต่ละกล้อง หรือ “สุ่มตัวอย่างใหม่”",
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
