import type { Category, CategorySetting, Match, Team } from "@/lib/types";
import { computeMedals } from "@/lib/bracket/standings";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";

// ตารางเหรียญรวมต่อ อปท. (แบบโอลิมปิก: เรียงทอง → เงิน → ทองแดง)
export type MedalRow = { key: string; name: string; short: string; gold: number; silver: number; bronze: number; total: number };

export function medalTable(categories: Category[], settings: CategorySetting[], matches: Match[], teams: Team[]): MedalRow[] {
  const rows = new Map<string, MedalRow>();
  const bump = (teamId: string | undefined, medal: "gold" | "silver" | "bronze") => {
    const t = teams.find((x) => x.id === teamId);
    if (!t) return;
    const key = t.team_code ?? t.name;
    const row = rows.get(key) ?? { key, name: t.name, short: t.short_name ?? t.name, gold: 0, silver: 0, bronze: 0, total: 0 };
    row[medal]++;
    row.total++;
    rows.set(key, row);
  };
  for (const c of categories) {
    const setting = settings.find((s) => s.category_id === c.id) ?? DEFAULT_SETTING(c.id);
    const ids = teams.filter((t) => t.category_id === c.id).map((t) => t.id);
    const m = computeMedals(setting, matches.filter((x) => x.category_id === c.id), ids);
    if (!m.complete) continue;
    bump(m.gold, "gold");
    bump(m.silver, "silver");
    for (const b of m.bronze) bump(b, "bronze");
  }
  return [...rows.values()].sort((a, b) => b.gold - a.gold || b.silver - a.silver || b.bronze - a.bronze || a.name.localeCompare(b.name, "th"));
}
