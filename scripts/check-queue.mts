// ตรวจกติกาจัดคิว "คนเดียวกันห้ามลง 2 แมตช์พร้อมกัน" แบบไม่ต้องเปิดเว็บ: `npm run check:queue` (Node 24 strip types)
import { categoryOverlaps, manualConflicts, planQueue, waitingNotes, type QueueData } from "../lib/data/queue.ts";
import type { Match, Player, Team } from "../lib/types.ts";

let failures = 0;
const check = (cond: unknown, msg: string) => {
  console.log(cond ? "  ✅" : "  ❌", msg);
  if (!cond) failures++;
};

const NOW = "2026-10-12T09:00:00.000Z";
const categories = [
  { id: "rov-m", game_id: "rov", code: "ROV-M", name: "ROV ทีมชาย" },
  { id: "rov-x", game_id: "rov", code: "ROV-X", name: "ROV ทีมผสม" },
  { id: "rov-o", game_id: "rov", code: "ROV-O", name: "ROV ไม่จำกัดเพศ" },
];
const stations = [1, 2, 3].map((n) => ({ id: `st${n}`, game_id: "rov", name: `ROV-${n}` }));

const teams: Team[] = [];
const players: Player[] = [];
const team = (category_id: string, code: string, people: string[]) => {
  const t: Team = { id: `${category_id}-${code}`, category_id, team_code: code, name: `อปท. ${code}`, is_checked_in: true };
  teams.push(t);
  people.forEach((p, i) => players.push({ id: `${t.id}-p${i}`, team_id: t.id, in_game_name: p, is_captain: i === 0, person_key: `${p}|${code}` }));
};
// T02: 2 คนเล่นทั้งทีมชายและทีมผสม · ประเภทไม่จำกัดเพศไม่มีคนซ้ำ
team("rov-m", "T01", ["a1", "a2", "a3", "a4", "a5"]);
team("rov-m", "T02", ["b1", "b2", "b3", "b4", "b5"]);
team("rov-x", "T02", ["b1", "b2", "g1", "g2", "g3"]);
team("rov-x", "T03", ["c1", "c2", "c3", "c4", "c5"]);
team("rov-o", "T04", ["d1", "d2", "d3", "d4", "d5"]);
team("rov-o", "T05", ["e1", "e2", "e3", "e4", "e5"]);

const match = (id: string, category_id: string, a: string, b: string, extra: Partial<Match> = {}): Match => ({
  id, category_id, round_name: "รอบแรก", round_no: 1, sort_order: 0, best_of: 1, status: "scheduled",
  team_a_id: `${category_id}-${a}`, team_b_id: `${category_id}-${b}`, team_a_score: 0, team_b_score: 0, game_scores: [], updated_at: NOW, ...extra,
});
const men = match("m-men", "rov-m", "T01", "T02", { status: "ongoing", station_id: "st1", scheduled_time: NOW });
const mixed = match("m-mix", "rov-x", "T02", "T03");
const open = match("m-open", "rov-o", "T04", "T05");
const d: QueueData = { categories, teams, players, matches: [men, mixed, open] };

console.log("1) ROV ชาย (T02) กำลังเล่น → จัดคิว");
const r1 = planQueue(d, stations, "rov", NOW);
check(!mixed.station_id, "แมตช์ ROV ผสมของ T02 ไม่ถูกลงสถานี");
check(r1.skipped.some((s) => s.match.id === "m-mix" && s.blockedBy.id === "m-men"), "แมตช์ผสมถูกข้ามเพราะชนกับแมตช์ชาย");
check(!!open.station_id && r1.assigned.some((m) => m.id === "m-open"), `แมตช์ ROV ไม่จำกัดเพศ (ไม่มีคนซ้ำ) ลงสถานีได้ → ${open.station_id}`);
const note = waitingNotes(d)["m-mix"];
check(note?.startsWith("รอ: นักกีฬาซ้ำกับ ROV ทีมชาย"), `ป้ายรอ: "${note}"`);
check(!/[abg]\d/.test(note ?? ""), "ป้ายรอไม่มีชื่อนักกีฬา");

console.log("2) จบแมตช์ชาย → จัดคิวอีกครั้ง");
men.status = "ended";
const r2 = planQueue(d, stations, "rov", NOW);
check(!!mixed.station_id && r2.assigned.some((m) => m.id === "m-mix"), `แมตช์ผสมลงสถานีได้ → ${mixed.station_id}`);
check(mixed.station_id !== open.station_id, "ไม่ลงสถานีเดียวกับแมตช์ที่ลงไว้แล้ว");

console.log("3) ในรอบจัดคิวเดียวกัน แมตช์ที่เพิ่งลงนับเป็น active");
{
  const a = match("q-men", "rov-m", "T01", "T02");
  const b = match("q-mix", "rov-x", "T02", "T03", { sort_order: 1 });
  const dd: QueueData = { categories, teams, players, matches: [a, b] };
  planQueue(dd, stations, "rov", NOW);
  check(!!a.station_id !== !!b.station_id, "ลงได้แค่แมตช์เดียวจากคู่ที่มีคนซ้ำ");
}

console.log("4) แก้ด้วยมือ: เตือนเมื่อเวลาชน");
{
  const a = match("h-men", "rov-m", "T01", "T02", { station_id: "st1", scheduled_time: NOW });
  const b = match("h-mix", "rov-x", "T02", "T03", { station_id: "st2", scheduled_time: NOW });
  const c = match("h-open", "rov-o", "T04", "T05", { station_id: "st3", scheduled_time: NOW });
  const dd: QueueData = { categories, teams, players, matches: [a, b, c] };
  check(manualConflicts(b, dd).map((x) => x.id).join() === "h-men", "เวลาเดียวกัน → ชนกับแมตช์ชาย");
  check(manualConflicts(c, dd).length === 0, "ประเภทไม่มีคนซ้ำ → ไม่เตือน");
  check(manualConflicts({ ...b, scheduled_time: "2026-10-12T11:00:00.000Z" }, dd).length === 0, "คนละเวลา → ไม่เตือน");
}

console.log("5) แผงสรุปประเภทที่มีนักกีฬาซ้ำ");
{
  const rows = categoryOverlaps(d);
  console.log("    ", JSON.stringify(rows));
  check(rows.length === 1 && rows[0].people === 2 && rows[0].orgs === 1, "ROV ชาย ↔ ROV ผสม: 2 คน (1 อปท.) · คู่อื่นไม่ซ้ำ");
  check(!JSON.stringify(rows).match(/[abg]\d/), "แผงสรุปไม่มีชื่อนักกีฬา");
}

if (failures) {
  console.log(`\n${failures} ข้อผิดพลาด`);
  process.exit(1);
}
console.log("\nทั้งหมดผ่าน");
