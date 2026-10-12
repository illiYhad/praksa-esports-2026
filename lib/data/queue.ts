import type { Category, Match, Player, Station, Team } from "../types";

// กติกาคิว "คนเดียวกันห้ามลง 2 แมตช์พร้อมกัน" — ฟังก์ชันล้วน (ไม่มี @/ import) ใช้ได้ทั้ง engine และ scripts/check-queue.mts
// คนเดียวกันข้ามประเภท = person_key เดียวกัน · ห้ามคืนชื่อนักกีฬาออกไปจากโมดูลนี้

export type QueueData = { categories: Category[]; teams: Team[]; players: Player[]; matches: Match[] };

/** person_key ของทุกคนในทีม A/B ของแมตช์ */
export function personsOfMatch(m: Match, d: Pick<QueueData, "players">): Set<string> {
  const keys = new Set<string>();
  for (const p of d.players) if (p.person_key && (p.team_id === m.team_a_id || p.team_id === m.team_b_id)) keys.add(p.person_key);
  return keys;
}

/** แมตช์ที่ "ครองตัวคน" อยู่: กำลังแข่ง หรือรอเริ่มที่ลงสถานีแล้ว */
const isActive = (m: Match) => m.status === "ongoing" || (m.status === "scheduled" && !!m.station_id);

const shares = (a: Set<string>, b: Set<string>) => {
  for (const k of a) if (b.has(k)) return true;
  return false;
};

/** แมตช์อื่นที่ active และมีนักกีฬาซ้ำกับ m (ใช้ตอนจัดคิวอัตโนมัติ) */
export function activeConflict(m: Match, d: QueueData): Match | undefined {
  const mine = personsOfMatch(m, d);
  if (!mine.size) return undefined;
  return d.matches.find((o) => o.id !== m.id && isActive(o) && shares(mine, personsOfMatch(o, d)));
}

/** แก้ตารางด้วยมือ: ชนเมื่ออีกแมตช์กำลังแข่ง หรือรอเริ่มในสถานี/เวลาเดียวกัน (เวลาว่างฝั่งใดฝั่งหนึ่ง = ถือว่าชน) */
export function manualConflicts(m: Match, d: QueueData): Match[] {
  if (!m.station_id && !m.scheduled_time) return [];
  const mine = personsOfMatch(m, d);
  if (!mine.size) return [];
  return d.matches.filter((o) => {
    if (o.id === m.id || !shares(mine, personsOfMatch(o, d))) return false;
    if (o.status === "ongoing") return true;
    if (o.status !== "scheduled" || (!o.station_id && !o.scheduled_time)) return false;
    return !o.scheduled_time || !m.scheduled_time || o.scheduled_time === m.scheduled_time;
  });
}

/** ป้ายแมตช์แบบสั้น: "<ประเภท> <รอบ> #<ลำดับ>" (ไม่มีชื่อคน) */
export function matchLabel(m: Match, categories: Category[]): string {
  const cat = categories.find((c) => c.id === m.category_id);
  return `${cat?.name ?? "?"} ${m.round_name}${m.sort_order !== undefined ? ` #${m.sort_order + 1}` : ""}`;
}

export const waitLabel = (other: Match, categories: Category[]) => `รอ: นักกีฬาซ้ำกับ ${matchLabel(other, categories)}`;

/** ลงแมตช์ที่พร้อมเล่นของเกมนี้ไปสถานีว่าง · ข้ามแมตช์ที่มีคนซ้ำกับแมตช์ active (เปลี่ยน matches ในที่) */
export function planQueue(d: QueueData, stations: Station[], gameId: string, now: string) {
  const catIds = new Set(d.categories.filter((c) => c.game_id === gameId).map((c) => c.id));
  const gameMatches = d.matches.filter((m) => catIds.has(m.category_id));
  const busy = new Set(gameMatches.filter((m) => m.station_id && (m.status === "ongoing" || m.status === "scheduled")).map((m) => m.station_id));
  const free = stations.filter((st) => st.game_id === gameId && !busy.has(st.id));
  const ready = gameMatches
    .filter((m) => m.status === "scheduled" && m.team_a_id && m.team_b_id && !m.station_id)
    .sort((a, b) => (a.round_no ?? 0) - (b.round_no ?? 0) || a.category_id.localeCompare(b.category_id) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const assigned: Match[] = [];
  const skipped: { match: Match; blockedBy: Match }[] = [];
  for (const m of ready) {
    if (assigned.length >= free.length) break;
    const blockedBy = activeConflict(m, d); // แมตช์ที่เพิ่งลงในรอบนี้นับเป็น active ด้วย
    if (blockedBy) {
      skipped.push({ match: m, blockedBy });
      continue;
    }
    m.station_id = free[assigned.length].id;
    if (!m.scheduled_time) m.scheduled_time = now;
    assigned.push(m);
  }
  return { assigned, skipped };
}

/** แมตช์ที่พร้อมเล่นแต่ยังไม่ลงสถานี และติดนักกีฬาซ้ำ → ป้าย "รอ: …" */
export function waitingNotes(d: QueueData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of d.matches) {
    if (m.status !== "scheduled" || m.station_id || !m.team_a_id || !m.team_b_id) continue;
    const o = activeConflict(m, d);
    if (o) out[m.id] = waitLabel(o, d.categories);
  }
  return out;
}

export type OverlapRow = { a: string; b: string; people: number; orgs: number };

/** ประเภทที่มีนักกีฬาซ้ำกัน (นับจำนวนคน + จำนวน อปท.) — ไม่มีชื่อคน */
export function categoryOverlaps(d: Pick<QueueData, "categories" | "teams" | "players">): OverlapRow[] {
  const teamOf = new Map(d.teams.map((t) => [t.id, t]));
  const byCat = new Map<string, Map<string, string>>(); // category → person_key → อปท.
  for (const p of d.players) {
    const t = teamOf.get(p.team_id);
    if (!p.person_key || !t) continue;
    if (!byCat.has(t.category_id)) byCat.set(t.category_id, new Map());
    byCat.get(t.category_id)!.set(p.person_key, t.team_code ?? t.id);
  }
  const cats = d.categories.filter((c) => byCat.has(c.id));
  const rows: OverlapRow[] = [];
  for (let i = 0; i < cats.length; i++) {
    for (let j = i + 1; j < cats.length; j++) {
      const A = byCat.get(cats[i].id)!;
      const B = byCat.get(cats[j].id)!;
      const orgs = new Set<string>();
      let people = 0;
      for (const [k, org] of A) if (B.has(k)) { people++; orgs.add(org); }
      if (people) rows.push({ a: cats[i].name, b: cats[j].name, people, orgs: orgs.size });
    }
  }
  return rows.sort((x, y) => y.people - x.people);
}
