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
