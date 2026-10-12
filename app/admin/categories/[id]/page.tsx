import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { CategorySetupClient } from "@/components/admin/CategorySetupClient";
import { BracketView } from "@/components/bracket/BracketView";
import { computeMedals } from "@/lib/bracket/standings";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";

export const dynamic = "force-dynamic";

export default async function CategorySetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await data.getCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();
  const [games, teams, matches, settings] = await Promise.all([
    data.getGames(),
    data.getTeams(category.game_id),
    data.getMatches(category.game_id),
    data.getCategorySettings(),
  ]);
  const game = games.find((g) => g.id === category.game_id)!;
  const catTeams = teams.filter((t) => t.category_id === category.id);
  const catMatches = matches.filter((m) => m.category_id === category.id);
  const setting = settings.find((s) => s.category_id === category.id) ?? DEFAULT_SETTING(category.id);
  const siblings = categories.filter((c) => c.game_id === category.game_id && c.id !== category.id);
  const medals = computeMedals(setting, catMatches, catTeams.map((t) => t.id));
  const nm = (tid?: string) => catTeams.find((t) => t.id === tid)?.name ?? "-";

  return (
    <div className="space-y-4">
      <AdminNav />
      <div>
        <Link href="/admin/categories" className="text-xs text-muted">← ประเภททั้งหมด</Link>
        <h1 className="text-xl font-bold">{category.name}</h1>
        <p className="text-sm text-muted">{game.name} · {catTeams.length} ทีม/คน · {catMatches.length} แมตช์</p>
        <div className="mt-1 flex gap-2 text-xs">
          <a href={`/print/bracket/${category.id}`} target="_blank" rel="noreferrer" className="rounded bg-surface px-2 py-1 hover:text-accent">🖨 สายแข่ง (A4 แนวนอน)</a>
          <a href={`/print/results/${category.id}`} target="_blank" rel="noreferrer" className="rounded bg-surface px-2 py-1 hover:text-accent">🖨 สรุปผลและเหรียญ</a>
        </div>
      </div>

      <CategorySetupClient category={category} teams={catTeams} setting={setting} matches={catMatches} siblings={siblings} />

      {medals.complete && (
        <section className="rounded bg-surface p-3 text-sm">
          <h2 className="mb-1 font-bold text-accent-2">ผลรางวัล</h2>
          <div>🥇 ทอง: {nm(medals.gold)}</div>
          {medals.silver && <div>🥈 เงิน: {nm(medals.silver)}</div>}
          {medals.bronze.map((b) => <div key={b}>🥉 ทองแดง: {nm(b)}</div>)}
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold text-accent-2">สายแข่ง</h2>
        <BracketView matches={catMatches} teams={catTeams} setting={setting} />
      </section>
    </div>
  );
}
