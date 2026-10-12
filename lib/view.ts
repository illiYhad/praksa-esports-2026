import type { Match, Sponsor, SponsorPosition, Team } from "@/lib/types";

export const nameOf = (list: Team[], id?: string) => list.find((t) => t.id === id)?.name ?? "รอผลคู่ก่อนหน้า";

export const timeOf = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "short", timeStyle: "short" })
    : "-";

export const statusLabel: Record<Match["status"], string> = {
  scheduled: "รอแข่ง",
  ongoing: "กำลังแข่ง",
  ended: "จบ รอรับรอง",
  certified: "รับรองแล้ว",
};

/** สปอนเซอร์ที่เปิดใช้ในตำแหน่งนั้น เรียงตาม sequence */
export const sponsorsAt = (sponsors: Sponsor[], position: SponsorPosition) =>
  sponsors.filter((s) => s.is_active && s.position === position).sort((a, b) => a.sequence - b.sequence);
