import Link from "next/link";
import { data } from "@/lib/data";
import { shortCategoryName } from "@/lib/view";
import { initialsOf } from "@/lib/people";
import { Watermark } from "@/components/brand/Brand";

export const revalidate = 30;

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ game?: string; category?: string }> }) {
  const q = await searchParams;
  const [games, categories, teams, players] = await Promise.all([data.getGames(), data.getCategories(), data.getTeams(), data.getPlayers()]);
  const shownGames = games.filter((g) => !q.game || g.code === q.game);
  return (
    <div className="relative space-y-6 overflow-hidden">
      <Watermark height={520} opacity={0.04} />
      <h1 className="relative text-xl font-bold">ทีม</h1>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/teams" className={`rounded px-3 py-1 ${!q.game ? "bg-accent text-black" : "bg-surface"}`}>ทุกเกม</Link>
        {games.map((g) => <Link key={g.id} href={`/teams?game=${g.code}`} className={`rounded px-3 py-1 ${q.game === g.code ? "bg-accent text-black" : "bg-surface"}`}>{g.name}</Link>)}
      </div>
      {shownGames.map((g) =>
        categories.filter((c) => c.game_id === g.id && (!q.category || c.id === q.category)).map((c) => {
          const ts = teams.filter((t) => t.category_id === c.id);
          if (!ts.length) return null;
          return (
            <section key={c.id}>
              <h2 className="mb-2 font-bold text-accent-2">{c.name}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {ts.map((t) => (
                  <Link key={t.id} href={`/teams/${t.id}`} className="flex items-center gap-2 rounded-lg bg-surface p-2 hover:ring-1 hover:ring-accent">
                    {t.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.logo_url} alt="" className="h-10 w-10 rounded object-contain" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-accent/20 text-xs font-bold text-accent">{initialsOf(t.short_name ?? t.name)}</span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{t.short_name ?? t.name}</span>
                      <span className="block truncate text-xs text-muted">{shortCategoryName(c.name, g.name)} · {players.filter((p) => p.team_id === t.id).length} คน</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        }),
      )}
    </div>
  );
}
