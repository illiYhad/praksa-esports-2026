import { data } from "@/lib/data";
import { AthletesBrowser, type AthleteItem } from "@/components/profile/AthletesBrowser";
import { groupPersons, publicPhoto } from "@/lib/people";
import { shortCategoryName } from "@/lib/view";
import { Watermark } from "@/components/brand/Brand";

export const revalidate = 30;

export default async function AthletesPage() {
  const [games, categories, teams, players, photos] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getPlayers(),
    data.getPhotos(),
  ]);
  const items: AthleteItem[] = groupPersons(players, teams).map((p) => {
    const cats = p.teams.map((t) => categories.find((c) => c.id === t.category_id)).filter((c): c is NonNullable<typeof c> => !!c);
    const gameIds = [...new Set(cats.map((c) => c.game_id))];
    return {
      player: p.primary,
      photo: publicPhoto(photos, p.primary)?.cutout_url,
      teamIds: p.teams.map((t) => t.id),
      teamLabel: [...new Set(p.teams.map((t) => t.short_name ?? t.name))].join(" · "),
      categoryIds: cats.map((c) => c.id),
      categoryLabel: [...new Set(cats.map((c) => shortCategoryName(c.name, games.find((g) => g.id === c.game_id)?.name ?? "")))].join(" · "),
      gameIds,
      position: p.players.map((x) => x.position).find(Boolean),
    };
  });
  return (
    <div className="relative space-y-4 overflow-hidden">
      <Watermark height={520} opacity={0.04} />
      <h1 className="relative text-xl font-bold">นักกีฬา</h1>
      <div className="relative"><AthletesBrowser items={items} games={games} categories={categories} teams={teams} /></div>
    </div>
  );
}
