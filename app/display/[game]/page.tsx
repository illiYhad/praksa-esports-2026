import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { nameOf } from "@/lib/view";

export default async function DisplayPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [stations, matches, participants] = await Promise.all([
    data.getStations(g.id),
    data.getMatches(g.id),
    data.getParticipants(g.id),
  ]);
  const vs = (m?: (typeof matches)[number]) =>
    m ? `${nameOf(participants, m.a_id)} vs ${nameOf(participants, m.b_id)}` : "-";
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">บอร์ดสถานี {g.name}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stations.map((s) => {
          const mine = matches.filter((m) => m.station_id === s.id);
          const now = mine.find((m) => m.status === "live");
          const next = mine.find((m) => m.status === "scheduled");
          return (
            <div key={s.id} className="rounded bg-surface p-3 text-sm">
              <div className="mb-1 font-bold text-accent">{s.label}</div>
              <div className={now ? "text-live" : "text-muted"}>{now ? `${vs(now)} (${now.a_series}-${now.b_series})` : "ว่าง"}</div>
              <div className="mt-1 text-xs text-muted">ถัดไป: {vs(next)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
