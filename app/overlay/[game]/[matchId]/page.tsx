import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { nameOf } from "@/lib/view";

export default async function OverlayPage({ params }: { params: Promise<{ game: string; matchId: string }> }) {
  const { game, matchId } = await params;
  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [matches, participants] = await Promise.all([data.getMatches(g.id), data.getParticipants(g.id)]);
  const m = matches.find((x) => x.id === matchId);
  if (!m) notFound();
  return (
    <>
      <style>{"html,body{background:transparent!important}header{display:none}main{padding:0;max-width:none}"}</style>
      <div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-6 rounded bg-black/70 px-6 py-3 text-2xl font-bold">
        <span>{nameOf(participants, m.a_id)}</span>
        <span className="text-accent">{m.a_series} - {m.b_series}</span>
        <span>{nameOf(participants, m.b_id)}</span>
      </div>
    </>
  );
}
