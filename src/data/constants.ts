// Static reference data for the POC. In production these would come from an
// auth/session service and a stations registry.

export interface Employee {
  id: string;
  name: string;
  role: "operator" | "supervisor";
}

export const STATIONS = [
  { id: "ST-01", name: "ประตูขาออก 1 (Dock A)" },
  { id: "ST-02", name: "ประตูขาออก 2 (Dock B)" },
  { id: "ST-03", name: "จุดคัดแยก (Sorting)" },
] as const;

/**
 * Supported container/lock types. v1 pilot uses a single standard type; the
 * selector is here so more variants can be added later without a rebuild.
 */
export const CONTAINER_TYPES = [
  { id: "UBE-STD-01", name: "คอนเทนเนอร์มาตรฐาน · Standard tote (2 latch)" },
] as const;

/**
 * Sample footage used as the station's camera feed for the POC (served from
 * public/videos). Each clip plays ONCE and freezes on its final frame — the
 * frame the operator verifies against. `finalStatus` is the ground truth of
 * that final frame, which the mock model returns deterministically.
 */
export interface SampleVideo {
  id: string;
  src: string;
  /** Ground-truth latch state on the clip's final frame. */
  finalStatus: "Locked" | "Unlocked";
  /** Seconds into the clip when the latch becomes locked (absent = never). */
  lockAtSec?: number;
  /** Picker label shown in each camera's sample menu. */
  label: string;
}

const VIDEO_BASE = `${import.meta.env.BASE_URL}videos/`;

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: "3cd8a0f9",
    src: `${VIDEO_BASE}3cd8a0f9-0e77-478e-b9c0-229ee6aba58b.mp4`,
    finalStatus: "Locked",
    lockAtSec: 4,
    label: "คลิป 1 · ล็อก",
  },
  {
    id: "58c93254",
    src: `${VIDEO_BASE}58c93254-5151-43ab-bec9-e42f4d240c9a.mp4`,
    finalStatus: "Locked",
    lockAtSec: 3,
    label: "คลิป 2 · ล็อก",
  },
  {
    id: "62705ed2",
    src: `${VIDEO_BASE}62705ed2-1283-49bf-b667-f13937894256.mp4`,
    finalStatus: "Unlocked",
    label: "คลิป 3 · ไม่ล็อก",
  },
  {
    id: "a2174e62",
    src: `${VIDEO_BASE}a2174e62-9b37-4a21-8a1a-8610f959fcaf.mp4`,
    finalStatus: "Locked",
    lockAtSec: 5,
    label: "คลิป 4 · ล็อก",
  },
  {
    id: "c6f63c2d",
    src: `${VIDEO_BASE}c6f63c2d-07e1-487b-9209-73c36767486e.mp4`,
    finalStatus: "Unlocked",
    label: "คลิป 5 · ไม่ล็อก",
  },
  {
    id: "eefee1ed",
    src: `${VIDEO_BASE}eefee1ed-1588-4d27-8e56-ebd1f1ae5363.mp4`,
    finalStatus: "Locked",
    lockAtSec: 7,
    label: "คลิป 6 · ล็อก",
  },
];

export const EMPLOYEES: Employee[] = [
  { id: "EMP-1042", name: "สมชาย ใจดี", role: "operator" },
  { id: "EMP-1088", name: "กนกวรรณ ศรีสุข", role: "operator" },
  { id: "EMP-1103", name: "อภิวัฒน์ แซ่ลิ้ม", role: "operator" },
  { id: "SUP-2001", name: "วิไลพร มั่นคง", role: "supervisor" },
  { id: "SUP-2007", name: "ธนกร วงศ์ไทย", role: "supervisor" },
];

export const SUPERVISORS = EMPLOYEES.filter((e) => e.role === "supervisor");

export function employeeName(id: string): string {
  return EMPLOYEES.find((e) => e.id === id)?.name ?? id;
}

export function stationName(id: string): string {
  return STATIONS.find((s) => s.id === id)?.name ?? id;
}
