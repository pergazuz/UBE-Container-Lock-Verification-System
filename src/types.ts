// ---------------------------------------------------------------------------
// Domain types for the UBE Container Lock Verification System.
// These are shared between the (currently mocked) verification layer, the log
// store, and the UI. When a real backend/vision model is wired in later, the
// same shapes should be returned so the UI needs no changes.
// ---------------------------------------------------------------------------

/** Per-side lock classification. Kept in English per UI spec (technical terms). */
export type LockStatus = "Locked" | "Unlocked" | "NotVisible";

/** Which physical side of the container. */
export type SideKey = "A" | "B";

/** Overall verdict for a single verification. */
export type Verdict = "Pass" | "Fail" | "Uncertain";

export interface SideResult {
  status: LockStatus;
  /** Model confidence 0..1 for this side. */
  confidence: number;
}

/** The raw prediction returned by verifyContainer(). */
export interface VerificationResult {
  sideA: SideResult;
  sideB: SideResult;
  overall: Verdict;
  /** Overall confidence 0..1 (min across visible sides). */
  confidence: number;
  /** Whether a container was detected in the marked zone at all. */
  containerPresent: boolean;
  /** Human-readable Thai reason, populated for Fail / Uncertain. */
  reason?: string;
}

/**
 * Context passed into a verification. The station has TWO cameras — one aimed
 * at each side's latch — so each side has its own captured frame.
 */
export interface VerifyInput {
  stationId: string;
  employeeId: string;
  /** Data URL of the frame from the Side A camera, if captured/uploaded. */
  imageA?: string;
  /** Data URL of the frame from the Side B camera, if captured/uploaded. */
  imageB?: string;
  /** Optional override for the Uncertain threshold (from settings). */
  confidenceThreshold?: number;
}

/** A supervisor correction applied on top of a prediction. */
export interface Override {
  overriddenVerdict: Verdict;
  supervisorId: string;
  note?: string;
  at: number;
}

/** One persisted verification event (prediction + context + optional override). */
export interface VerificationLog {
  id: string;
  timestamp: number;
  stationId: string;
  employeeId: string;
  /** Captured frame from each side's camera. */
  imageA?: string;
  imageB?: string;
  result: VerificationResult;
  override?: Override;
}

/** The effective verdict = override if present, else the model verdict. */
export function effectiveVerdict(log: VerificationLog): Verdict {
  return log.override?.overriddenVerdict ?? log.result.overall;
}
