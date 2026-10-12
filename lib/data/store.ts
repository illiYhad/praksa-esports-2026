import fs from "node:fs";
import path from "node:path";
import type { Category, CategorySetting, Game, Match, MatchAuditLog, Player, Sponsor, Station, Team } from "@/lib/types";
import { EVENT, STATION_COUNT } from "@/lib/event";
import { abbreviateOrg, parseRoster, personKey, type Roster } from "./roster-parse";
import { buildTestStore } from "./seed-test";

export type Store = {
  games: Game[];
  categories: Category[];
  teams: Team[];
  players: Player[];
  stations: Station[];
  matches: Match[];
  sponsors: Sponsor[];
  audit: MatchAuditLog[];
  settings: CategorySetting[];
};

const GAME_META: Record<string, { name: string; format: Game["format"]; team_size: number }> = {
  rov: { name: "ROV", format: "team", team_size: 5 },
  sf6: { name: "Street Fighter 6", format: "solo", team_size: 1 },
  efootball: { name: "eFootball Mobile", format: "solo", team_size: 1 },
};

// ไฟล์รายชื่อจริง (ผู้เยาว์) อยู่นอก git — ไม่มีไฟล์ → ใช้ seed ทดสอบ
const ROSTER_FILE = path.join(process.cwd(), "data", "roster.seed.txt");

export const emptyStore = (): Store => ({
  games: [], categories: [], teams: [], players: [], stations: [], matches: [], sponsors: [], audit: [], settings: [],
});

/** สร้างข้อมูลหลักจาก ROSTER — ไม่มีแมตช์ (จัดสายในแอดมิน เฟส B) */
export function buildFromRoster(roster: Roster): Store {
  const s = emptyStore();
  const gameCodes = [...new Set(roster.categories.map((c) => c.game))];
  for (const code of gameCodes) {
    const meta = GAME_META[code] ?? { name: code, format: "solo" as const, team_size: 1 };
    s.games.push({ id: `g-${code}`, code, ...meta });
    for (let k = 1; k <= (STATION_COUNT[code] ?? 1); k++) {
      s.stations.push({ id: `${code}-s${k}`, game_id: `g-${code}`, name: `สถานี ${k}` });
    }
  }
  for (const c of roster.categories) s.categories.push({ id: c.code, code: c.code, game_id: `g-${c.game}`, name: c.name });

  const orgName = new Map(roster.teams.map((t) => [t.team_code, t.name]));
  const teamId = (teamCode: string, categoryCode: string) => `${teamCode}-${categoryCode}`;
  for (const p of roster.players) {
    const tid = teamId(p.team_code, p.category_code);
    if (!s.teams.some((t) => t.id === tid)) {
      const name = orgName.get(p.team_code) ?? p.team_code;
      s.teams.push({
        id: tid,
        category_id: p.category_code,
        team_code: p.team_code,
        name,
        short_name: abbreviateOrg(name),
        is_checked_in: false,
      });
    }
    s.players.push({
      id: `${tid}-p${p.order_in_team}`,
      team_id: tid,
      real_name: p.real_name,
      in_game_name: "",
      is_captain: p.order_in_team === 1,
      order_in_team: p.order_in_team,
      person_key: personKey(p.real_name, p.team_code),
    });
  }

  s.sponsors.push(
    { id: "sp-main-bottom_ticker", name: EVENT.organizer, level: "main", position: "bottom_ticker", sequence: 1, logo_url: "", is_active: true },
    { id: "sp-main-full_screen", name: EVENT.organizer, level: "main", position: "full_screen", sequence: 1, logo_url: "", is_active: true },
    { id: "sp-main-stinger", name: EVENT.organizer, level: "main", position: "stinger", sequence: 1, logo_url: "", is_active: true },
    { id: "sp-provider-bottom_ticker", name: EVENT.provider, level: "support", position: "bottom_ticker", sequence: 9, logo_url: "", is_active: true },
  );
  return s;
}

function build(): Store {
  if (process.env.PRAKSA_SEED === "test") return buildTestStore();
  try {
    return buildFromRoster(parseRoster(fs.readFileSync(ROSTER_FILE, "utf8")));
  } catch {
    console.warn(`[praksa] ไม่พบ ${ROSTER_FILE} — ใช้ seed ทดสอบแทน`);
    return buildTestStore();
  }
}

// เก็บไว้ที่ globalThis กันโมดูลถูกโหลดซ้ำแยกกันระหว่างหน้า/server action ตอน dev
const g = globalThis as unknown as { __praksaMock?: Store };
export const db: Store = (g.__praksaMock ??= build());
