import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { BracketView } from "@/components/bracket/BracketView";
import { computeMedals } from "@/lib/bracket/standings";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";
import { formatLabel, shortCategoryName, singleEntryLabel } from "@/lib/view";
import { Watermark } from "@/components/brand/Brand";

// หน้าสาธารณะ: ไม่ subscribe Realtime — revalidate แทน
export const revalidate = 20;

// /bracket/<รหัสเกม> = หน้าเลือกประเภท · /bracket/<รหัสหรือ id ประเภท> = สายของประเภทนั้น
export default async function BracketPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: param } = await params;
  const [games, categories] = await Promise.all([data.getGames(), data.getCategories()]);
  const game = games.find((g) => g.code === param);
  if (game) {
    const [matches, settings] = await Promise.all([data.getMatches(game.id), data.getCategorySettings()]);
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">สายการแข่งขัน {game.name}</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          {games.map((g) => <Link key={g.id} href={`/bracket/${g.code}`} className={`rounded px-3 py-1 ${g.id === game.id ? "bg-accent text-black" : "bg-surface"}`}>{g.name}</Link>)}
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.filter((c) => c.game_id === game.id).map((c) => {
            const n = matches.filter((m) => m.category_id === c.id).length;
            const s = settings.find((x) => x.category_id === c.id);
            return (
              <li key={c.id}>
                <Link href={`/bracket/${c.code}`} className="block rounded bg-surface p-3 hover:ring-1 hover:ring-accent">
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-muted">{s ? formatLabel[s.format] : ""} · {n ? `${n} แมตช์` : "รอจัดสาย"}{s && s.single_entry !== "pending" ? ` · ${singleEntryLabel[s.single_entry]}` : ""}</div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const category = categories.find((c) => c.code === param || c.id === param);
  if (!category) notFound();
  const g = games.find((x) => x.id === category.game_id)!;
  const [matches, teams, settings] = await Promise.all([data.getMatches(g.id), data.getTeams(g.id), data.getCategorySettings()]);
  const ms = matches.filter((m) => m.category_id === category.id);
  const ts = teams.filter((t) => t.category_id === category.id);
  const setting = settings.find((s) => s.category_id === category.id) ?? DEFAULT_SETTING(category.id);
  const medals = computeMedals(setting, ms, ts.map((t) => t.id));
  const nm = (id?: string) => ts.find((t) => t.id === id)?.name ?? "-";
  const siblings = categories.filter((c) => c.game_id === g.id);

  return (
    <div className="relative space-y-4 overflow-hidden">
      <Watermark height={520} opacity={0.04} />
      <Link href={`/bracket/${g.code}`} className="relative text-xs text-muted">← ประเภทอื่นของ {g.name}</Link>
      <h1 className="text-xl font-bold">{category.name}</h1>
      <p className="text-sm text-muted">{formatLabel[setting.format]}{setting.third_place ? " · มีชิงอันดับ 3" : ""} · {ts.length} ทีม/คน · {ms.length} แมตช์</p>
      {setting.single_entry !== "pending" && <p className="text-sm text-muted">{singleEntryLabel[setting.single_entry]}</p>}
      {medals.complete && (
        <p className="rounded bg-surface p-3 text-sm">
          🥇 {nm(medals.gold)} {medals.silver && <>· 🥈 {nm(medals.silver)}</>} {medals.bronze.map((b) => <span key={b}>· 🥉 {nm(b)}</span>)}
        </p>
      )}
      <BracketView matches={ms} teams={ts} setting={setting} />
      <div className="flex flex-wrap gap-2 pt-4 text-xs">
        {siblings.map((c) => (
          <Link key={c.id} href={`/bracket/${c.code}`} className={`rounded px-2 py-1 ${c.id === category.id ? "bg-accent text-black" : "bg-surface text-muted hover:text-text"}`}>
            {shortCategoryName(c.name, g.name)}
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted">ข้อมูลอัปเดตทุก 20 วินาที</p>
    </div>
  );
}
