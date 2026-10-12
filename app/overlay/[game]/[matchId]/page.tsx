import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { OverlayStage } from "@/components/studio/OverlayStage";
import { shortCategoryName } from "@/lib/view";

export const dynamic = "force-dynamic";

const CLEAR_STYLE = "html,body{background:transparent!important;overflow:hidden}header{display:none}main{padding:0;max-width:none;margin:0}";

export default async function OverlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string; matchId: string }>;
  searchParams: Promise<{ k?: string; roster?: string; stinger?: string }>;
}) {
  const [{ game, matchId }, q] = await Promise.all([params, searchParams]);
  const expected = process.env.CHANNEL_KEY;

  // ไม่มีรหัส หรือรหัสไม่ตรง → พื้นโปร่งใสเปล่า ไม่ subscribe
  if (!expected || q.k !== expected) return <style>{CLEAR_STYLE}</style>;

  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [matches, teams, players, sponsors, photos, categories] = await Promise.all([
    data.getMatches(g.id),
    data.getTeams(g.id),
    data.getPlayers(g.id),
    data.getSponsors(),
    data.getPhotos(),
    data.getCategories(g.id),
  ]);
  const match = matches.find((x) => x.id === matchId);
  if (!match) notFound();
  const categoryName = shortCategoryName(categories.find((c) => c.id === match.category_id)?.name ?? "", g.name);

  return (
    <>
      <style>{CLEAR_STYLE}</style>
      <OverlayStage
        channelKey={expected}
        game={g}
        match={match}
        categoryName={categoryName}
        matches={matches}
        teams={teams}
        players={players}
        sponsors={sponsors}
        photos={photos}
        showRoster={q.roster !== "0"}
        stingerVideo={q.stinger}
      />
    </>
  );
}
