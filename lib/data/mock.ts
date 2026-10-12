import type { DataSource } from "./source";
import { subscribeDataChanges } from "./live";
import { checkFinished, checkProgress, seriesFromGames, usesGoalsDirect } from "@/lib/match-logic";
import type { GameScore, Match } from "@/lib/types";
import { db } from "./store";

const NOW = () => new Date().toISOString();
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
