import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { LiveRefresh } from "@/components/studio/LiveRefresh";
import { SponsorTicker } from "@/components/studio/SponsorTicker";
import { nameOf, shortCategoryName, sponsorsAt } from "@/lib/view";
import { KrasaLogo, Seal } from "@/components/brand/Brand";

export const dynamic = "force-dynamic";

// หน้าสาธารณะบนจอกลาง (ใช้ Realtime ได้ตามใบงาน): อ่านเฉพาะข้อมูลแมตช์ · ไม่รับ CHANNEL_KEY · แสดงทุกประเภทของเกม
export default async function DisplayPage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const g = (await data.getGames()).find((x) => x.code === game);
  if (!g) notFound();
  const [categories, stations, matches, teams, sponsors] = await Promise.all([
    data.getCategories(g.id),
    data.getStations(g.id),
    data.getMatches(g.id),
    data.getTeams(g.id),
    data.getSponsors(),
  ]);
  const catLabel = (id: string) => shortCategoryName(categories.find((c) => c.id === id)?.name ?? "", g.name);
  const vs = (m?: (typeof matches)[number]) => (m ? `${nameOf(teams, m.team_a_id)} vs ${nameOf(teams, m.team_b_id)}` : "-");
  const latest = matches
    .filter((m) => m.status === "certified")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);
  const cols = stations.length > 4 ? "grid-cols-4" : stations.length > 1 ? "grid-cols-2" : "grid-cols-1";
  return (
    <>
      <style>{"header,footer{display:none}main{max-width:none;padding:0}"}</style>
      <LiveRefresh />
      <div className="flex min-h-screen flex-col gap-4 p-8" style={{ minHeight: 1080, width: "100%" }}>
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <KrasaLogo variant="white" width={280} priority />
            <h1 className="text-4xl font-black">
              <span className="text-accent">{g.name}</span> · บอร์ดสถานี
            </h1>
          </div>
          <Seal size={80} priority />
        </div>
        <div className={`grid flex-1 gap-4 ${cols}`}>
          {stations.map((s) => {
            const mine = matches.filter((m) => m.station_id === s.id);
            const now = mine.find((m) => m.status === "ongoing");
            const next = mine
              .filter((m) => m.status === "scheduled")
              .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""))[0];
            return (
              <div key={s.id} className="flex flex-col justify-between rounded-xl bg-surface p-5">
                <div className="text-2xl font-bold text-accent">{s.name}</div>
                {now ? (
                  <div>
                    <div className="text-sm text-live">● กำลังแข่ง · {catLabel(now.category_id)} · {now.round_name}</div>
                    <div className="text-2xl font-bold">{vs(now)}</div>
                    <div className="text-5xl font-black text-accent-2">{now.team_a_score} - {now.team_b_score}</div>
                  </div>
                ) : (
                  <div className="text-2xl text-muted">ว่าง</div>
                )}
                <div className="text-lg text-muted">ถัดไป: {next ? `${catLabel(next.category_id)} · ${vs(next)}` : "-"}</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-6 rounded-xl bg-surface/70 px-6 py-3">
          <div className="text-lg">
            <span className="mr-3 text-muted">ผลล่าสุด</span>
            {latest.length === 0 && <span className="text-muted">-</span>}
            {latest.map((m) => (
              <span key={m.id} className="mr-6">
                <span className="text-xs text-muted">{catLabel(m.category_id)} </span>
                {nameOf(teams, m.team_a_id)} <b className="text-accent">{m.team_a_score}-{m.team_b_score}</b> {nameOf(teams, m.team_b_id)}
              </span>
            ))}
          </div>
          <SponsorTicker sponsors={sponsorsAt(sponsors, "bottom_ticker")} />
        </div>
      </div>
    </>
  );
}
