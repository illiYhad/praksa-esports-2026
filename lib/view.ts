import type { Match, Participant } from "@/lib/types";

export const nameOf = (list: Participant[], id?: string) =>
  list.find((p) => p.id === id)?.name ?? "รอผลคู่ก่อนหน้า";

export const timeOf = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
    : "-";

export const statusLabel: Record<Match["status"], string> = {
  scheduled: "รอแข่ง",
  live: "กำลังแข่ง",
  finished: "จบ รอรับรอง",
  confirmed: "รับรองแล้ว",
};
