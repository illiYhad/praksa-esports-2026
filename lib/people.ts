import type { AthletePhoto, Player, Team } from "@/lib/types";

// ตัวตนนักกีฬาข้ามประเภท + กติกาชื่อบนหน้าสาธารณะ (PDPA: ซ่อนชื่อจริงรายคนได้ · รูปขึ้นเฉพาะคนที่ยินยอม)

/** กุญแจคน: person_key ถ้ามี · ไม่มี (เพิ่มเองไม่มีชื่อจริง) ใช้ id ของแถว */
export const personKeyOf = (p: Player) => p.person_key ?? p.id;

/** id รูปจาก person_key — ใช้เป็น path ได้ (djb2 hex) */
export function photoIdFor(personKey: string): string {
  let h = 5381;
  for (let i = 0; i < personKey.length; i++) h = ((h << 5) + h + personKey.charCodeAt(i)) >>> 0;
  return `ph${h.toString(16)}${personKey.length.toString(36)}`;
}

/** อักษรย่อจากชื่อ (ไทย/อังกฤษ): ตัวแรกของแต่ละคำ สูงสุด 2 คำ · คำไทยที่ขึ้นด้วยสระหน้า (เ แ โ ใ ไ) เอาสระ+พยัญชนะ */
export function initialsOf(name?: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words
    .slice(0, 2)
    .map((w) => {
      const chars = Array.from(w);
      return /[เแโใไ]/.test(chars[0]) && chars[1] ? chars[0] + chars[1] : chars[0];
    })
    .join("");
}

/** ชื่อหลักบนหน้าสาธารณะ: ชื่อในเกม → ชื่อจริง (ถ้าไม่ซ่อน) → อักษรย่อ */
export function athleteName(p: Player): string {
  if (p.in_game_name) return p.in_game_name;
  if (p.real_name && !p.hide_real_name) return p.real_name;
  return initialsOf(p.real_name);
}

/** ชื่อรอง (ชื่อจริง) — ไม่แสดงถ้าซ่อนหรือซ้ำกับชื่อหลัก */
export function secondaryName(p: Player): string | undefined {
  if (!p.real_name || p.hide_real_name) return undefined;
  return p.real_name === athleteName(p) ? undefined : p.real_name;
}

/** รูปที่แสดงบนหน้าสาธารณะได้ (ต้องยินยอม) */
export function publicPhoto(photos: AthletePhoto[], p: Player): AthletePhoto | undefined {
  const key = personKeyOf(p);
  return photos.find((ph) => ph.person_key === key && ph.consent);
}

/** รวมแถว players ของคนเดียวกัน (หลายประเภท) */
export type Person = { key: string; players: Player[]; primary: Player; teams: Team[] };

export function groupPersons(players: Player[], teams: Team[]): Person[] {
  const map = new Map<string, Player[]>();
  for (const p of players) {
    const k = personKeyOf(p);
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  return [...map.entries()].map(([key, rows]) => {
    const primary = rows.find((r) => r.in_game_name) ?? rows[0];
    const ts = rows.map((r) => teams.find((t) => t.id === r.team_id)).filter((t): t is Team => !!t);
    return { key, players: rows, primary, teams: ts };
  });
}
