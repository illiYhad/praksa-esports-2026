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

/** ชื่อประเภทแบบสั้น: "ประเภททีมชาย ROV รุ่น 16 ปี" → "ทีมชาย 16 ปี" */
export function shortCategoryName(name: string, gameName: string): string {
  let s = name.replace(/^ประเภท/, "");
  if (gameName) s = s.replace(gameName, "");
  s = s.replace(/Street Fighter 6|eFootball Mobile|eFootball|ROV/gi, "").replace(/รุ่น/, "").replace(/\(ไม่จำกัดเพศ\)/, "โอเพน");
  return s.replace(/\s+/g, " ").trim() || name;
}

/** เวลา HH:mm ตามเวลาไทย */
export const clockOf = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" }) : "-";

/** วันที่ YYYY-MM-DD ตามเวลาไทย (ใช้จับคู่กับวันแข่ง) */
export const dayKeyOf = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) : "");

/** วันที่ภาษาไทยแบบสั้น เช่น "จันทร์ 19 ต.ค. 2569" (พ.ศ.) */
export function thaiDate(ymd: string): string {
  if (!ymd) return "-";
  const d = new Date(`${ymd}T00:00:00+07:00`);
  const part = (opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", ...opts });
  const weekday = part({ weekday: "long" }).replace(/^วัน/, "");
  const year = part({ year: "numeric" }).replace(/^พ\.ศ\.\s*/, "");
  return `${weekday} ${part({ day: "numeric" })} ${part({ month: "short" })} ${year}`;
}

/** ISO → ค่าช่อง datetime-local ตามเวลาไทย (YYYY-MM-DDTHH:mm) */
export function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${p(Number(get("hour")) % 24)}:${get("minute")}`;
}

/** ค่าช่อง datetime-local (เวลาไทย) → ISO */
export const fromLocalInput = (v: string) => (v ? new Date(`${v}:00+07:00`).toISOString() : null);

/** สปอนเซอร์ที่เปิดใช้ในตำแหน่งนั้น เรียงตาม sequence */
export const sponsorsAt = (sponsors: Sponsor[], position: SponsorPosition) =>
  sponsors.filter((s) => s.is_active && s.position === position).sort((a, b) => a.sequence - b.sequence);
