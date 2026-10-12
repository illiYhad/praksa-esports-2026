import type { DataSource } from "./source";
import { subscribeDataChanges } from "./live";
import { checkFinished, checkProgress, seriesFromGames, usesGoalsDirect } from "@/lib/match-logic";
import type { Category, Game, GameScore, Match, MatchAuditLog, Player, Sponsor, Station, Team } from "@/lib/types";

type Store = {
  games: Game[];
  categories: Category[];
  teams: Team[];
  players: Player[];
  stations: Station[];
  matches: Match[];
  sponsors: Sponsor[];
  audit: MatchAuditLog[];
};

const STATION_COUNT: Record<string, number> = { rov: 8, sf6: 1, efootball: 4 };
const NOW = () => new Date().toISOString();

function build(): Store {
  const s: Store = { games: [], categories: [], teams: [], players: [], stations: [], matches: [], sponsors: [], audit: [] };
  s.games.push(
    { id: "g-rov", code: "rov", name: "ROV", format: "team", team_size: 5 },
    { id: "g-sf6", code: "sf6", name: "Street Fighter 6", format: "solo", team_size: 1 },
    { id: "g-efootball", code: "efootball", name: "eFootball", format: "solo", team_size: 1 },
  );

  for (const g of s.games) {
    const cat = `${g.code}-c1`;
    s.categories.push({ id: cat, game_id: g.id, name: "ทั่วไป" });

    for (let i = 1; i <= 8; i++) {
      const letter = String.fromCharCode(64 + i);
      const n = String(i).padStart(2, "0");
      const team = g.format === "team";
      const tid = `${g.code}-t${i}`;
      s.teams.push({
        id: tid,
        category_id: cat,
        name: team ? `ทีมทดสอบ ${letter}` : `ผู้เล่นทดสอบ ${n}`,
        short_name: team ? `ท${letter}` : undefined,
        is_checked_in: i % 3 !== 0,
      });
      for (let k = 1; k <= g.team_size; k++) {
        s.players.push({
          id: `${tid}-p${k}`,
          team_id: tid,
          in_game_name: team ? `สมาชิกทดสอบ ${letter}${k}` : `ผู้เล่นทดสอบ ${n}`,
          is_captain: k === 1,
        });
      }
    }
    for (let k = 1; k <= STATION_COUNT[g.code]; k++) {
      s.stations.push({ id: `${g.code}-s${k}`, game_id: g.id, name: `สถานี ${k}` });
    }

    // สายแพ้คัดออก 8 ทีม: รอบ 8 (4 คู่) → รองชนะเลิศ (2) → ชิง (1)
    const id = (n: number) => `${g.code}-m${n}`;
    const t = (i: number) => `${g.code}-t${i}`;
    const stationFor = (i: number) => `${g.code}-s${(i % STATION_COUNT[g.code]) + 1}`;
    const base = new Date("2026-10-18T10:00:00+07:00").getTime();
    const at = (k: number) => new Date(base + k * 45 * 60_000).toISOString();
    const mk = (n: number, round: string, bo: number, extra: Partial<Match>): Match => ({
      id: id(n),
      category_id: cat,
      round_name: round,
      best_of: bo,
      status: "scheduled",
      team_a_score: 0,
      team_b_score: 0,
      game_scores: [],
      updated_at: NOW(),
      ...extra,
    });
    s.matches.push(
      mk(1, "รอบ 8 ทีม", 3, {
        team_a_id: t(1), team_b_id: t(2), station_id: stationFor(0), scheduled_time: at(0),
        next_match_id: id(5), next_match_slot: "a",
        status: "certified", team_a_score: 2, team_b_score: 0, winner_id: t(1), game_scores: [{ a: 1, b: 0 }, { a: 1, b: 0 }],
      }),
      mk(2, "รอบ 8 ทีม", 3, {
        team_a_id: t(3), team_b_id: t(4), station_id: stationFor(1), scheduled_time: at(0),
        next_match_id: id(5), next_match_slot: "b",
        status: "ongoing", team_a_score: 1, game_scores: [{ a: 1, b: 0 }],
      }),
      mk(3, "รอบ 8 ทีม", 3, {
        team_a_id: t(5), team_b_id: t(6), station_id: stationFor(2), scheduled_time: at(0),
        next_match_id: id(6), next_match_slot: "a",
      }),
      mk(4, "รอบ 8 ทีม", 3, {
        team_a_id: t(7), team_b_id: t(8), station_id: stationFor(3), scheduled_time: at(0),
        next_match_id: id(6), next_match_slot: "b",
      }),
      mk(5, "รอบรองชนะเลิศ", 3, {
        team_a_id: t(1), station_id: stationFor(0), scheduled_time: at(1),
        next_match_id: id(7), next_match_slot: "a",
      }),
      mk(6, "รอบรองชนะเลิศ", 3, {
        station_id: stationFor(1), scheduled_time: at(1),
        next_match_id: id(7), next_match_slot: "b",
      }),
      mk(7, "ชิงชนะเลิศ", 5, { station_id: stationFor(0), scheduled_time: at(2) }),
    );
  }

  const sp = (key: string, name: string, level: Sponsor["level"], position: Sponsor["position"], sequence = 0): Sponsor => ({
    id: `sp-${key}-${position}`, name, level, position, sequence, logo_url: "", is_active: true,
  });
  s.sponsors.push(
    sp("main", "สปอนเซอร์ทดสอบ หลัก", "main", "bottom_ticker", 1),
    sp("main", "สปอนเซอร์ทดสอบ หลัก", "main", "corner"),
    sp("main", "สปอนเซอร์ทดสอบ หลัก", "main", "stinger"),
    sp("main", "สปอนเซอร์ทดสอบ หลัก", "main", "full_screen", 1),
    sp("co", "สปอนเซอร์ทดสอบ ร่วม", "co", "bottom_ticker", 2),
    sp("co", "สปอนเซอร์ทดสอบ ร่วม", "co", "full_screen", 2),
    sp("support", "สปอนเซอร์ทดสอบ สนับสนุน", "support", "bottom_ticker", 3),
  );
  return s;
}

// เก็บไว้ที่ globalThis กันโมดูลถูกโหลดซ้ำแยกกันระหว่างหน้า/server action ตอน dev
const g = globalThis as unknown as { __praksaMock?: Store };
const db = (g.__praksaMock ??= build());

const must = <T,>(row: T | undefined, what: string): T => {
  if (!row) throw new Error(`ไม่พบ${what}`);
  return row;
};

const matchOf = (id: string) => must(db.matches.find((m) => m.id === id), "แมตช์");
const gameOfMatch = (m: Match) => {
  const cat = must(db.categories.find((c) => c.id === m.category_id), "ประเภท");
  return must(db.games.find((x) => x.id === cat.game_id), "เกม");
};
const teamName = (id?: string) => db.teams.find((t) => t.id === id)?.name ?? "-";

const log = (m: Match, text: string) =>
  db.audit.push({ id: `audit-${db.audit.length + 1}`, match_id: m.id, action_details: text, created_at: NOW() });

const touch = (m: Match) => {
  m.updated_at = NOW();
  return m;
};

function applyScores(m: Match, scores: GameScore[]) {
  const game = gameOfMatch(m);
  const direct = usesGoalsDirect(game.code, m.best_of);
  const s = seriesFromGames(scores, direct);
  m.game_scores = scores.map((x) => ({ a: x.a, b: x.b }));
  m.team_a_score = s.a;
  m.team_b_score = s.b;
  return { game, direct, s };
}

function guardEditable(m: Match) {
  if (m.status === "certified") throw new Error("แมตช์นี้รับรองผลแล้ว — ต้องกด “ยกเลิกการรับรอง” ก่อนจึงจะแก้ได้");
  if (!m.team_a_id || !m.team_b_id) throw new Error("ยังไม่มีผู้เข้าแข่งครบทั้งสองฝั่ง (รอผลแมตช์ก่อนหน้า)");
}

const slotKey = (slot?: "a" | "b") => (slot === "b" ? "team_b_id" : "team_a_id");

function placeInto(nextId: string | undefined, slot: "a" | "b" | undefined, teamId: string | undefined) {
  if (!nextId || !slot) return;
  const next = matchOf(nextId);
  next[slotKey(slot)] = teamId;
  touch(next);
}

function blockedByNext(nextId: string | undefined): boolean {
  return !!nextId && matchOf(nextId).status !== "scheduled";
}

const inGame = <T extends { category_id: string }>(rows: T[], gameId?: string) =>
  gameId ? rows.filter((r) => db.categories.find((c) => c.id === r.category_id)?.game_id === gameId) : rows;

export const mockSource: DataSource = {
  async getGames() { return db.games; },
  async getCategories(gameId) { return gameId ? db.categories.filter((c) => c.game_id === gameId) : db.categories; },
  async getTeams(gameId) { return inGame(db.teams, gameId); },
  async getPlayers(gameId) {
    if (!gameId) return db.players;
    const ids = new Set(inGame(db.teams, gameId).map((t) => t.id));
    return db.players.filter((p) => ids.has(p.team_id));
  },
  async getStations(gameId) { return gameId ? db.stations.filter((x) => x.game_id === gameId) : db.stations; },
  async getMatches(gameId) { return inGame(db.matches, gameId); },
  async getSponsors() { return db.sponsors; },
  async getAuditLogs(matchId) { return db.audit.filter((a) => a.match_id === matchId); },

  async saveProgress(matchId, scores) {
    const m = matchOf(matchId);
    guardEditable(m);
    const game = gameOfMatch(m);
    const bad = checkProgress(scores, m.best_of, usesGoalsDirect(game.code, m.best_of));
    if (bad) throw new Error(bad);
    applyScores(m, scores);
    m.status = "ongoing";
    m.winner_id = undefined;
    log(m, `บันทึกสกอร์ระหว่างแข่ง ${teamName(m.team_a_id)} ${m.team_a_score}-${m.team_b_score} ${teamName(m.team_b_id)}`);
    return touch(m);
  },

  async saveResult(matchId, scores) {
    const m = matchOf(matchId);
    guardEditable(m);
    const game = gameOfMatch(m);
    const bad = checkFinished(scores, m.best_of, usesGoalsDirect(game.code, m.best_of));
    if (bad) throw new Error(bad);
    applyScores(m, scores);
    m.status = "ended";
    m.winner_id = m.team_a_score > m.team_b_score ? m.team_a_id : m.team_b_id;
    log(m, `บันทึกผลจบแมตช์ ${teamName(m.team_a_id)} ${m.team_a_score}-${m.team_b_score} ${teamName(m.team_b_id)} · ผู้ชนะ ${teamName(m.winner_id)}`);
    return touch(m);
  },

  async certifyMatch(matchId) {
    const m = matchOf(matchId);
    if (m.status !== "ended") throw new Error("รับรองได้เฉพาะแมตช์ที่บันทึกผลจบแล้ว");
    const loser = m.winner_id === m.team_a_id ? m.team_b_id : m.team_a_id;
    m.status = "certified";
    placeInto(m.next_match_id, m.next_match_slot, m.winner_id);
    placeInto(m.loser_next_match_id, m.loser_next_match_slot, loser);
    log(m, `รับรองผล · ผู้ชนะ ${teamName(m.winner_id)} เลื่อนไปแมตช์ถัดไป`);
    return touch(m);
  },

  async uncertifyMatch(matchId) {
    const m = matchOf(matchId);
    if (m.status !== "certified") throw new Error("แมตช์นี้ยังไม่ได้รับรอง");
    if (blockedByNext(m.next_match_id) || blockedByNext(m.loser_next_match_id)) {
      throw new Error("ยกเลิกไม่ได้: แมตช์ถัดไปเริ่มแข่งหรือจบแล้ว ต้องให้แอดมินจัดการ");
    }
    placeInto(m.next_match_id, m.next_match_slot, undefined);
    placeInto(m.loser_next_match_id, m.loser_next_match_slot, undefined);
    m.status = "ended";
    log(m, "ยกเลิกการรับรองผล · ถอยผู้เล่นออกจากแมตช์ถัดไป");
    return touch(m);
  },

  async setCheckIn(teamId, checkedIn) {
    const t = must(db.teams.find((x) => x.id === teamId), "ทีม/ผู้เล่น");
    t.is_checked_in = checkedIn;
    return t;
  },

  subscribe: subscribeDataChanges,
};
