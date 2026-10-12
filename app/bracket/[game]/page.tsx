import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { nameOf } from "@/lib/view";

export default async function BracketPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [matches, participants] = await Promise.all([data.getMatches(g.id), data.getParticipants(g.id)]);
  const rounds = [...new Set(matches.map((m) => m.round_label))];
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">สาย {g.name}</h1>
      <div className="flex gap-8 overflow-x-auto">
        {rounds.map((r) => (
          <div key={r} className="min-w-56 space-y-3">
            <h2 className="text-sm text-muted">{r}</h2>
            {matches.filter((m) => m.round_label === r).map((m) => (
              <div key={m.id} className={`rounded bg-surface p-2 text-sm ${m.status === "live" ? "ring-1 ring-live" : ""}`}>
                <div className="flex justify-between"><span>{nameOf(participants, m.a_id)}</span><b>{m.a_series}</b></div>
                <div className="flex justify-between"><span>{nameOf(participants, m.b_id)}</span><b>{m.b_series}</b></div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
