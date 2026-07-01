import type {
  LockStatus,
  SideResult,
  VerificationResult,
  VerifyInput,
  Verdict,
} from "@/types";

// ===========================================================================
//  verifyContainer() — THE SINGLE SWAP POINT
// ---------------------------------------------------------------------------
//  POC / Frontend-only: this returns a *mocked* prediction after a simulated
//  processing delay. The whole rest of the app depends only on the returned
//  `VerificationResult` shape, so wiring a real backend later means replacing
//  ONLY the body of this function — no UI changes required.
//
//  Future real implementation (illustrative):
//
//    export async function verifyContainer(
//      input: VerifyInput,
//    ): Promise<VerificationResult> {
//      const res = await fetch(`${API_BASE}/verify`, {
//        method: "POST",
//        headers: { "Content-Type": "application/json" },
//        body: JSON.stringify(input),
//      });
//      if (!res.ok) throw new Error(`verify failed: ${res.status}`);
//      return (await res.json()) as VerificationResult;
//    }
//
//  A zero-shot vision API or rule-based latch-angle check would live behind
//  this same signature.
// ===========================================================================

/** Confidence below this → overall verdict becomes `Uncertain` (manual check). */
export const CONFIDENCE_THRESHOLD = 0.72;

/** Simulated model processing window (ms) — keeps result within the 2–3s SLA. */
const MIN_DELAY = 1400;
const MAX_DELAY = 2400;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function pickWeighted<T>(entries: Array<[T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

/** Mock a single side: mostly Locked, occasionally Unlocked / NotVisible. */
function mockSide(): SideResult {
  const status = pickWeighted<LockStatus>([
    ["Locked", 68],
    ["Unlocked", 22],
    ["NotVisible", 10],
  ]);

  // Confidence bands feel realistic per outcome.
  const confidence =
    status === "Locked"
      ? randBetween(0.78, 0.99)
      : status === "Unlocked"
        ? randBetween(0.7, 0.97)
        : randBetween(0.4, 0.66);

  return { status, confidence: round2(confidence) };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function deriveVerdict(
  sideA: SideResult,
  sideB: SideResult,
  threshold: number,
): { overall: Verdict; confidence: number; reason?: string } {
  const anyNotVisible =
    sideA.status === "NotVisible" || sideB.status === "NotVisible";
  const bothLocked =
    sideA.status === "Locked" && sideB.status === "Locked";

  // Overall confidence = the weakest visible signal.
  const confidence = round2(Math.min(sideA.confidence, sideB.confidence));

  if (anyNotVisible) {
    const sides = [
      sideA.status === "NotVisible" ? "A" : null,
      sideB.status === "NotVisible" ? "B" : null,
    ].filter(Boolean);
    return {
      overall: "Fail",
      confidence,
      reason: `มองไม่เห็นตัวล็อกด้าน ${sides.join(" และ ")} — กรุณาจัดวางคอนเทนเนอร์ใหม่ให้เห็นตัวล็อกทั้งสองด้าน`,
    };
  }

  if (!bothLocked) {
    const open = [
      sideA.status === "Unlocked" ? "A" : null,
      sideB.status === "Unlocked" ? "B" : null,
    ].filter(Boolean);
    return {
      overall: "Fail",
      confidence,
      reason: `พบตัวล็อกยังไม่ปิดที่ด้าน ${open.join(" และ ")} — กรุณาล็อกให้เรียบร้อยแล้ว Verify อีกครั้ง`,
    };
  }

  // Both locked, but low confidence → ask for a manual recheck rather than
  // returning a possibly-false Pass (per false-positive minimization guidance).
  if (confidence < threshold) {
    return {
      overall: "Uncertain",
      confidence,
      reason:
        "ระบบไม่มั่นใจในผลการตรวจ (confidence ต่ำ) — กรุณาตรวจสอบด้วยสายตาหรือ Verify อีกครั้ง",
    };
  }

  return { overall: "Pass", confidence };
}

export async function verifyContainer(
  input: VerifyInput,
): Promise<VerificationResult> {
  // In the real version, `input.imageA` and `input.imageB` (one frame per
  // side camera) would each be sent to the model / vision endpoint.
  void input;

  await delay(randBetween(MIN_DELAY, MAX_DELAY));

  // ~6% of the time no container is detected in the marked zone.
  const containerPresent = Math.random() > 0.06;
  if (!containerPresent) {
    const empty: SideResult = { status: "NotVisible", confidence: 0.2 };
    return {
      sideA: empty,
      sideB: empty,
      overall: "Fail",
      confidence: 0.2,
      containerPresent: false,
      reason:
        "ไม่พบคอนเทนเนอร์ในพื้นที่ที่กำหนด — กรุณาวางคอนเทนเนอร์ในกรอบแล้ว Verify อีกครั้ง",
    };
  }

  const threshold = input.confidenceThreshold ?? CONFIDENCE_THRESHOLD;
  const sideA = mockSide();
  const sideB = mockSide();
  const { overall, confidence, reason } = deriveVerdict(sideA, sideB, threshold);

  return { sideA, sideB, overall, confidence, containerPresent: true, reason };
}
