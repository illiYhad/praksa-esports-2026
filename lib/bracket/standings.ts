import type { CategorySetting, Match } from "@/lib/types";

// ตารางคะแนน (พบกันหมด/แบ่งกลุ่ม) + เหรียญ — คิดจากแมตช์ที่รับรองแล้วเท่านั้น

export type StandingRow = {
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  games_for: number;
  games_against: number;
  diff: number;
  rank: number;
};

const certified = (m: Match) => m.status === "certified";

export function computeStandings(teamIds: string[], matches: Match[], seedOrder: string[] = []): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  for (const t of teamIds) rows.set(t, { team_id: t, played: 0, wins: 0, losses: 0, games_for: 0, games_against: 0, diff: 0, rank: 0 });
  for (const m of matches.filter(certified)) {
    const a = m.team_a_id && rows.get(m.team_a_id);
    const b = m.team_b_id && rows.get(m.team_b_id);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.games_for += m.team_a_score;
    a.games_against += m.team_b_score;
    b.games_for += m.team_b_score;
    b.games_against += m.team_a_score;
    if (m.winner_id === a.team_id) {
      a.wins++;
      b.losses++;
    } else if (m.winner_id === b.team_id) {
      b.wins++;
      a.losses++;
    }
  }
  const list = [...rows.values()];
  for (const r of list) r.diff = r.games_for - r.games_against;

  // ชนะมากกว่า → ผลต่างเกม → เกมที่ชนะ → ผลเจอกันเอง (คู่ที่เสมอกัน 2 ทีม) → ลำดับ seed
  const headToHead = (x: string, y: string) => {
    const m = matches.find((mm) => certified(mm) && ((mm.team_a_id === x && mm.team_b_id === y) || (mm.team_a_id === y && mm.team_b_id === x)));
    if (!m?.winner_id) return 0;
    return m.winner_id === x ? -1 : 1;
  };
  list.sort(
    (x, y) =>
      y.wins - x.wins ||
      y.diff - x.diff ||
      y.games_for - x.games_for ||
      headToHead(x.team_id, y.team_id) ||
      seedOrder.indexOf(x.team_id) - seedOrder.indexOf(y.team_id),
  );
  list.forEach((r, i) => (r.rank = i + 1));
  return list;
}

export type Medals = { gold?: string; silver?: string; bronze: string[]; complete: boolean };

const loserOf = (m: Match) => (m.winner_id === m.team_a_id ? m.team_b_id : m.team_a_id);

export function computeMedals(setting: CategorySetting, matches: Match[], teamIds: string[]): Medals {
  const none: Medals = { bronze: [], complete: false };
  if (setting.single_entry === "walkover" && teamIds.length === 1) return { gold: teamIds[0], bronze: [], complete: true };

  if (setting.format === "round_robin") {
    const all = matches.filter((m) => m.stage === "group");
    if (!all.length || !all.every(certified)) return none;
    const s = computeStandings(teamIds, all, setting.seed_order);
    return { gold: s[0]?.team_id, silver: s[1]?.team_id, bronze: s[2] ? [s[2].team_id] : [], complete: true };
  }

  if (setting.format === "double") {
    const gf = matches.find((m) => m.stage === "final");
    if (!gf || !certified(gf)) return none;
    const lbFinal = matches.find((m) => m.stage === "losers" && m.round_name === "ชิงชนะเลิศสายล่าง");
    const bronze = lbFinal && certified(lbFinal) ? [loserOf(lbFinal)].filter((x): x is string => !!x) : [];
    return { gold: gf.winner_id, silver: loserOf(gf), bronze, complete: true };
  }

  // single · groups (รอบน็อกเอาต์)
  const final = matches.find((m) => m.stage === "winners" && m.round_name === "ชิงชนะเลิศ");
  if (!final || !certified(final)) return none;
  const third = matches.find((m) => m.stage === "third");
  let bronze: string[] = [];
  if (third) {
    if (!certified(third)) return none;
    bronze = third.winner_id ? [third.winner_id] : [];
  } else {
    bronze = matches
      .filter((m) => m.stage === "winners" && m.round_name === "รอบรองชนะเลิศ" && certified(m))
      .map(loserOf)
      .filter((x): x is string => !!x);
  }
  return { gold: final.winner_id, silver: loserOf(final), bronze, complete: true };
}
