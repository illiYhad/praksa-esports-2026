import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { LiveRefresh } from "@/components/studio/LiveRefresh";
import { BracketView } from "@/components/bracket/BracketView";
import { computeMedals } from "@/lib/bracket/standings";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";
import { singleEntryLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function BracketPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [categories, matches, teams, settings] = await Promise.all([
    data.getCategories(g.id),
    data.getMatches(g.id),
    data.getTeams(g.id),
    data.getCategorySettings(),
  ]);
  return (
    <div className="space-y-8">
      <LiveRefresh />
      <h1 className="text-xl font-bold">สาย {g.name}</h1>
      {categories.map((c) => {
        const ms = matches.filter((m) => m.category_id === c.id);
        const ts = teams.filter((t) => t.category_id === c.id);
        const setting = settings.find((s) => s.category_id === c.id) ?? DEFAULT_SETTING(c.id);
        const medals = computeMedals(setting, ms, ts.map((t) => t.id));
        const nm = (id?: string) => ts.find((t) => t.id === id)?.name ?? "-";
        return (
          <section key={c.id} id={c.code}>
            <h2 className="mb-2 text-lg font-bold text-accent-2">{c.name}</h2>
            {setting.single_entry !== "pending" && <p className="mb-2 text-sm text-muted">{singleEntryLabel[setting.single_entry]}</p>}
            {medals.complete && (
              <p className="mb-2 text-sm">
                🥇 {nm(medals.gold)} {medals.silver && <>· 🥈 {nm(medals.silver)}</>} {medals.bronze.map((b) => <span key={b}>· 🥉 {nm(b)}</span>)}
              </p>
            )}
            <BracketView matches={ms} teams={ts} setting={setting} compact />
          </section>
        );
      })}
    </div>
  );
}
