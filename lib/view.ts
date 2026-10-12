import type { BracketFormat, Match, MatchStage, SingleEntryResolution, Sponsor, SponsorPosition, Team } from "@/lib/types";

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

export const formatLabel: Record<BracketFormat, string> = {
  single: "แพ้คัดออก",
  double: "แพ้สองครั้งคัดออก",
  round_robin: "พบกันหมด",
  groups: "แบ่งกลุ่ม + น็อกเอาต์",
};

export const singleEntryLabel: Record<SingleEntryResolution, string> = {
  pending: "ยังไม่เลือก",
  walkover: "ได้รางวัลโดยไม่มีคู่แข่ง",
  merge: "ยุบรวมกับประเภทอื่น",
  cancel: "ยกเลิกประเภท",
};

export const stageLabel: Record<MatchStage, string> = {
  winners: "สายบน / น็อกเอาต์",
  losers: "สายล่าง",
  final: "Grand Final",
  third: "ชิงอันดับ 3",
  group: "รอบแบ่งกลุ่ม / พบกันหมด",
};

/** สปอนเซอร์ที่เปิดใช้ในตำแหน่งนั้น เรียงตาม sequence */
export const sponsorsAt = (sponsors: Sponsor[], position: SponsorPosition) =>
  sponsors.filter((s) => s.is_active && s.position === position).sort((a, b) => a.sequence - b.sequence);
