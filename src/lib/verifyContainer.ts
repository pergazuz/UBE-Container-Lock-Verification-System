import {
  SIDE_KEYS,
  type LockStatus,
  type SideKey,
  type SideResult,
  type VerificationResult,
  type VerifyInput,
  type Verdict,
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
//  this same signature. `input.images` carries one frame per side camera
//  (A–D) and `input.containerId` the scanned QR.
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

/**
 * Mock a single side. With a ground-truth `expected` status (from the chosen
 * sample clip's final frame) the result is deterministic; otherwise falls
 * back to a weighted random outcome, where a rework attempt (operator just
 * fixed the latches) skews heavily to Locked.
 */
function mockSide(expected: LockStatus | undefined, rework: boolean): SideResult {
  const status =
    expected ??
    pickWeighted<LockStatus>(
      rework
        ? [
            ["Locked", 87],
            ["Unlocked", 9],
            ["NotVisible", 4],
          ]
        : [
            ["Locked", 74],
            ["Unlocked", 17],
            ["NotVisible", 9],
          ],
    );

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
  sides: Record<SideKey, SideResult>,
  threshold: number,
): { overall: Verdict; confidence: number; reason?: string } {
  const notVisible = SIDE_KEYS.filter((k) => sides[k].status === "NotVisible");
  const unlocked = SIDE_KEYS.filter((k) => sides[k].status === "Unlocked");

  // Overall confidence = the weakest signal across the four cameras.
  const confidence = round2(
    Math.min(...SIDE_KEYS.map((k) => sides[k].confidence)),
  );

  if (notVisible.length) {
    return {
      overall: "Fail",
      confidence,
      reason: `มองไม่เห็นตัวล็อกด้าน ${notVisible.join(" และ ")} — กรุณาจัดวางคอนเทนเนอร์ใหม่ให้เห็นตัวล็อกครบทั้ง 4 ด้าน`,
    };
  }

  if (unlocked.length) {
    return {
      overall: "Fail",
      confidence,
      reason: `พบตัวล็อกยังไม่ปิดที่ด้าน ${unlocked.join(" และ ")} — กรุณาล็อกให้เรียบร้อยแล้ว Verify อีกครั้ง`,
    };
  }

  // All locked, but low confidence → ask for a manual recheck rather than
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
  // In the real version, each frame in `input.images` (one per side camera)
  // would be sent to the model / vision endpoint along with the container ID.
  await delay(randBetween(MIN_DELAY, MAX_DELAY));

  // Deterministic when the caller supplies the sample clips' ground truth;
  // the random "no container" case only applies to fully-random mocking.
  const deterministic = SIDE_KEYS.some(
    (k) => input.expectedStatuses?.[k] != null,
  );

  // ~6% of the time no container is detected in the marked zone.
  const containerPresent = deterministic || Math.random() > 0.06;
  if (!containerPresent) {
    const empty: SideResult = { status: "NotVisible", confidence: 0.2 };
    return {
      sides: { A: empty, B: empty, C: empty, D: empty },
      overall: "Fail",
      confidence: 0.2,
      containerPresent: false,
      reason:
        "ไม่พบคอนเทนเนอร์ในพื้นที่ที่กำหนด — กรุณาวางคอนเทนเนอร์ในกรอบแล้ว Verify อีกครั้ง",
    };
  }

  const threshold = input.confidenceThreshold ?? CONFIDENCE_THRESHOLD;
  const rework = input.attempt === "rework";
  const sides = Object.fromEntries(
    SIDE_KEYS.map((k) => [k, mockSide(input.expectedStatuses?.[k], rework)]),
  ) as Record<SideKey, SideResult>;
  const { overall, confidence, reason } = deriveVerdict(sides, threshold);

  return { sides, overall, confidence, containerPresent: true, reason };
}
