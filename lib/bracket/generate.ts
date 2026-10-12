import type { CategorySetting, Match, MatchStage } from "@/lib/types";

// ตัวสร้างสายแบบ pure (ไม่แตะ store) — ใช้ร่วมกันทั้ง mock และ Supabase
// แนวคิด: สร้าง "ร่างแมตช์" ที่แต่ละฝั่งเป็น slot (ทีม / ผู้ชนะ-ผู้แพ้ของร่างก่อนหน้า / bye)
// แล้วค่อย "ยุบ" แมตช์ที่มี bye ออก → ทีมอีกฝั่งเลื่อนไปรอบถัดไปเอง → ผูก next_match_id/slot

type Src = { match: number; kind: "w" | "l" };
type Slot = { team?: string; from?: Src; bye?: true };
type Draft = {
  round_name: string;
  round_no: number;
  stage: MatchStage;
  group_name?: string;
  a: Slot;
  b: Slot;
};

export type MatchDraft = Omit<Match, "id" | "category_id" | "updated_at" | "next_match_id" | "loser_next_match_id"> & {
  /** index ภายในผลลัพธ์ (ใช้ผูก id ตอนบันทึก) */
  idx: number;
  next_idx?: number;
  loser_next_idx?: number;
};

export const DEFAULT_SETTING = (categoryId: string): CategorySetting => ({
  category_id: categoryId,
  format: "single",
  third_place: false,
  group_count: 2,
  advance_per_group: 2,
  best_of_by_round: {},
  seeding: "random",
  seed_order: [],
  single_entry: "pending",
  updated_at: "",
});

/** BO ของรอบ: ตั้งค่าไว้ → ใช้ค่านั้น · ไม่ตั้ง → รองชนะเลิศ/ชิง = 3 · อื่น = 1 */
export function bestOfFor(roundName: string, stage: MatchStage | undefined, setting: CategorySetting): number {
  const key = stage === "group" ? "group" : roundName;
  const set = setting.best_of_by_round[key];
  if (set && set > 0) return set;
  if (stage === "group") return 1;
  if (roundName.includes("รองชนะเลิศ") || roundName.includes("ชิง")) return 3;
  return 1;
}

const nextPow2 = (n: number) => (n <= 1 ? 1 : 2 ** Math.ceil(Math.log2(n)));

/** ตำแหน่งในสายแบบมาตรฐาน (seed 1 เจอ seed สุดท้าย · seed 2 อยู่อีกครึ่ง) — คืน array ของเลข seed (เริ่ม 1) ตามตำแหน่ง */
export function seedPositions(size: number): number[] {
  let pos = [1];
  while (pos.length < size) {
    const m = pos.length * 2;
    const next: number[] = [];
    for (const s of pos) next.push(s, m + 1 - s);
    pos = next;
  }
  return pos;
}

function koRoundName(matchesInRound: number, prefix = ""): string {
  if (matchesInRound === 1) return `${prefix}ชิงชนะเลิศ`;
  if (matchesInRound === 2) return `${prefix}รอบรองชนะเลิศ`;
  return `${prefix}รอบ ${matchesInRound * 2} ทีม`;
}

/** สร้างร่างสายแพ้คัดออก (สายบน) — คืน drafts + index ของแมตช์แต่ละรอบ */
function buildWinners(teams: string[], drafts: Draft[], prefix = ""): number[][] {
  const size = nextPow2(teams.length);
  const pos = seedPositions(size);
  const rounds: number[][] = [];
  const slotOf = (seed: number): Slot => (seed <= teams.length ? { team: teams[seed - 1] } : { bye: true });

  // รอบแรก
  const r1: number[] = [];
  for (let i = 0; i < size / 2; i++) {
    drafts.push({
      round_name: koRoundName(size / 2, prefix),
      round_no: 1,
      stage: "winners",
      a: slotOf(pos[2 * i]),
      b: slotOf(pos[2 * i + 1]),
    });
    r1.push(drafts.length - 1);
  }
  rounds.push(r1);

  // รอบถัด ๆ ไป
  let prev = r1;
  let roundNo = 2;
  while (prev.length > 1) {
    const cur: number[] = [];
    for (let i = 0; i < prev.length / 2; i++) {
      drafts.push({
        round_name: koRoundName(prev.length / 2, prefix),
        round_no: roundNo,
        stage: "winners",
        a: { from: { match: prev[2 * i], kind: "w" } },
        b: { from: { match: prev[2 * i + 1], kind: "w" } },
      });
      cur.push(drafts.length - 1);
    }
    rounds.push(cur);
    prev = cur;
    roundNo++;
  }
  return rounds;
}

function buildSingle(teams: string[], thirdPlace: boolean): Draft[] {
  const drafts: Draft[] = [];
  const rounds = buildWinners(teams, drafts);
  if (thirdPlace && rounds.length >= 2) {
    const semis = rounds[rounds.length - 2];
    drafts.push({
      round_name: "ชิงอันดับ 3",
      round_no: rounds.length,
      stage: "third",
      a: { from: { match: semis[0], kind: "l" } },
      b: { from: { match: semis[1], kind: "l" } },
    });
  }
  return drafts;
}

/** แพ้สองครั้งคัดออก: สายบน + สายล่าง (สลับรอบ "จับคู่ผู้ชนะสายล่าง" กับ "เจอผู้แพ้สายบน") + Grand Final 1 แมตช์ (ไม่มี bracket reset) */
function buildDouble(teams: string[]): Draft[] {
  const drafts: Draft[] = [];
  const wb = buildWinners(teams, drafts, "สายบน · ");
  const R = wb.length;
  const wbFinal = wb[R - 1][0];

  let lbPrev: number[] = [];
  let lbRound = 0;
  if (R >= 2) {
    // LB1: ผู้แพ้รอบแรกสายบนจับคู่กัน
    lbRound = 1;
    const r1 = wb[0];
    const lb1: number[] = [];
    for (let i = 0; i < r1.length / 2; i++) {
      drafts.push({
        round_name: `สายล่าง · รอบ ${lbRound}`,
        round_no: lbRound,
        stage: "losers",
        a: { from: { match: r1[2 * i], kind: "l" } },
        b: { from: { match: r1[2 * i + 1], kind: "l" } },
      });
      lb1.push(drafts.length - 1);
    }
    lbPrev = lb1;

    for (let wr = 1; wr < R; wr++) {
      // major: ผู้ชนะสายล่าง vs ผู้แพ้สายบนรอบ wr+1 (กลับลำดับสลับรอบ ลดโอกาสเจอคู่เดิม)
      lbRound++;
      const losers = wb[wr];
      const ordered = wr % 2 === 1 ? [...losers].reverse() : losers;
      const major: number[] = [];
      const isLbFinal = lbPrev.length === 1 && wr === R - 1;
      for (let i = 0; i < lbPrev.length; i++) {
        drafts.push({
          round_name: isLbFinal ? "ชิงชนะเลิศสายล่าง" : `สายล่าง · รอบ ${lbRound}`,
          round_no: lbRound,
          stage: "losers",
          a: { from: { match: lbPrev[i], kind: "w" } },
          b: { from: { match: ordered[i], kind: "l" } },
        });
        major.push(drafts.length - 1);
      }
      lbPrev = major;
      if (lbPrev.length === 1) break;
      // minor: ผู้ชนะสายล่างจับคู่กัน
      lbRound++;
      const minor: number[] = [];
      for (let i = 0; i < lbPrev.length / 2; i++) {
        drafts.push({
          round_name: `สายล่าง · รอบ ${lbRound}`,
          round_no: lbRound,
          stage: "losers",
          a: { from: { match: lbPrev[2 * i], kind: "w" } },
          b: { from: { match: lbPrev[2 * i + 1], kind: "w" } },
        });
        minor.push(drafts.length - 1);
      }
      lbPrev = minor;
    }
  }

  drafts.push({
    round_name: "ชิงชนะเลิศ (Grand Final)",
    round_no: 99,
    stage: "final",
    a: { from: { match: wbFinal, kind: "w" } },
    b: lbPrev.length === 1 ? { from: { match: lbPrev[0], kind: "w" } } : { from: { match: wbFinal, kind: "l" } },
  });
  return drafts;
}

/** พบกันหมด (circle method) — ทุกนัดแต่ละทีมลงแข่งไม่เกิน 1 ครั้ง */
function buildRoundRobin(teams: string[], groupName?: string): Draft[] {
  const drafts: Draft[] = [];
  const list: (string | null)[] = [...teams];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i];
      const b = list[n - 1 - i];
      if (a && b) {
        drafts.push({
          round_name: groupName ? `${groupName} · นัดที่ ${r + 1}` : `นัดที่ ${r + 1}`,
          round_no: r + 1,
          stage: "group",
          group_name: groupName,
          a: { team: a },
          b: { team: b },
        });
      }
    }
    list.splice(1, 0, list.pop() as string | null);
  }
  return drafts;
}

export const GROUP_NAMES = ["กลุ่ม A", "กลุ่ม B", "กลุ่ม C", "กลุ่ม D", "กลุ่ม E", "กลุ่ม F", "กลุ่ม G", "กลุ่ม H"];

/** แบ่งกลุ่มแบบงู (1→A,2→B,3→B,4→A …) ตามลำดับ seed */
export function splitGroups(teams: string[], groupCount: number): string[][] {
  const g = Math.max(1, Math.min(groupCount, GROUP_NAMES.length, teams.length));
  const groups: string[][] = Array.from({ length: g }, () => []);
  teams.forEach((t, i) => {
    const cycle = i % (2 * g);
    const gi = cycle < g ? cycle : 2 * g - 1 - cycle;
    groups[gi].push(t);
  });
  return groups;
}

function buildGroups(teams: string[], groupCount: number): Draft[] {
  return splitGroups(teams, groupCount).flatMap((members, gi) => buildRoundRobin(members, GROUP_NAMES[gi]));
}

/** ยุบแมตช์ที่มี bye + ผูกลิงก์ next/loser_next → แมตช์จริง */
function resolve(drafts: Draft[], setting: CategorySetting): MatchDraft[] {
  const collapsed = new Map<number, Slot>();
  const realIndex = new Map<number, number>();
  const real: { d: Draft; a: Slot; b: Slot }[] = [];

  const res = (s: Slot): Slot => {
    if (!s.from) return s;
    const c = collapsed.get(s.from.match);
    if (c === undefined) return s;
    return s.from.kind === "w" ? c : { bye: true };
  };

  drafts.forEach((d, i) => {
    const a = res(d.a);
    const b = res(d.b);
    if (a.bye && b.bye) collapsed.set(i, { bye: true });
    else if (a.bye) collapsed.set(i, b);
    else if (b.bye) collapsed.set(i, a);
    else {
      realIndex.set(i, real.length);
      real.push({ d, a, b });
    }
  });

  const out: MatchDraft[] = real.map(({ d, a, b }, idx) => ({
    idx,
    round_name: d.round_name,
    round_no: d.round_no,
    stage: d.stage,
    group_name: d.group_name,
    sort_order: idx,
    best_of: bestOfFor(d.round_name, d.stage, setting),
    status: "scheduled",
    team_a_id: a.team,
    team_b_id: b.team,
    team_a_score: 0,
    team_b_score: 0,
    game_scores: [],
  }));

  // ผูกลิงก์: แมตช์ปลายทางที่มี slot อ้างถึงแมตช์ต้นทาง
  real.forEach(({ a, b }, toIdx) => {
    for (const [slot, s] of [["a", a], ["b", b]] as const) {
      if (!s.from) continue;
      const fromIdx = realIndex.get(s.from.match);
      if (fromIdx === undefined) continue;
      if (s.from.kind === "w") {
        out[fromIdx].next_idx = toIdx;
        out[fromIdx].next_match_slot = slot;
      } else {
        out[fromIdx].loser_next_idx = toIdx;
        out[fromIdx].loser_next_match_slot = slot;
      }
    }
  });
  return out;
}

/** สร้างร่างแมตช์ทั้งประเภทจาก setting + ลำดับทีม (seed_order) */
export function generateBracket(setting: CategorySetting, teams: string[]): MatchDraft[] {
  if (teams.length < 2) return [];
  let drafts: Draft[];
  switch (setting.format) {
    case "single":
      drafts = buildSingle(teams, setting.third_place);
      break;
    case "double":
      drafts = buildDouble(teams);
      break;
    case "round_robin":
      drafts = buildRoundRobin(teams);
      break;
    case "groups":
      drafts = buildGroups(teams, setting.group_count);
      break;
  }
  return resolve(drafts, setting);
}

/** รอบน็อกเอาต์หลังแบ่งกลุ่ม — qualifiers เรียงตาม seed แล้ว (อันดับ 1 ทุกกลุ่มก่อน แล้วอันดับ 2 …) */
export function generateKnockout(setting: CategorySetting, qualifiers: string[]): MatchDraft[] {
  if (qualifiers.length < 2) return [];
  return resolve(buildSingle(qualifiers, setting.third_place), setting);
}

/** ชื่อรอบทั้งหมดที่จะเกิดขึ้น (ไว้ให้แอดมินตั้ง BO ล่วงหน้า) */
export function previewRoundNames(setting: CategorySetting, teamCount: number): { key: string; label: string; stage: MatchStage }[] {
  const fake = Array.from({ length: teamCount }, (_, i) => `t${i + 1}`);
  const seen = new Map<string, { key: string; label: string; stage: MatchStage }>();
  const add = (d: MatchDraft) => {
    const key = d.stage === "group" ? "group" : d.round_name;
    if (!seen.has(key)) seen.set(key, { key, label: d.stage === "group" ? "รอบแบ่งกลุ่ม / พบกันหมด" : d.round_name, stage: d.stage ?? "winners" });
  };
  generateBracket(setting, fake).forEach(add);
  if (setting.format === "groups") {
    const q = Math.min(teamCount, Math.max(2, setting.group_count * setting.advance_per_group));
    generateKnockout(setting, fake.slice(0, q)).forEach(add);
  }
  return [...seen.values()];
}

/** สุ่มลำดับ (Fisher–Yates) */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
