import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { PhotoStudioClient } from "@/components/admin/PhotoStudioClient";
import { groupPersons } from "@/lib/people";
import { shortCategoryName } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const [games, categories, teams, players, photos] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getPlayers(),
    data.getPhotos(),
  ]);
  const persons = groupPersons(players, teams).map((p) => ({
    key: p.key,
    name: p.primary.real_name ?? p.primary.in_game_name,
    ign: p.primary.in_game_name,
    teams: [...new Set(p.teams.map((t) => t.short_name ?? t.name))].join(" · "),
    categories: p.players
      .map((pl) => {
        const t = teams.find((x) => x.id === pl.team_id);
        const c = categories.find((x) => x.id === t?.category_id);
        const g = games.find((x) => x.id === c?.game_id);
        return c ? shortCategoryName(c.name, g?.name ?? "") : "";
      })
      .filter(Boolean)
      .join(" · "),
  }));
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ถ่ายรูปนักกีฬา (กรีนสกรีน)</h1>
      <PhotoStudioClient persons={persons} photos={photos} />
    </div>
  );
}
