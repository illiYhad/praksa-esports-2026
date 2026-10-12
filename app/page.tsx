import Link from "next/link";
import { data } from "@/lib/data";
import { LiveRefresh } from "@/components/studio/LiveRefresh";
import { nameOf, timeOf, statusLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [games, matches, teams] = await Promise.all([data.getGames(), data.getMatches(), data.getTeams()]);
  const categories = await data.getCategories();
  const gameOf = (categoryId: string) => categories.find((c) => c.id === categoryId)?.game_id;
  return (
    <div className="space-y-6">
      <LiveRefresh />
      <section className="flex flex-wrap gap-3">
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
              {matches.filter((m) => gameOf(m.category_id) === g.id).map((m) => (
                <tr key={m.id} className="border-b border-white/5">
                  <td className="py-1 pr-2 text-muted">{timeOf(m.scheduled_time)}</td>
                  <td className="pr-2">{m.round_name}</td>
                  <td className="pr-2">{nameOf(teams, m.team_a_id)} vs {nameOf(teams, m.team_b_id)}</td>
                  <td className={m.status === "ongoing" ? "text-live" : "text-muted"}>{statusLabel[m.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
