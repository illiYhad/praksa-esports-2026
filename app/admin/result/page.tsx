import { data } from "@/lib/data";
import { ResultClient } from "@/components/studio/ResultClient";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
  const [games, categories, matches, teams] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getMatches(),
    data.getTeams(),
  ]);
  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">กรอกผล</h1>
      <ResultClient games={games} categories={categories} matches={matches} teams={teams} />
    </div>
  );
}
