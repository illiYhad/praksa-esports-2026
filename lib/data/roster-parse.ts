// แปลงข้อความรูปแบบไฟล์ ROSTER (3 ส่วน: ## categories · ## teams · ## players) — ใช้ทั้ง seed และหน้า "นำเข้า" ในแอดมิน
export type RosterCategory = { code: string; game: string; name: string };
export type RosterTeam = { team_code: string; name: string };
export type RosterPlayer = { category_code: string; team_code: string; order_in_team: number; real_name: string };
export type Roster = { categories: RosterCategory[]; teams: RosterTeam[]; players: RosterPlayer[] };

export function parseRoster(text: string): Roster {
  const out: Roster = { categories: [], teams: [], players: [] };
  let section: keyof Roster | null = null;
  let header: string[] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#!")) continue;
    if (line.startsWith("## ")) {
      const name = line.slice(3).trim().split(/\s/)[0] as keyof Roster;
      section = name in out ? name : null;
      header = null;
      continue;
    }
    if (line.startsWith("#") || !section) continue;
    const cells = line.split(",").map((c) => c.trim());
    if (!header) {
      header = cells;
      continue;
    }
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    if (section === "categories" && row.code) out.categories.push({ code: row.code, game: row.game, name: row.name });
    else if (section === "teams" && row.team_code) out.teams.push({ team_code: row.team_code, name: row.name });
    else if (section === "players" && row.real_name) {
      out.players.push({
        category_code: row.category_code,
        team_code: row.team_code,
        order_in_team: Number(row.order_in_team) || 0,
        real_name: row.real_name,
      });
    }
  }
  return out;
}

/** ตัวย่อ อปท.: องค์การบริหารส่วนจังหวัด→อบจ. · เทศบาลนคร→ทน. · เทศบาลเมือง→ทม. · เทศบาลตำบล→ทต. */
export function abbreviateOrg(name: string): string {
  return name
    .replace(/^องค์การบริหารส่วนจังหวัด/, "อบจ.")
    .replace(/^เทศบาลนคร/, "ทน.")
    .replace(/^เทศบาลเมือง/, "ทม.")
    .replace(/^เทศบาลตำบล/, "ทต.")
    .replace(/^องค์การบริหารส่วนตำบล/, "อบต.");
}

/** กุญแจคนเดียวกันข้ามประเภท = ชื่อจริง + รหัส อปท. */
export const personKey = (realName: string, teamCode: string) => `${realName.trim()}|${teamCode}`;
