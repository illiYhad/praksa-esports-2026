import type { Category, CategorySetting, EventConfig, Game, Match, MatchAuditLog, Player, Sponsor, Station, Team } from "@/lib/types";
import { EVENT } from "@/lib/event";

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
  eventConfig: EventConfig;
};

/** วันแข่ง 1–4 ตั้งต้น = วันแรกจริง + วันถัดไปเรียงกัน (แอดมินแก้ได้ในตั้งค่างาน) */
export function defaultEventConfig(): EventConfig {
  const first = new Date(`${EVENT.firstDay}T00:00:00+07:00`);
  const days = Array.from({ length: EVENT.days }, (_, i) => {
    const d = new Date(first.getTime() + i * 86_400_000);
    return d.toLocaleDateString("sv-SE", { timeZone: EVENT.timezone }); // YYYY-MM-DD
  });
  return { days, announcement: "", updated_at: "" };
}

export const emptyStore = (): Store => ({
  games: [],
  categories: [],
  teams: [],
  players: [],
  stations: [],
  matches: [],
  sponsors: [],
  audit: [],
  settings: [],
  eventConfig: defaultEventConfig(),
});
