// ตรวจตัวสร้างสายแบบไม่ต้องเปิดเว็บ: `npm run check:bracket` (Node 24 strip types)
import { DEFAULT_SETTING, generateBracket, generateKnockout, seedPositions, splitGroups, type MatchDraft } from "../lib/bracket/generate.ts";

let failures = 0;
const check = (cond: unknown, msg: string) => {
  if (!cond) {
    failures++;
    console.log("  ❌", msg);
  }
};

const teams = (n: number) => Array.from({ length: n }, (_, i) => `T${i + 1}`);

function verifyLinks(ms: MatchDraft[], label: string) {
  const byIdx = new Map(ms.map((m) => [m.idx, m]));
  // ทุกแมตช์ (ยกเว้นแมตช์สุดท้าย) ต้องมีทางไปต่อของผู้ชนะ · ลิงก์ต้องชี้ไปแมตช์ที่มีอยู่และช่องนั้นยังว่าง
  const finals = ms.filter((m) => m.next_idx === undefined);
  check(finals.length >= 1, `${label}: ไม่มีแมตช์ปลายทาง`);
  for (const m of ms) {
    if (m.next_idx !== undefined) {
      const n = byIdx.get(m.next_idx);
      check(!!n, `${label}: next_idx ${m.next_idx} ไม่มีอยู่`);
      check(n && n[m.next_match_slot === "a" ? "team_a_id" : "team_b_id"] === undefined, `${label}: ช่องปลายทางของ m${m.idx} ถูกใส่ทีมไว้แล้ว`);
    }
    if (m.loser_next_idx !== undefined) {
      const n = byIdx.get(m.loser_next_idx);
      check(!!n, `${label}: loser_next_idx ${m.loser_next_idx} ไม่มีอยู่`);
    }
    check(m.best_of >= 1, `${label}: best_of ของ m${m.idx} ผิด`);
  }
  // ไม่มีช่องว่างที่ไม่มีใครป้อน (ยกเว้นเป็นปลายทางของลิงก์)
  const fed = new Set<string>();
  for (const m of ms) {
    if (m.next_idx !== undefined) fed.add(`${m.next_idx}${m.next_match_slot}`);
    if (m.loser_next_idx !== undefined) fed.add(`${m.loser_next_idx}${m.loser_next_match_slot}`);
  }
  for (const m of ms) {
    if (!m.team_a_id) check(fed.has(`${m.idx}a`), `${label}: m${m.idx} ช่อง a ว่างและไม่มีใครป้อน (${m.round_name})`);
    if (!m.team_b_id) check(fed.has(`${m.idx}b`), `${label}: m${m.idx} ช่อง b ว่างและไม่มีใครป้อน (${m.round_name})`);
  }
}

console.log("seedPositions(8) =", seedPositions(8).join(","));
check(seedPositions(8).join(",") === "1,8,4,5,2,7,3,6", "seedPositions(8) ผิด");

for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 16, 19]) {
  for (const third of [false, true]) {
    const s = { ...DEFAULT_SETTING("c"), format: "single" as const, third_place: third };
    const ms = generateBracket(s, teams(n));
    const expected = n - 1 + (third && n >= 4 ? 1 : 0);
    check(ms.length === expected, `single n=${n} third=${third}: ได้ ${ms.length} แมตช์ คาด ${expected}`);
    const r1 = ms.filter((m) => m.round_no === 1);
    check(r1.every((m) => m.team_a_id && m.team_b_id), `single n=${n}: รอบแรกมีช่องว่าง (bye ไม่ถูกยุบ)`);
    const entered = new Set(ms.flatMap((m) => [m.team_a_id, m.team_b_id]).filter(Boolean));
    check(entered.size === n, `single n=${n}: ทีมเข้าสาย ${entered.size}/${n}`);
    verifyLinks(ms, `single n=${n} third=${third}`);
    if (third && n >= 4) check(ms.some((m) => m.stage === "third"), `single n=${n}: ไม่มีชิงอันดับ 3`);
  }
}
console.log("single ✓ (n=2..19)");

for (const n of [2, 3, 4, 5, 6, 7, 8, 12, 16]) {
  const s = { ...DEFAULT_SETTING("c"), format: "double" as const };
  const ms = generateBracket(s, teams(n));
  // แพ้สองครั้งคัดออก (ไม่มี reset): ทุกทีมยกเว้นแชมป์แพ้ 2 ครั้ง ยกเว้นรองแชมป์แพ้ 1 → 2n-2 แมตช์ (ก่อนยุบ bye) · หลังยุบ ≥ n
  check(ms.length >= n && ms.length <= 2 * n - 1, `double n=${n}: จำนวนแมตช์ ${ms.length} นอกช่วง`);
  check(ms.filter((m) => m.stage === "final").length === 1, `double n=${n}: Grand Final ไม่ใช่ 1 แมตช์`);
  const entered = new Set(ms.flatMap((m) => [m.team_a_id, m.team_b_id]).filter(Boolean));
  check(entered.size === n, `double n=${n}: ทีมเข้าสาย ${entered.size}/${n}`);
  // ทุกแมตช์สายบน (ยกเว้นแชมป์สายบนที่ไป GF) ต้องมีทางไปของผู้แพ้
  for (const m of ms.filter((x) => x.stage === "winners")) check(m.loser_next_idx !== undefined, `double n=${n}: m${m.idx} (${m.round_name}) ผู้แพ้ไม่มีที่ไป`);
  verifyLinks(ms, `double n=${n}`);
  if (n === 8) {
    const lb = ms.filter((m) => m.stage === "losers");
    check(lb.length === 6, `double n=8: สายล่างควร 6 แมตช์ ได้ ${lb.length}`);
    check(ms.length === 14, `double n=8: ควร 14 แมตช์ ได้ ${ms.length}`);
  }
}
console.log("double ✓ (n=2..16)");

for (const n of [3, 4, 5, 6, 8]) {
  const s = { ...DEFAULT_SETTING("c"), format: "round_robin" as const };
  const ms = generateBracket(s, teams(n));
  check(ms.length === (n * (n - 1)) / 2, `rr n=${n}: ได้ ${ms.length} คาด ${(n * (n - 1)) / 2}`);
  const pairs = new Set(ms.map((m) => [m.team_a_id, m.team_b_id].sort().join("-")));
  check(pairs.size === ms.length, `rr n=${n}: มีคู่ซ้ำ`);
  // แต่ละนัด ทีมหนึ่งลงไม่เกิน 1 ครั้ง
  const byRound = new Map<number, string[]>();
  for (const m of ms) byRound.set(m.round_no!, [...(byRound.get(m.round_no!) ?? []), m.team_a_id!, m.team_b_id!]);
  for (const [r, ts] of byRound) check(new Set(ts).size === ts.length, `rr n=${n}: นัดที่ ${r} มีทีมลงซ้ำ`);
}
console.log("round robin ✓");

{
  const g = splitGroups(teams(10), 3);
  check(g.map((x) => x.length).join(",") === "3,3,4", `splitGroups(10,3) = ${g.map((x) => x.length)}`); // แบบงู: A,B,C,C,B,A,A,B,C,C
  check(g[0][0] === "T1" && g[1][0] === "T2" && g[2][0] === "T3" && g[2][1] === "T4", "splitGroups ลำดับงูผิด");
  const s = { ...DEFAULT_SETTING("c"), format: "groups" as const, group_count: 2, advance_per_group: 2, third_place: true };
  const ms = generateBracket(s, teams(8));
  check(ms.length === 12, `groups 8/2: ได้ ${ms.length} คาด 12`);
  check(ms.every((m) => m.stage === "group" && m.group_name), "groups: แมตช์ไม่ใช่ stage group");
  const ko = generateKnockout(s, ["A1", "B1", "A2", "B2"]);
  check(ko.length === 4, `knockout 4 ทีม + ชิงที่ 3: ได้ ${ko.length} คาด 4`);
  const semi = ko.filter((m) => m.round_no === 1);
  check(semi.some((m) => m.team_a_id === "A1" && m.team_b_id === "B2") && semi.some((m) => m.team_a_id === "B1" && m.team_b_id === "A2"), "knockout: การไขว้กลุ่ม A1–B2 / B1–A2 ผิด");
  console.log("groups ✓");
}

if (failures) {
  console.log(`\n${failures} ข้อผิดพลาด`);
  process.exit(1);
}
console.log("\nทั้งหมดผ่าน");
