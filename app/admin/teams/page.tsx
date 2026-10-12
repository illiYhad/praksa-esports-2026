import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { TeamsClient } from "@/components/admin/TeamsClient";

export const dynamic = "force-dynamic";

export default async function TeamsAdminPage() {
  const [games, categories, teams, players, matches] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getPlayers(),
    data.getMatches(),
  ]);
  const inBracket = new Set(matches.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((x): x is string => !!x));
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ทีม / นักกีฬา</h1>
      <TeamsClient games={games} categories={categories} teams={teams} players={players} inBracket={[...inBracket]} />
    </div>
  );
}
