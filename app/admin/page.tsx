import Link from "next/link";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { formatLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [games, categories, teams, matches, settings, sponsors] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getMatches(),
    data.getCategorySettings(),
    data.getSponsors(),
  ]);
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ภาพรวม</h1>
      {games.map((g) => {
        const cats = categories.filter((c) => c.game_id === g.id);
        return (
          <section key={g.id}>
            <h2 className="mb-1 font-bold text-accent-2">{g.name}</h2>
            <ul className="space-y-1 text-sm">
              {cats.map((c) => {
                const n = teams.filter((t) => t.category_id === c.id).length;
                const ms = matches.filter((m) => m.category_id === c.id);
                const s = settings.find((x) => x.category_id === c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/categories/${c.id}`} className="text-accent">{c.name}</Link>
                    <span className="text-muted">
                      {n} ทีม · {s ? formatLabel[s.format] : "-"} · แมตช์ {ms.length}
                      {ms.some((m) => m.status === "ongoing") && <span className="ml-1 text-live">● LIVE</span>}
                    </span>
                    {n === 1 && s?.single_entry === "pending" && <span className="rounded bg-amber-500/20 px-1 text-xs text-amber-300">ผู้สมัคร 1 คน</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <h2 className="font-bold text-accent-2">สปอนเซอร์</h2>
      <ul className="text-sm">
        {sponsors.map((s) => (
          <li key={s.id}>{s.name} · {s.level} · {s.position} · ลำดับ {s.sequence}</li>
        ))}
      </ul>
    </div>
  );
}
