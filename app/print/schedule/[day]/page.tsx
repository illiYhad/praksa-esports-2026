import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Sheet } from "@/components/print/Sheet";
import { clockOf, dayKeyOf, shortCategoryName, statusLabel, thaiDate } from "@/lib/view";

export const dynamic = "force-dynamic";

// ตารางแข่งรายวัน แยกสถานี · day = 1–4 (ตามวันแข่งในตั้งค่างาน) หรือ YYYY-MM-DD
export default async function PrintSchedulePage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const config = await data.getEventConfig();
  const dayKey = /^\d+$/.test(day) ? config.days[Number(day) - 1] : day;
  if (!dayKey) notFound();
  const [games, categories, stations, matches, teams] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getStations(),
    data.getMatches(),
    data.getTeams(),
  ]);
  const nm = (id?: string) => teams.find((t) => t.id === id)?.short_name ?? teams.find((t) => t.id === id)?.name ?? "รอผล";
  const todays = matches.filter((m) => dayKeyOf(m.scheduled_time) === dayKey);
  const cell = "border border-black px-1 py-0.5";
  const dayNo = config.days.indexOf(dayKey) + 1;

  return (
    <Sheet title={`ตารางการแข่งขัน${dayNo ? ` วันที่ ${dayNo}` : ""}`} subtitle={thaiDate(dayKey)}>
      <div className="no-print mb-2 flex gap-2 text-[9pt]">
        {config.days.map((d, i) => (
          <Link key={d} href={`/print/schedule/${i + 1}`} className={`rounded border border-black px-2 ${d === dayKey ? "bg-black text-white" : ""}`}>วันที่ {i + 1}</Link>
        ))}
      </div>
      {todays.length === 0 && <p className="text-[11pt]">ยังไม่มีแมตช์ที่กำหนดเวลาในวันนี้ (กำหนดสถานี/เวลาได้ที่ แอดมิน → ตาราง/สถานี)</p>}
      {games.map((g) => {
        const catIds = new Set(categories.filter((c) => c.game_id === g.id).map((c) => c.id));
        const gm = todays.filter((m) => catIds.has(m.category_id));
        if (!gm.length) return null;
        const sts = stations.filter((s) => s.game_id === g.id);
        return (
          <section key={g.id} className="mb-4 break-inside-avoid">
            <h2 className="mb-1 text-[12pt] font-bold">{g.name}</h2>
            {[...sts, undefined].map((s) => {
              const rows = gm.filter((m) => (s ? m.station_id === s.id : !m.station_id)).sort((x, y) => (x.scheduled_time ?? "").localeCompare(y.scheduled_time ?? ""));
              if (!rows.length) return null;
              return (
                <div key={s?.id ?? "none"} className="mb-2">
                  <div className="text-[10pt] font-bold">{s?.name ?? "ยังไม่ระบุสถานี"}</div>
                  <table className="w-full border-collapse text-[9pt]">
                    <thead><tr>{["เวลา", "ประเภท", "รอบ", "คู่แข่งขัน", "BO", "สถานะ"].map((h) => <th key={h} className={`${cell} text-left`}>{h}</th>)}</tr></thead>
                    <tbody>
                      {rows.map((m) => (
                        <tr key={m.id}>
                          <td className={cell}>{clockOf(m.scheduled_time)}</td>
                          <td className={cell}>{shortCategoryName(categories.find((c) => c.id === m.category_id)?.name ?? "", g.name)}</td>
                          <td className={cell}>{m.round_name}</td>
                          <td className={cell}>{nm(m.team_a_id)} vs {nm(m.team_b_id)}</td>
                          <td className={cell}>{m.best_of}</td>
                          <td className={cell}>{m.status === "scheduled" ? "" : `${statusLabel[m.status]} ${m.team_a_score}-${m.team_b_score}`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        );
      })}
    </Sheet>
  );
}
