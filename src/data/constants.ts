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
 * public/videos). Each Verify Station camera plays one of these on loop, and
 * the current frame is captured when the operator taps Verify.
 */
const SAMPLE_VIDEO_FILES = [
  "11a31738-3618-4d40-bf04-073dc11feb12.mp4",
  "17079749-4cdd-4db9-bfc9-f9412926652d.mp4",
  "3cd8a0f9-0e77-478e-b9c0-229ee6aba58b.mp4",
  "62705ed2-1283-49bf-b667-f13937894256.mp4",
  "7fcef7b4-2083-43a3-8430-09cceeab713f.mp4",
  "c6f63c2d-07e1-487b-9209-73c36767486e.mp4",
];

export const SAMPLE_VIDEOS = SAMPLE_VIDEO_FILES.map(
  (f) => `${import.meta.env.BASE_URL}videos/${f}`,
);

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
