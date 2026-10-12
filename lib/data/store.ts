import fs from "node:fs";
import path from "node:path";
import type { Game, ImportPreview } from "@/lib/types";
import { EVENT, STATION_COUNT } from "@/lib/event";
import { abbreviateOrg, parseRoster, personKey, type Roster } from "./roster-parse";
import { buildTestStore } from "./seed-test";
import { emptyStore, type Store } from "./defaults";

export type { Store } from "./defaults";

const GAME_META: Record<string, { name: string; format: Game["format"]; team_size: number }> = {
  rov: { name: "ROV", format: "team", team_size: 5 },
  sf6: { name: "Street Fighter 6", format: "solo", team_size: 1 },
  efootball: { name: "eFootball Mobile", format: "solo", team_size: 1 },
};

// ไฟล์รายชื่อจริง (ผู้เยาว์) อยู่นอก git — ไม่มีไฟล์ → ใช้ seed ทดสอบ
const ROSTER_FILE = path.join(process.cwd(), "data", "roster.seed.txt");

function ensureGame(s: Store, code: string, newId?: (prefix: string) => string): Game | undefined {
  const found = s.games.find((g) => g.code === code);
  if (found) return found;
  const meta = GAME_META[code];
  if (!meta) return undefined;
  const game: Game = { id: newId ? newId("g") : `g-${code}`, code, ...meta };
  s.games.push(game);
  for (let k = 1; k <= (STATION_COUNT[code] ?? 1); k++) {
    s.stations.push({ id: newId ? newId("st") : `${code}-s${k}`, game_id: game.id, name: `สถานี ${k}` });
  }
  return game;
}

/** รวมรายชื่อจาก ROSTER เข้า store — ซ้ำไม่สร้างซ้ำ · apply=false = พรีวิวอย่างเดียว · newId = ตัวสร้าง id (Supabase ต้องเป็น uuid) */
export function mergeRoster(s: Store, roster: Roster, apply: boolean, newId?: (prefix: string) => string): ImportPreview {
  const out: ImportPreview = { newCategories: [], unknownGames: [], newTeams: 0, existingTeams: 0, newPlayers: 0, existingPlayers: 0, errors: [] };
  const catByCode = new Map(s.categories.map((c) => [c.code, c]));
  const virtualCats = new Map<string, { id: string; game_id: string }>();

  for (const c of roster.categories) {
    if (catByCode.has(c.code)) continue;
    const game = apply ? ensureGame(s, c.game, newId) : s.games.find((g) => g.code === c.game) ?? (GAME_META[c.game] ? { id: `g-${c.game}` } : undefined);
    if (!game) {
      if (!out.unknownGames.includes(c.game)) out.unknownGames.push(c.game);
      continue;
    }
    out.newCategories.push(c.code);
    if (apply) {
      const cat = { id: newId ? newId("cat") : c.code, code: c.code, game_id: game.id, name: c.name };
      s.categories.push(cat);
      catByCode.set(c.code, cat);
    } else {
      virtualCats.set(c.code, { id: c.code, game_id: game.id });
    }
  }

  const orgName = new Map(roster.teams.map((t) => [t.team_code, t.name]));
  const seenTeam = new Set<string>();
  const newTeamIds = new Set<string>();
  const newPlayerKeys = new Set<string>();

  for (const p of roster.players) {
    const cat = catByCode.get(p.category_code) ?? virtualCats.get(p.category_code);
    if (!cat) {
      const msg = `ไม่รู้จักประเภท ${p.category_code} (${p.real_name})`;
      if (!out.errors.includes(msg)) out.errors.push(msg);
      continue;
    }
    const teamKey = `${p.team_code}|${cat.id}`;
    let team = s.teams.find((t) => t.category_id === cat.id && t.team_code === p.team_code);
    if (!seenTeam.has(teamKey)) {
      seenTeam.add(teamKey);
      if (team) out.existingTeams++;
      else {
        out.newTeams++;
        newTeamIds.add(teamKey);
        if (apply) {
          const name = orgName.get(p.team_code) ?? s.teams.find((t) => t.team_code === p.team_code)?.name ?? p.team_code;
          team = { id: newId ? newId("t") : `${p.team_code}-${cat.id}`, category_id: cat.id, team_code: p.team_code, name, short_name: abbreviateOrg(name), is_checked_in: false };
          s.teams.push(team);
        }
      }
    }
    const key = personKey(p.real_name, p.team_code);
    const dup = `${teamKey}|${key}`;
    const exists = (team && s.players.some((x) => x.team_id === team!.id && x.person_key === key)) || newPlayerKeys.has(dup);
    if (exists) out.existingPlayers++;
    else {
      out.newPlayers++;
      newPlayerKeys.add(dup);
      if (apply && team) {
        const used = new Set(s.players.filter((x) => x.team_id === team!.id).map((x) => x.order_in_team));
        let order = p.order_in_team || 1;
        while (used.has(order)) order++;
        s.players.push({
          id: newId ? newId("p") : `${team.id}-p${order}`,
          team_id: team.id,
          real_name: p.real_name,
          in_game_name: "",
          is_captain: order === 1,
          order_in_team: order,
          person_key: key,
        });
      }
    }
  }
  return out;
}

/** สร้างข้อมูลหลักจาก ROSTER — ไม่มีแมตช์ (จัดสายในแอดมิน) */
export function buildFromRoster(roster: Roster): Store {
  const s = emptyStore();
  for (const code of new Set(roster.categories.map((c) => c.game))) ensureGame(s, code);
  mergeRoster(s, roster, true);
  // ไม่มีสปอนเซอร์ใน seed หลัก (ใบ 1459) — เทศบาลคือผู้จัด ไม่ใช่สปอนเซอร์ · เพิ่มได้ที่ /admin/sponsors
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
