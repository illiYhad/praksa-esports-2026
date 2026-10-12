import Link from "next/link";
import { data } from "@/lib/data";
import { EVENT } from "@/lib/event";
import { medalTable } from "@/lib/medals";
import { KrasaLogo, Seal, Watermark } from "@/components/brand/Brand";
import { clockOf, dayKeyOf, nameOf, shortCategoryName, statusLabel, thaiDate } from "@/lib/view";

// หน้าสาธารณะ: ไม่ subscribe Realtime — ใช้ revalidate แทน (โควตาการเชื่อมต่อ Supabase)
export const revalidate = 20;

export default async function Home() {
  const [games, categories, matches, teams, stations, settings, config] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getMatches(),
    data.getTeams(),
    data.getStations(),
    data.getCategorySettings(),
    data.getEventConfig(),
  ]);
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: EVENT.timezone });
  const catOf = (id: string) => categories.find((c) => c.id === id);
  const gameOf = (c?: Category) => games.find((g) => g.id === c?.game_id);
  const catLabel = (id: string) => {
    const c = catOf(id);
    return c ? `${gameOf(c)?.name ?? ""} · ${shortCategoryName(c.name, gameOf(c)?.name ?? "")}` : "";
  };
  const live = matches.filter((m) => m.status === "ongoing");
  const scheduledDays = [...new Set(matches.map((m) => dayKeyOf(m.scheduled_time)).filter(Boolean))].sort();
  const showDay = scheduledDays.includes(today) ? today : scheduledDays.find((d) => d > today) ?? scheduledDays[0];
  const dayMatches = matches
    .filter((m) => showDay && dayKeyOf(m.scheduled_time) === showDay)
    .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""));
  const medals = medalTable(categories, settings, matches, teams);
  const dayNo = config.days.indexOf(showDay ?? "") + 1;

  return (
    <div className="space-y-8">
      <section className="relative space-y-2 overflow-hidden rounded-xl bg-surface p-5">
        <Watermark height={420} opacity={0.05} />
        <div className="relative flex flex-wrap items-center gap-6">
          <span className="hidden sm:block"><KrasaLogo variant="white" width={420} priority /></span>
          <span className="sm:hidden"><KrasaLogo variant="white" width={260} priority /></span>
          <span className="hidden sm:block"><Seal size={120} priority /></span>
          <span className="sm:hidden"><Seal size={80} priority /></span>
        </div>
        <div className="relative text-sm text-muted">{EVENT.titleLine1}</div>
        <h1 className="relative text-3xl font-black text-accent">{EVENT.titleLine2}</h1>
        <div className="text-sm text-muted">กีฬาอีสปอร์ต · จัดโดย {EVENT.organizer} · {config.days.length ? `${thaiDate(config.days[0])}${config.days.length > 1 ? ` – ${thaiDate(config.days[config.days.length - 1])}` : ""}` : ""}</div>
        {config.announcement && <div className="rounded bg-accent-2/15 p-3 text-sm text-text whitespace-pre-line">📢 {config.announcement}</div>}
        <div className="flex flex-wrap gap-2 pt-1 text-sm">
          <Link href="/athletes" className="rounded bg-bg px-3 py-1 hover:text-accent">นักกีฬา</Link>
          <Link href="/teams" className="rounded bg-bg px-3 py-1 hover:text-accent">ทีม</Link>
          {games.map((g) => <Link key={g.id} href={`/display/${g.code}`} className="rounded bg-bg px-3 py-1 hover:text-accent">บอร์ดสถานี {g.name}</Link>)}
        </div>
      </section>

      {live.length > 0 && (
        <section>
          <h2 className="mb-2 font-bold text-live">● กำลังแข่งขัน</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {live.map((m) => (
              <li key={m.id} className="rounded bg-surface p-3 text-sm ring-1 ring-live">
                <div className="text-xs text-muted">{catLabel(m.category_id)} · {m.round_name} · {stations.find((s) => s.id === m.station_id)?.name ?? ""}</div>
                <div className="font-bold">{nameOf(teams, m.team_a_id)} <span className="text-accent">{m.team_a_score} - {m.team_b_score}</span> {nameOf(teams, m.team_b_id)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-bold text-accent-2">ตารางแข่ง{showDay ? ` · ${dayNo ? `วันที่ ${dayNo} · ` : ""}${thaiDate(showDay)}` : ""}</h2>
        {dayMatches.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีตารางแข่งที่กำหนดเวลา</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {dayMatches.map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="py-1 pr-2 text-muted">{clockOf(m.scheduled_time)}</td>
                    <td className="pr-2 text-muted">{catLabel(m.category_id)}</td>
                    <td className="pr-2">{m.round_name}</td>
                    <td className="pr-2">{nameOf(teams, m.team_a_id)} vs {nameOf(teams, m.team_b_id)}</td>
                    <td className={m.status === "ongoing" ? "text-live" : "text-muted"}>{m.status === "scheduled" ? statusLabel[m.status] : `${m.team_a_score}-${m.team_b_score} ${statusLabel[m.status]}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-bold text-accent-2">สายการแข่งขัน {categories.length} ประเภท</h2>
        {games.map((g) => (
          <div key={g.id} className="mb-3">
            <div className="text-sm text-muted">{g.name}</div>
            <div className="flex flex-wrap gap-2">
              {categories.filter((c) => c.game_id === g.id).map((c) => {
                const n = matches.filter((m) => m.category_id === c.id).length;
                return (
                  <Link key={c.id} href={`/bracket/${c.code}`} className="rounded bg-surface px-3 py-1 text-sm hover:text-accent">
                    {shortCategoryName(c.name, g.name)} <span className="text-xs text-muted">{n ? `${n} แมตช์` : "รอจัดสาย"}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-bold text-accent-2">ตารางเหรียญ</h2>
        {medals.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีประเภทที่แข่งจบ</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr><th className="py-1 text-left">#</th><th className="text-left">อปท.</th><th className="text-center">🥇</th><th className="text-center">🥈</th><th className="text-center">🥉</th><th className="text-center">รวม</th></tr>
              </thead>
              <tbody>
                {medals.map((r, i) => (
                  <tr key={r.key} className="border-t border-white/5">
                    <td className="py-1">{i + 1}</td><td>{r.name}</td>
                    <td className="text-center font-bold text-accent-2">{r.gold}</td><td className="text-center">{r.silver}</td><td className="text-center">{r.bronze}</td><td className="text-center">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="text-xs text-muted">ข้อมูลอัปเดตทุก 20 วินาที</p>
    </div>
  );
}

type Category = Awaited<ReturnType<typeof data.getCategories>>[number];
