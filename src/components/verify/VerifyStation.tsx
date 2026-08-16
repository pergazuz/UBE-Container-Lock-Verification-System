import { useCallback, useMemo, useRef, useState } from "react";
import {
  ScanSearch,
  Loader2,
  Timer,
  ListChecks,
  QrCode,
  Wrench,
  X,
  CircleCheckBig,
  PowerOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SideCameraPanel } from "./SideCameraPanel";
import { ResultDisplay } from "./ResultDisplay";
import { OverrideDialog } from "./OverrideDialog";
import { verifyContainer } from "@/lib/verifyContainer";
import { useLogStore } from "@/data/store";
import { useSession } from "@/data/session";
import { useSettings } from "@/data/settings";
import { useAuth } from "@/data/auth";
import { stationName, SAMPLE_VIDEOS } from "@/data/constants";
import { formatTime, verdictLabel } from "@/lib/format";
import {
  SIDE_KEYS,
  effectiveVerdict,
  type AttemptType,
  type LockStatus,
  type Override,
  type SideImages,
  type SideKey,
  type VerificationLog,
  type Verdict,
} from "@/types";

type Phase = "idle" | "verifying" | "result";

/** The scanned QR + what we know about this container's history. */
interface ScannedContainer {
  id: string;
  attempt: AttemptType;
  /** Latest previous attempt on the same ID, if any. */
  prev?: VerificationLog;
}

type SideRecord<T> = Record<SideKey, T>;

const sideRecord = <T,>(init: (k: SideKey, i: number) => T): SideRecord<T> =>
  Object.fromEntries(SIDE_KEYS.map((k, i) => [k, init(k, i)])) as SideRecord<T>;

/**
 * Grab the current frame of a <video> as a JPEG data URL, downscaled — four
 * frames per verification go into localStorage, so keep them small.
 */
function captureFrame(video: HTMLVideoElement | null | undefined): string | undefined {
  if (!video || !video.videoWidth) return undefined;
  const scale = Math.min(1, 640 / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.6);
}

/** Random QR payload for the POC's simulated scan. */
function randomContainerId(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 34)];
  }
  return `UBE-${s}`;
}

export function VerifyStation() {
  const { stationId } = useSession();
  const { currentUser } = useAuth();
  const { logs, addLog, applyOverride, latestForContainer } = useLogStore();
  const { settings } = useSettings();

  const videoEls = useRef<Partial<SideRecord<HTMLVideoElement | null>>>({});
  // Each camera has its own selected sample clip…
  const [sampleIds, setSampleIds] = useState<SideRecord<string>>(() =>
    sideRecord((_, i) => SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length].id),
  );
  // …and each clip must play through to its final frame before Verify unlocks.
  const [ended, setEnded] = useState<SideRecord<boolean>>(() =>
    sideRecord(() => false),
  );

  const [container, setContainer] = useState<ScannedContainer | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<VerificationLog | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const sampleFor = useCallback(
    (k: SideKey) => SAMPLE_VIDEOS.find((s) => s.id === sampleIds[k])!,
    [sampleIds],
  );
  const allEnded = SIDE_KEYS.every((k) => ended[k]);

  const selectSample = useCallback((k: SideKey, id: string) => {
    setSampleIds((prev) => ({ ...prev, [k]: id }));
    setEnded((prev) => ({ ...prev, [k]: false }));
  }, []);

  const replay = useCallback((k: SideKey) => {
    setEnded((prev) => ({ ...prev, [k]: false }));
    const v = videoEls.current[k];
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => undefined);
  }, []);

  const handleScan = useCallback(
    (raw: string) => {
      const id = raw.trim().toUpperCase();
      if (!id) return;
      const prev = latestForContainer(id);
      const attempt: AttemptType =
        prev && effectiveVerdict(prev) !== "Pass" ? "rework" : "initial";
      setContainer({ id, attempt, prev });
    },
    [latestForContainer],
  );

  const handleVerify = useCallback(async () => {
    if (!container || !currentUser) return;
    // All clips are frozen on their final frame — capture exactly that, and
    // pass each clip's ground truth so the mock verdict matches what's shown.
    const images: SideImages = {};
    const expectedStatuses: Partial<Record<SideKey, LockStatus>> = {};
    for (const k of SIDE_KEYS) {
      const img = captureFrame(videoEls.current[k]);
      if (img) images[k] = img;
      expectedStatuses[k] = sampleFor(k).finalStatus;
    }

    setPhase("verifying");
    const result = await verifyContainer({
      containerId: container.id,
      stationId,
      employeeId: currentUser.id,
      attempt: container.attempt,
      images,
      confidenceThreshold: settings.confidenceThreshold,
      expectedStatuses,
    });
    const newLog = addLog({
      containerId: container.id,
      attempt: container.attempt,
      stationId,
      employeeId: currentUser.id,
      images,
      result,
    });
    setLog(newLog);
    setPhase("result");
    if (settings.soundOnResult) playResultSound(result.overall);
  }, [container, currentUser, stationId, addLog, settings, sampleFor]);

  const handleReset = useCallback(() => {
    setPhase("idle");
    setLog(null);
    setContainer(null); // next container needs a fresh scan
    for (const k of SIDE_KEYS) replay(k);
  }, [replay]);

  const handleOverrideSubmit = useCallback(
    (override: Override) => {
      if (!log) return;
      applyOverride(log.id, override);
      setLog({ ...log, override });
    },
    [log, applyOverride],
  );

  const statusFor = (k: SideKey) =>
    phase === "result" && log ? log.result.sides[k].status : undefined;

  // A supervisor can close a station from Settings; no verification there.
  const stationClosed = settings.closedStations.includes(stationId);
  const ready = Boolean(container) && allEnded && !stationClosed;

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      {/* ---- Left: QR scan + quad sample-video cameras + verify ---- */}
      <section className="flex flex-col gap-4">
        {stationClosed ? (
          <StationClosedBanner stationId={stationId} />
        ) : (
          <ScanBar
            container={container}
            disabled={phase !== "idle"}
            logs={logs}
            onScan={handleScan}
            onClear={() => setContainer(null)}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              กล้อง 4 ตัว · Quad-Camera (ด้าน A–D)
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground">
              {stationName(stationId)} · ภาพตัวอย่าง (sample footage)
            </p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-3">
          {SIDE_KEYS.map((k) => (
            <SideCameraPanel
              key={k}
              side={k}
              videoRef={(el) => {
                videoEls.current[k] = el;
              }}
              sample={sampleFor(k)}
              samples={SAMPLE_VIDEOS}
              phase={phase}
              statusAfter={statusFor(k)}
              ended={ended[k]}
              onEnded={() => setEnded((prev) => ({ ...prev, [k]: true }))}
              onSelectSample={(id) => selectSample(k, id)}
              onReplay={() => replay(k)}
            />
          ))}
        </div>

        {/* Hero Verify button — needs a scanned container + all clips ended */}
        <div className="relative">
          <Button
            size="lg"
            onClick={handleVerify}
            disabled={phase !== "idle" || !ready}
            className="relative h-16 w-full text-lg font-semibold tracking-wide shadow-[0_16px_48px_-18px_rgba(54,194,255,0.55)]"
          >
            {phase === "verifying" ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                กำลังตรวจสอบ… (Verifying)
              </>
            ) : stationClosed ? (
              <>
                <PowerOff className="size-5" />
                สถานีถูกปิดใช้งาน (Station closed)
              </>
            ) : !container ? (
              <>
                <QrCode className="size-5" />
                สแกน QR Code ก่อนเริ่มตรวจสอบ
              </>
            ) : !allEnded ? (
              <>
                <Timer className="size-5" />
                รอคลิปตัวอย่างเล่นจบ…
              </>
            ) : (
              <>
                <ScanSearch className="size-5" />
                Verify — ตรวจสอบการล็อกทั้ง 4 ด้าน
              </>
            )}
          </Button>
          {phase === "idle" && ready && (
            <span className="animate-pulse-ring pointer-events-none absolute inset-0 rounded-md" />
          )}
        </div>

        <p className="text-center font-mono text-[11px] text-muted-foreground">
          ผู้ตรวจ · {currentUser?.name} ({currentUser?.id})
        </p>
      </section>

      {/* ---- Right: instructions / result ---- */}
      <section className="flex min-w-0 flex-col justify-center">
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

/** Shown in place of the scan bar when a supervisor has closed this station. */
function StationClosedBanner({ stationId }: { stationId: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-fail/40 bg-fail/10 px-4 py-3">
      <PowerOff className="size-5 shrink-0 text-fail" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-fail">
            สถานี {stationId} ถูกปิดใช้งาน
          </span>
          <Badge variant="fail" className="px-1.5 py-0 text-[10px]">
            CLOSED
          </Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          หัวหน้างานปิดสถานีนี้ไว้ — เลือกสถานีอื่นจากเมนูด้านบน
          หรือให้หัวหน้างานเปิดสถานีที่หน้า ตั้งค่า › กล้อง & แหล่งภาพ
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QR scan bar — the mandatory first step. A USB QR scanner acts as a keyboard
// (types the code + Enter into the focused input); the buttons simulate that
// for the POC.
// ---------------------------------------------------------------------------

function ScanBar({
  container,
  disabled,
  logs,
  onScan,
  onClear,
}: {
  container: ScannedContainer | null;
  disabled: boolean;
  logs: VerificationLog[];
  onScan: (raw: string) => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState("");

  // A recent container whose latest attempt is not Pass — for demoing rework.
  const failedCandidate = useMemo(() => {
    const seen = new Set<string>();
    for (const l of logs) {
      if (seen.has(l.containerId)) continue; // first hit = latest attempt
      seen.add(l.containerId);
      if (effectiveVerdict(l) !== "Pass") return l.containerId;
    }
    return null;
  }, [logs]);

  function submit(raw: string) {
    onScan(raw);
    setValue("");
  }

  if (container) {
    const rework = container.attempt === "rework";
    const passedBefore =
      container.prev && effectiveVerdict(container.prev) === "Pass";
    return (
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
        style={{
          borderColor: rework
            ? "color-mix(in oklab, var(--uncertain) 45%, transparent)"
            : "color-mix(in oklab, var(--primary) 40%, transparent)",
          background: rework
            ? "color-mix(in oklab, var(--uncertain) 8%, transparent)"
            : "color-mix(in oklab, var(--primary) 6%, transparent)",
        }}
      >
        <QrCode
          className="size-5 shrink-0"
          style={{ color: rework ? "var(--uncertain)" : "var(--primary)" }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-base font-bold tracking-wide text-foreground">
              {container.id}
            </span>
            {rework ? (
              <Badge variant="uncertain" className="gap-1 px-1.5 py-0 text-[10px]">
                <Wrench className="size-2.5" /> งานแก้ไข · REWORK
              </Badge>
            ) : (
              <Badge variant="hazard" className="px-1.5 py-0 text-[10px]">
                งานใหม่ · INITIAL
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {rework && container.prev ? (
              <>
                ครั้งก่อน{" "}
                <span className="font-mono font-semibold text-uncertain">
                  {verdictLabel(effectiveVerdict(container.prev))}
                </span>{" "}
                · {formatTime(container.prev.timestamp)} น. — ตรวจซ้ำหลังแก้ไขการล็อก
              </>
            ) : passedBefore ? (
              <span className="flex items-center gap-1">
                <CircleCheckBig className="size-3 text-pass" />
                ตู้นี้เคยผ่านแล้ว — ตรวจซ้ำได้ตามปกติ
              </span>
            ) : (
              "พร้อมตรวจสอบ — รอคลิปเล่นจบแล้วกด Verify เพื่อตรวจเฟรมสุดท้ายจากกล้องทั้ง 4 ตัว"
            )}
          </p>
        </div>
        {!disabled && (
          <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
            <X className="size-3.5" /> สแกนใหม่
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <form
        className="flex items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <QrCode className="size-5 shrink-0 animate-pulse text-primary" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          placeholder="สแกน QR Code บนคอนเทนเนอร์… (Container ID)"
          className="h-10 flex-1 font-mono"
          aria-label="Container QR"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={!value.trim()}>
          ตกลง
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          POC · จำลองการสแกน:
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => submit(randomContainerId())}
        >
          <QrCode className="size-3" /> สแกนตู้ใหม่
        </Button>
        {failedCandidate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs text-uncertain"
            onClick={() => submit(failedCandidate)}
          >
            <Wrench className="size-3" /> สแกนตู้ที่ไม่ผ่าน ({failedCandidate})
          </Button>
        )}
      </div>
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
  "สแกน QR Code บนคอนเทนเนอร์ — หมายเลขตู้ (Container ID) เป็นข้อมูลบังคับของทุกการตรวจ",
  "เลือกคลิปตัวอย่าง — ล็อก หรือ ไม่ล็อก — จากเมนูมุมขวาบนของแต่ละกล้อง (ด้าน A–D)",
  "รอคลิปเล่นจนจบ ภาพจะหยุดที่เฟรมสุดท้าย แล้วปุ่ม Verify จะพร้อมใช้งาน",
  "กด Verify — ระบบตรวจเฟรมสุดท้ายของทั้ง 4 ด้าน แล้วสรุปผล Pass / Fail ภายใน 2–3 วินาที",
  "ตู้ที่ไม่ผ่าน: แก้ไขการล็อกแล้วสแกน QR เดิมอีกครั้ง — ระบบจะบันทึกเป็นงานแก้ไข (Rework) ใต้หมายเลขตู้เดียวกัน",
];

function InstructionsPanel() {
  return (
    <div className="panel-glow flex flex-col gap-5 rounded-xl border border-border bg-card/40 p-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
          <ListChecks className="size-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">ขั้นตอนการตรวจสอบ</h3>
          <p className="text-xs text-muted-foreground">
            Container Lock Verification · QR + 4 กล้อง
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
    </div>
  );
}

function VerifyingPanel() {
  return (
    <div className="panel-glow flex flex-1 flex-col items-center justify-center gap-5 rounded-xl border border-border bg-card/40 p-6">
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
          กำลังประเมินสถานะการล็อกจากกล้องทั้ง 4 ตัว…
        </p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        {[
          "จับภาพจากกล้องด้าน A–D (4 เฟรม)",
          "วิเคราะห์ตัวล็อกด้าน A + B",
          "วิเคราะห์ตัวล็อกด้าน C + D",
        ].map((t, i) => (
          <div
            key={t}
            className="animate-rise flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <Loader2 className="size-3.5 animate-spin text-primary/70" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
