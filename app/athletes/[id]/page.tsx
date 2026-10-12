import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Avatar } from "@/components/profile/Avatar";
import { KrasaMark, Seal } from "@/components/brand/Brand";
import { athleteName, personKeyOf, publicPhoto, secondaryName } from "@/lib/people";
import { MEDAL_ICON, MEDAL_LABEL, medalsForTeam, sumRecords, teamHistory, teamRecord } from "@/lib/stats";
import { shortCategoryName, statusLabel } from "@/lib/view";

export const revalidate = 30;

export default async function AthletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [games, categories, teams, players, matches, photos, settings] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getPlayers(),
    data.getMatches(),
    data.getPhotos(),
    data.getCategorySettings(),
  ]);
  const me = players.find((p) => p.id === id);
  if (!me) notFound();
  const key = personKeyOf(me);
  const rows = players.filter((p) => personKeyOf(p) === key);
  const primary = rows.find((r) => r.in_game_name) ?? me;
  const myTeams = rows.map((r) => teams.find((t) => t.id === r.team_id)).filter((t): t is NonNullable<typeof t> => !!t);
  const photo = publicPhoto(photos, me);
  const name = athleteName(primary);
  const sub = secondaryName(primary);
  const catOf = (teamId: string) => categories.find((c) => c.id === teams.find((t) => t.id === teamId)?.category_id);
  const gameOf = (c?: { game_id: string }) => games.find((g) => g.id === c?.game_id);
  const record = sumRecords(myTeams.map((t) => teamRecord(t.id, matches)));
  const medals = myTeams.flatMap((t) => medalsForTeam(t, categories, settings, matches, teams));
  const nm = (tid?: string) => teams.find((t) => t.id === tid)?.short_name ?? teams.find((t) => t.id === tid)?.name ?? "รอผล";
  const teammates = players.filter((p) => myTeams.some((t) => t.id === p.team_id) && personKeyOf(p) !== key);

  return (
    <div className="space-y-6">
      <Link href="/athletes" className="text-xs text-muted">← นักกีฬาทั้งหมด</Link>
      <section className="relative flex flex-col gap-6 overflow-hidden rounded-xl bg-surface/40 p-4 sm:flex-row">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-[.08]" aria-hidden><KrasaMark variant="white" size={320} /></div>
        <div className="absolute right-3 top-3"><Seal size={40} /></div>
        <Avatar src={photo?.cutout_url} name={primary.real_name ?? name} size="xl" className="mx-auto sm:mx-0" mark={20} />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="text-4xl font-black">{name}</h1>
          {sub && <div className="text-lg text-muted">{sub}</div>}
          <div className="flex flex-wrap gap-2 text-sm">
            {myTeams.map((t) => {
              const c = catOf(t.id);
              return (
                <Link key={t.id} href={`/teams/${t.id}`} className="rounded bg-surface px-2 py-1 hover:text-accent">
                  {t.name} · {c ? shortCategoryName(c.name, gameOf(c)?.name ?? "") : ""}
                </Link>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            {rows.some((r) => r.is_captain) && <span className="rounded bg-accent px-2 text-black">กัปตัน</span>}
            {rows.map((r) => r.position).find(Boolean) && <span>ตำแหน่ง: {rows.map((r) => r.position).find(Boolean)}</span>}
            <span>เข้าแข่ง {rows.length} ประเภท</span>
          </div>
          {primary.quote && <blockquote className="border-l-2 border-accent pl-3 text-lg italic text-text/90">“{primary.quote}”</blockquote>}
          {medals.length > 0 && (
            <div className="flex flex-wrap gap-2 text-sm">
              {medals.map((m) => <span key={m.category.id} className="rounded bg-surface px-2 py-1">{MEDAL_ICON[m.medal]} {MEDAL_LABEL[m.medal]} · {shortCategoryName(m.category.name, gameOf(m.category)?.name ?? "")}</span>)}
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["แข่ง", record.played], ["ชนะ", record.wins], ["แพ้", record.losses], ["เกมที่ชนะ", record.gamesWon]].map(([l, v]) => (
          <div key={l} className="rounded bg-surface p-3 text-center">
            <div className="text-3xl font-black text-accent">{v}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-bold text-accent-2">ประวัติแมตช์</h2>
        {myTeams.map((t) => {
          const hist = teamHistory(t.id, matches);
          const c = catOf(t.id);
          if (!hist.length) return null;
          return (
            <div key={t.id} className="mb-3">
              <div className="text-xs text-muted">{c ? shortCategoryName(c.name, gameOf(c)?.name ?? "") : ""}</div>
              <ul className="space-y-1 text-sm">
                {hist.map((h) => (
                  <li key={h.match.id} className="flex flex-wrap items-center gap-2 rounded bg-surface px-2 py-1">
                    <span className="text-muted">{h.match.round_name}</span>
                    <span>vs {nm(h.opponentId)}</span>
                    <span className={`ml-auto font-bold ${h.result === "win" ? "text-accent" : h.result === "loss" ? "text-live" : "text-muted"}`}>
                      {h.result === "pending" ? statusLabel[h.match.status] : `${h.scoreFor}-${h.scoreAgainst} ${h.result === "win" ? "ชนะ" : h.result === "loss" ? "แพ้" : "LIVE"}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {myTeams.every((t) => teamHistory(t.id, matches).length === 0) && <p className="text-sm text-muted">ยังไม่มีแมตช์</p>}
      </section>

      {teammates.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-accent-2">เพื่อนร่วมทีม</h2>
          <div className="flex flex-wrap gap-2">
            {[...new Map(teammates.map((p) => [personKeyOf(p), p])).values()].map((p) => (
              <Link key={p.id} href={`/athletes/${p.id}`} className="flex items-center gap-2 rounded bg-surface px-2 py-1 text-sm hover:text-accent">
                <Avatar src={publicPhoto(photos, p)?.cutout_url} name={p.real_name ?? athleteName(p)} size="sm" />
                {athleteName(p)}{p.is_captain && <span className="rounded bg-accent px-1 text-[10px] text-black">C</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
