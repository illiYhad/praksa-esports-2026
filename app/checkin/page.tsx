import { data } from "@/lib/data";
import { CheckinClient } from "@/components/studio/CheckinClient";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const [games, categories, teams, players] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getPlayers(),
  ]);
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">เช็กอิน</h1>
      <CheckinClient games={games} categories={categories} teams={teams} players={players} />
    </div>
  );
}
