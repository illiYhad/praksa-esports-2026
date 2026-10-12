import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { LiveRefresh } from "@/components/studio/LiveRefresh";
import { nameOf } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function BracketPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [matches, teams] = await Promise.all([data.getMatches(g.id), data.getTeams(g.id)]);
  const rounds = [...new Set(matches.map((m) => m.round_name))];
  return (
    <div>
      <LiveRefresh />
      <h1 className="mb-4 text-xl font-bold">สาย {g.name}</h1>
      <div className="flex gap-8 overflow-x-auto pb-2">
        {rounds.map((r) => (
          <div key={r} className="min-w-56 space-y-3">
            <h2 className="text-sm text-muted">{r}</h2>
            {matches.filter((m) => m.round_name === r).map((m) => {
              const row = (id: string | undefined, score: number) => (
                <div className={`flex justify-between ${m.winner_id && m.winner_id === id ? "font-bold text-accent" : ""}`}>
                  <span>{nameOf(teams, id)}</span>
                  <span>{score}</span>
                </div>
              );
              return (
                <div key={m.id} className={`relative rounded bg-surface p-2 text-sm ${m.status === "ongoing" ? "ring-1 ring-live" : ""}`}>
                  {m.status === "ongoing" && (
                    <span className="absolute -top-2 right-2 rounded bg-live px-1.5 text-[10px] font-bold text-white">LIVE</span>
                  )}
                  {row(m.team_a_id, m.team_a_score)}
                  {row(m.team_b_id, m.team_b_score)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
