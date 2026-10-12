import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Sheet } from "@/components/print/Sheet";
import { PrintBracket } from "@/components/print/PrintBracket";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";
import { formatLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function PrintBracketPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: id } = await params;
  const categories = await data.getCategories();
  const category = categories.find((c) => c.id === id || c.code === id);
  if (!category) notFound();
  const [games, matches, teams, settings] = await Promise.all([
    data.getGames(),
    data.getMatches(category.game_id),
    data.getTeams(category.game_id),
    data.getCategorySettings(),
  ]);
  const game = games.find((g) => g.id === category.game_id);
  const setting = settings.find((s) => s.category_id === category.id) ?? DEFAULT_SETTING(category.id);
  return (
    <Sheet landscape title={`สายการแข่งขัน · ${category.name}`} subtitle={`${game?.name ?? ""} · ${formatLabel[setting.format]}${setting.third_place ? " · มีชิงอันดับ 3" : ""}`}>
      <PrintBracket matches={matches.filter((m) => m.category_id === category.id)} teams={teams.filter((t) => t.category_id === category.id)} setting={setting} />
    </Sheet>
  );
}
