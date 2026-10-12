import Link from "next/link";
import { data } from "@/lib/data";
import { nameOf, timeOf, statusLabel } from "@/lib/view";

export default async function Home() {
  const [games, matches, participants] = await Promise.all([
    data.getGames(),
    data.getMatches(),
    data.getParticipants(),
  ]);
  return (
    <div className="space-y-6">
      <section className="flex gap-3">
        {games.map((g) => (
          <Link key={g.id} href={`/bracket/${g.code}`} className="rounded bg-surface px-4 py-2 hover:text-accent">
            สาย {g.name}
          </Link>
        ))}
      </section>
      {games.map((g) => (
        <section key={g.id}>
          <h2 className="mb-2 text-lg font-bold text-accent-2">{g.name}</h2>
          <table className="w-full text-sm">
            <tbody>
              {matches.filter((m) => m.game_id === g.id).map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="py-1 text-muted">{timeOf(m.scheduled_at)}</td>
                  <td>{m.round_label}</td>
                  <td>{nameOf(participants, m.a_id)} vs {nameOf(participants, m.b_id)}</td>
                  <td className={m.status === "live" ? "text-live" : "text-muted"}>{statusLabel[m.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
