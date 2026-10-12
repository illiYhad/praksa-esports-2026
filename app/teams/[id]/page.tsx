import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { AthleteCard } from "@/components/profile/AthleteCard";
import { BracketView } from "@/components/bracket/BracketView";
import { KrasaMark, Seal } from "@/components/brand/Brand";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";
import { initialsOf, publicPhoto } from "@/lib/people";
import { MEDAL_ICON, MEDAL_LABEL, medalsForTeam, teamHistory, teamRecord } from "@/lib/stats";
import { shortCategoryName, statusLabel } from "@/lib/view";

export const revalidate = 30;

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teams = await data.getTeams();
  const team = teams.find((t) => t.id === id);
  if (!team) notFound();
  const [games, categories, players, matches, photos, settings] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getPlayers(),
    data.getMatches(),
    data.getPhotos(),
    data.getCategorySettings(),
  ]);
  const category = categories.find((c) => c.id === team.category_id);
  const game = games.find((g) => g.id === category?.game_id);
  const members = players.filter((p) => p.team_id === team.id).sort((a, b) => (a.order_in_team ?? 0) - (b.order_in_team ?? 0));
  const catMatches = matches.filter((m) => m.category_id === team.category_id);
  const catTeams = teams.filter((t) => t.category_id === team.category_id);
  const setting = settings.find((s) => s.category_id === team.category_id) ?? DEFAULT_SETTING(team.category_id);
  const rec = teamRecord(team.id, matches);
  const hist = teamHistory(team.id, matches);
  const medals = medalsForTeam(team, categories, settings, matches, teams);
  const nm = (tid?: string) => teams.find((t) => t.id === tid)?.short_name ?? teams.find((t) => t.id === tid)?.name ?? "รอผล";
  const sameOrg = team.team_code ? teams.filter((t) => t.team_code === team.team_code && t.id !== team.id) : [];

  return (
    <div className="space-y-6">
      <Link href="/teams" className="text-xs text-muted">← ทีมทั้งหมด</Link>
      <section className="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-surface/40 p-4 sm:flex-row sm:items-center">
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center opacity-[.08]" aria-hidden><KrasaMark variant="white" size={260} /></div>
        <div className="absolute right-3 top-3"><Seal size={40} /></div>
        {team.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.logo_url} alt="" className="h-24 w-24 rounded-xl object-contain" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-accent/20 text-2xl font-black text-accent">{initialsOf(team.short_name ?? team.name)}</div>
        )}
        <div className="space-y-1">
          <h1 className="text-3xl font-black">{team.name}</h1>
          <div className="text-muted">{category?.name} · {game?.name}</div>
          <div className="text-sm text-muted">แข่ง {rec.played} · ชนะ {rec.wins} · แพ้ {rec.losses} · เกม {rec.gamesWon}-{rec.gamesLost}</div>
          {medals.map((m) => <div key={m.category.id} className="text-sm">{MEDAL_ICON[m.medal]} {MEDAL_LABEL[m.medal]}</div>)}
        </div>
      </section>
      {team.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.photo_url} alt={`รูปทีม ${team.name}`} className="w-full rounded-xl object-cover" />
      )}

      <section>
        <h2 className="mb-2 font-bold text-accent-2">นักกีฬา</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {members.map((p) => <AthleteCard key={p.id} player={p} photo={publicPhoto(photos, p)?.cutout_url} position={p.position} />)}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-bold text-accent-2">ผลแข่ง</h2>
        {hist.length === 0 ? <p className="text-sm text-muted">ยังไม่มีแมตช์</p> : (
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
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold text-accent-2">ทางสาย · {category ? shortCategoryName(category.name, game?.name ?? "") : ""}</h2>
        <BracketView matches={catMatches} teams={catTeams} setting={setting} compact highlightTeamId={team.id} />
      </section>

      {sameOrg.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-accent-2">ทีมอื่นของ {team.short_name ?? team.name}</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            {sameOrg.map((t) => {
              const c = categories.find((x) => x.id === t.category_id);
              return <Link key={t.id} href={`/teams/${t.id}`} className="rounded bg-surface px-2 py-1 hover:text-accent">{c ? shortCategoryName(c.name, games.find((g) => g.id === c.game_id)?.name ?? "") : t.name}</Link>;
            })}
          </div>
        </section>
      )}
    </div>
  );
}
