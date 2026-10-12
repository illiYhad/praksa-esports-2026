import type { Category, CategorySetting, Match, Team } from "@/lib/types";
import { computeMedals } from "@/lib/bracket/standings";

// สถิติในงานจากแมตช์ที่รับรองแล้ว

export type Record_ = { played: number; wins: number; losses: number; gamesWon: number; gamesLost: number };

export function teamRecord(teamId: string, matches: Match[]): Record_ {
  const r: Record_ = { played: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0 };
  for (const m of matches) {
    if (m.status !== "certified") continue;
    const isA = m.team_a_id === teamId;
    const isB = m.team_b_id === teamId;
    if (!isA && !isB) continue;
    r.played++;
    if (m.winner_id === teamId) r.wins++;
    else r.losses++;
    r.gamesWon += isA ? m.team_a_score : m.team_b_score;
    r.gamesLost += isA ? m.team_b_score : m.team_a_score;
  }
  return r;
}

export const sumRecords = (rs: Record_[]): Record_ =>
  rs.reduce((a, b) => ({ played: a.played + b.played, wins: a.wins + b.wins, losses: a.losses + b.losses, gamesWon: a.gamesWon + b.gamesWon, gamesLost: a.gamesLost + b.gamesLost }), {
    played: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0,
  });

export type HistoryRow = { match: Match; opponentId?: string; result: "win" | "loss" | "pending" | "live"; scoreFor: number; scoreAgainst: number };

export function teamHistory(teamId: string, matches: Match[]): HistoryRow[] {
  return matches
    .filter((m) => m.team_a_id === teamId || m.team_b_id === teamId)
    .sort((a, b) => (a.round_no ?? 0) - (b.round_no ?? 0) || (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""))
    .map((m) => {
      const isA = m.team_a_id === teamId;
      const result: HistoryRow["result"] =
        m.status === "ongoing" ? "live" : m.status === "certified" || m.status === "ended" ? (m.winner_id === teamId ? "win" : "loss") : "pending";
      return { match: m, opponentId: isA ? m.team_b_id : m.team_a_id, result, scoreFor: isA ? m.team_a_score : m.team_b_score, scoreAgainst: isA ? m.team_b_score : m.team_a_score };
    });
}

export type MedalRow = { category: Category; medal: "gold" | "silver" | "bronze" };

/** เหรียญของทีม (ทีมหนึ่งอยู่ประเภทเดียว) */
export function medalsForTeam(team: Team, categories: Category[], settings: CategorySetting[], matches: Match[], teams: Team[]): MedalRow[] {
  const category = categories.find((c) => c.id === team.category_id);
  const setting = settings.find((s) => s.category_id === team.category_id);
  if (!category || !setting) return [];
  const ids = teams.filter((t) => t.category_id === category.id).map((t) => t.id);
  const m = computeMedals(setting, matches.filter((x) => x.category_id === category.id), ids);
  if (!m.complete) return [];
  if (m.gold === team.id) return [{ category, medal: "gold" }];
  if (m.silver === team.id) return [{ category, medal: "silver" }];
  if (m.bronze.includes(team.id)) return [{ category, medal: "bronze" }];
  return [];
}

export const MEDAL_ICON = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;
export const MEDAL_LABEL = { gold: "เหรียญทอง", silver: "เหรียญเงิน", bronze: "เหรียญทองแดง" } as const;
