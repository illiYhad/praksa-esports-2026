import type { DataSource } from "./source";
import type { Game, Match, Participant, Sponsor, Station } from "@/lib/types";

const games: Game[] = [
  { id: "g-rov", code: "rov", name: "ROV", format: "team", team_size: 5 },
  { id: "g-sf6", code: "sf6", name: "Street Fighter 6", format: "solo", team_size: 1 },
  { id: "g-efootball", code: "efootball", name: "eFootball", format: "solo", team_size: 1 },
];

const STATION_COUNT: Record<string, number> = { rov: 8, sf6: 1, efootball: 4 };

const participants: Participant[] = [];
const stations: Station[] = [];
const matches: Match[] = [];

for (const g of games) {
  for (let i = 1; i <= 8; i++) {
    const n = String(i).padStart(2, "0");
    const letter = String.fromCharCode(64 + i);
    const team = g.format === "team";
    participants.push({
      id: `${g.code}-p${i}`,
      game_id: g.id,
      name: team ? `ทีมทดสอบ ${letter}` : `ผู้เล่นทดสอบ ${n}`,
      short_name: team ? `ท${letter}` : undefined,
      members: team
        ? Array.from({ length: g.team_size }, (_, k) => `สมาชิกทดสอบ ${letter}${k + 1}`)
        : undefined,
      checked_in: i % 3 !== 0,
    });
  }
  for (let s = 1; s <= STATION_COUNT[g.code]; s++) {
    stations.push({ id: `${g.code}-s${s}`, game_id: g.id, label: `สถานี ${s}` });
  }

  // สายแพ้คัดออก 8 คน/ทีม: รอบ 8 (4 คู่) + รองชนะเลิศ (2) + ชิง (1)
  const m = (n: number) => `${g.code}-m${n}`;
  const mk = (n: number, round: string, bo: number, extra: Partial<Match>): Match => ({
    id: m(n),
    game_id: g.id,
    round_label: round,
    best_of: bo,
    status: "scheduled",
    a_series: 0,
    b_series: 0,
    games: [],
    ...extra,
  });
  const stationFor = (i: number) => `${g.code}-s${(i % STATION_COUNT[g.code]) + 1}`;
  const base = new Date("2026-10-24T10:00:00+07:00").getTime();
  const at = (k: number) => new Date(base + k * 45 * 60_000).toISOString();
  const p = (i: number) => `${g.code}-p${i}`;

  matches.push(
    mk(1, "รอบ 8 ทีม", 3, {
      a_id: p(1), b_id: p(2), station_id: stationFor(0), scheduled_at: at(0),
      next_match_id: m(5), next_slot: "a",
      status: "finished", a_series: 2, b_series: 0, games: [{ a: 1, b: 0 }, { a: 1, b: 0 }],
    }),
    mk(2, "รอบ 8 ทีม", 3, {
      a_id: p(3), b_id: p(4), station_id: stationFor(1), scheduled_at: at(0),
      next_match_id: m(5), next_slot: "b",
      status: "live", a_series: 1, b_series: 0, games: [{ a: 1, b: 0 }],
    }),
    mk(3, "รอบ 8 ทีม", 3, {
      a_id: p(5), b_id: p(6), station_id: stationFor(2), scheduled_at: at(0),
      next_match_id: m(6), next_slot: "a",
    }),
    mk(4, "รอบ 8 ทีม", 3, {
      a_id: p(7), b_id: p(8), station_id: stationFor(3), scheduled_at: at(0),
      next_match_id: m(6), next_slot: "b",
    }),
    mk(5, "รอบรองชนะเลิศ", 3, {
      a_id: p(1), station_id: stationFor(0), scheduled_at: at(1),
      next_match_id: m(7), next_slot: "a",
    }),
    mk(6, "รอบรองชนะเลิศ", 3, {
      station_id: stationFor(1), scheduled_at: at(1),
      next_match_id: m(7), next_slot: "b",
    }),
    mk(7, "ชิงชนะเลิศ", 5, { station_id: stationFor(0), scheduled_at: at(2) }),
  );
}

const sponsors: Sponsor[] = [
  { id: "sp-main", name: "สปอนเซอร์ทดสอบ หลัก", logo_url: "", tier: "main", slots: ["bar", "corner", "stinger", "fullscreen"] },
  { id: "sp-co", name: "สปอนเซอร์ทดสอบ ร่วม", logo_url: "", tier: "co", slots: ["bar", "fullscreen"] },
  { id: "sp-support", name: "สปอนเซอร์ทดสอบ สนับสนุน", logo_url: "", tier: "support", slots: ["bar"] },
];

const byGame = <T extends { game_id: string }>(rows: T[], gameId?: string) =>
  gameId ? rows.filter((r) => r.game_id === gameId) : rows;

function must<T>(row: T | undefined, what: string): T {
  if (!row) throw new Error(`ไม่พบ ${what}`);
  return row;
}

export const mockSource: DataSource = {
  async getGames() { return games; },
  async getParticipants(gameId) { return byGame(participants, gameId); },
  async getStations(gameId) { return byGame(stations, gameId); },
  async getMatches(gameId) { return byGame(matches, gameId); },
  async getSponsors() { return sponsors; },

  async updateMatchScore(matchId, patch) {
    const row = must(matches.find((x) => x.id === matchId), `แมตช์ ${matchId}`);
    Object.assign(row, patch);
    return row;
  },
  async confirmMatch(matchId) {
    const row = must(matches.find((x) => x.id === matchId), `แมตช์ ${matchId}`);
    row.status = "confirmed";
    const winner = row.a_series > row.b_series ? row.a_id : row.b_series > row.a_series ? row.b_id : undefined;
    const next = matches.find((x) => x.id === row.next_match_id);
    if (next && winner && row.next_slot) next[row.next_slot === "a" ? "a_id" : "b_id"] = winner;
    return row;
  },
  async setCheckIn(participantId, checkedIn) {
    const row = must(participants.find((x) => x.id === participantId), `ผู้เข้าแข่ง ${participantId}`);
    row.checked_in = checkedIn;
    return row;
  },
};
