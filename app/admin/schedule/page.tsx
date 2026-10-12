import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScheduleClient } from "@/components/admin/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [games, categories, stations, matches, teams] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getStations(),
    data.getMatches(),
    data.getTeams(),
  ]);
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ตาราง / สถานี</h1>
      <ScheduleClient games={games} categories={categories} stations={stations} matches={matches} teams={teams} />
    </div>
  );
}
