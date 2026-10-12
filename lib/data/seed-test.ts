import type { Match, Sponsor } from "@/lib/types";
import { emptyStore, type Store } from "./defaults";
import { STATION_COUNT } from "@/lib/event";

// seed ทดสอบ (ทีมทดสอบ A… · ผู้เล่นทดสอบ 01…) — ใช้เมื่อ PRAKSA_SEED=test หรือไม่มีไฟล์รายชื่อจริง
const NOW = () => new Date().toISOString();

export function buildTestStore(): Store {
  const s: Store = emptyStore();
  s.games.push(
    { id: "g-rov", code: "rov", name: "ROV", format: "team", team_size: 5 },
    { id: "g-sf6", code: "sf6", name: "Street Fighter 6", format: "solo", team_size: 1 },
    { id: "g-efootball", code: "efootball", name: "eFootball", format: "solo", team_size: 1 },
  );

  for (const g of s.games) {
    const cat = `${g.code}-c1`;
    s.categories.push({ id: cat, code: cat, game_id: g.id, name: "ทั่วไป" });

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
    const base = new Date("2026-10-19T10:00:00+07:00").getTime();
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
    sp("a", "สปอนเซอร์ทดสอบ A", "main", "bottom_ticker", 1),
    sp("a", "สปอนเซอร์ทดสอบ A", "main", "corner"),
    sp("a", "สปอนเซอร์ทดสอบ A", "main", "stinger"),
    sp("a", "สปอนเซอร์ทดสอบ A", "main", "full_screen", 1),
    sp("b", "สปอนเซอร์ทดสอบ B", "co", "bottom_ticker", 2),
    sp("b", "สปอนเซอร์ทดสอบ B", "co", "full_screen", 2),
  );
  return s;
}
