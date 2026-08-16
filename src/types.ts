// ---------------------------------------------------------------------------
// Domain types for the UBE Container Lock Verification System.
// These are shared between the (currently mocked) verification layer, the log
// store, the event/audit log, the user accounts, and the UI. When a real
// backend/vision model is wired in later, the same shapes should be returned
// so the UI needs no changes.
// ---------------------------------------------------------------------------

/** Per-side lock classification. Kept in English per UI spec (technical terms). */
export type LockStatus = "Locked" | "Unlocked" | "NotVisible";

/** Which latch point of the container. The station has FOUR cameras (A–D). */
export type SideKey = "A" | "B" | "C" | "D";

export const SIDE_KEYS: readonly SideKey[] = ["A", "B", "C", "D"] as const;

/** Overall verdict for a single verification. */
export type Verdict = "Pass" | "Fail" | "Uncertain";

/**
 * Whether this verification is the container's first check or a re-check of a
 * container whose latest result was not Pass (scanned again after fixing).
 */
export type AttemptType = "initial" | "rework";

export interface SideResult {
  status: LockStatus;
  /** Model confidence 0..1 for this side. */
  confidence: number;
}

/** One captured frame per side camera, as data URLs. */
export type SideImages = Partial<Record<SideKey, string>>;

/** The raw prediction returned by verifyContainer(). */
export interface VerificationResult {
  sides: Record<SideKey, SideResult>;
  overall: Verdict;
  /** Overall confidence 0..1 (min across sides). */
  confidence: number;
  /** Whether a container was detected in the marked zone at all. */
  containerPresent: boolean;
  /** Human-readable Thai reason, populated for Fail / Uncertain. */
  reason?: string;
}

/**
 * Context passed into a verification. The container ID comes from the
 * mandatory QR scan; each of the four cameras contributes one frame.
 */
export interface VerifyInput {
  /** Scanned QR code — the container's ID (mandatory, primary key). */
  containerId: string;
  stationId: string;
  employeeId: string;
  attempt: AttemptType;
  images?: SideImages;
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
  /** Scanned QR — groups attempts on the same physical container. */
  containerId: string;
  attempt: AttemptType;
  timestamp: number;
  stationId: string;
  employeeId: string;
  /** Captured frame from each side's camera. */
  images?: SideImages;
  result: VerificationResult;
  override?: Override;
}

/** The effective verdict = override if present, else the model verdict. */
export function effectiveVerdict(log: VerificationLog): Verdict {
  return log.override?.overriddenVerdict ?? log.result.overall;
}

// ---------------------------------------------------------------------------
// User accounts (POC: stored in localStorage; production would use an auth
// service — see pipe_counting's ls_backend for the reference layout).
// ---------------------------------------------------------------------------

export type Role = "operator" | "supervisor";

export interface UserAccount {
  /** Stable employee id (EMP-…/SUP-…) referenced by logs and events. */
  id: string;
  /** Login name, lowercase. */
  username: string;
  /** Display name (Thai). */
  name: string;
  role: Role;
  /** SHA-256 hex of the password (POC-grade; a real backend does argon2id). */
  passwordHash: string;
  active: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

// ---------------------------------------------------------------------------
// Event log (user log): verification events off the line + audit events off
// the operator, in one chronological record — same idea as pipe_counting.
// ---------------------------------------------------------------------------

export type EventKind =
  | "verify_pass"
  | "verify_fail"
  | "verify_uncertain"
  | "override"
  | "login"
  | "logout"
  | "login_failed"
  | "user_created"
  | "user_updated"
  | "settings_changed"
  | "data_reset";

/** Audit kinds are account/config actions — visible to supervisors only. */
export const AUDIT_KINDS = new Set<EventKind>([
  "override",
  "login",
  "logout",
  "login_failed",
  "user_created",
  "user_updated",
  "settings_changed",
  "data_reset",
]);

export const isAuditKind = (k: EventKind) => AUDIT_KINDS.has(k);

export interface AppEvent {
  id: string;
  ts: number;
  kind: EventKind;
  /** User id (EMP-…/SUP-…) that caused the event; attempted username on login_failed. */
  actor?: string;
  stationId?: string;
  containerId?: string;
  /** Free-text Thai context: the changed fields, reason, verdict, … */
  detail?: string;
}
