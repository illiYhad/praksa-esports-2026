import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Sheet } from "@/components/print/Sheet";
import { computeMedals, computeStandings } from "@/lib/bracket/standings";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";
import { formatLabel, singleEntryLabel, statusLabel, timeOf } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function PrintResultsPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: id } = await params;
  const categories = await data.getCategories();
  const category = categories.find((c) => c.id === id || c.code === id);
  if (!category) notFound();
  const [games, matches, teams, players, settings] = await Promise.all([
    data.getGames(),
    data.getMatches(category.game_id),
    data.getTeams(category.game_id),
    data.getPlayers(category.game_id),
    data.getCategorySettings(),
  ]);
  const game = games.find((g) => g.id === category.game_id);
  const setting = settings.find((s) => s.category_id === category.id) ?? DEFAULT_SETTING(category.id);
  const ms = matches.filter((m) => m.category_id === category.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const ts = teams.filter((t) => t.category_id === category.id);
  const nm = (tid?: string) => ts.find((t) => t.id === tid)?.name ?? "—";
  const medals = computeMedals(setting, ms, ts.map((t) => t.id));
  const cell = "border border-black px-1 py-0.5";
  const groupNames = [...new Set(ms.filter((m) => m.stage === "group").map((m) => m.group_name ?? ""))];
  const members = (tid?: string) => players.filter((p) => p.team_id === tid).sort((a, b) => (a.order_in_team ?? 0) - (b.order_in_team ?? 0)).map((p) => p.real_name ?? p.in_game_name).join(", ");

  return (
    <Sheet title={`สรุปผลการแข่งขัน · ${category.name}`} subtitle={`${game?.name ?? ""} · ${formatLabel[setting.format]} · ${ts.length} ทีม/คน`}>
      {setting.single_entry !== "pending" && <p className="mb-2 text-[11pt]">หมายเหตุ: {singleEntryLabel[setting.single_entry]}</p>}

      <section className="mb-4">
        <h2 className="text-[12pt] font-bold">ผลรางวัล {medals.complete ? "" : "(ยังไม่สิ้นสุด)"}</h2>
        <table className="w-full border-collapse text-[10pt]">
          <tbody>
            {[
              ["เหรียญทอง", medals.gold ? [medals.gold] : []],
              ["เหรียญเงิน", medals.silver ? [medals.silver] : []],
              ["เหรียญทองแดง", medals.bronze],
            ].map(([label, ids]) => (
              <tr key={label as string}>
                <td className={`${cell} w-28 font-bold`}>{label as string}</td>
                <td className={cell}>
                  {(ids as string[]).length === 0 ? "—" : (ids as string[]).map((tid) => (
                    <div key={tid}><b>{nm(tid)}</b>{members(tid) ? <span className="text-[9pt]"> — {members(tid)}</span> : null}</div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {groupNames.map((g) => {
        const gm = ms.filter((m) => (m.group_name ?? "") === g);
        const ids = [...new Set(gm.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((x): x is string => !!x))];
        const rows = computeStandings(ids, gm, setting.seed_order);
        return (
          <section key={g || "rr"} className="mb-3 break-inside-avoid">
            <h3 className="text-[11pt] font-bold">ตารางคะแนน {g || "พบกันหมด"}</h3>
            <table className="w-full border-collapse text-[9pt]">
              <thead><tr>{["#", "ทีม", "แข่ง", "ชนะ", "แพ้", "+/−"].map((h) => <th key={h} className={`${cell} text-left`}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.team_id}>
                    <td className={cell}>{r.rank}</td><td className={cell}>{nm(r.team_id)}</td>
                    <td className={`${cell} text-center`}>{r.played}</td><td className={`${cell} text-center`}>{r.wins}</td>
                    <td className={`${cell} text-center`}>{r.losses}</td><td className={`${cell} text-center`}>{r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section>
        <h2 className="text-[12pt] font-bold">ผลทุกแมตช์</h2>
        <table className="w-full border-collapse text-[9pt]">
          <thead><tr>{["รอบ", "ฝ่าย A", "ผล", "ฝ่าย B", "ผู้ชนะ", "เวลา", "สถานะ"].map((h) => <th key={h} className={`${cell} text-left`}>{h}</th>)}</tr></thead>
          <tbody>
            {ms.map((m) => (
              <tr key={m.id}>
                <td className={cell}>{m.round_name}</td>
                <td className={cell}>{nm(m.team_a_id)}</td>
                <td className={`${cell} text-center whitespace-nowrap`}>{m.status === "scheduled" ? "vs" : `${m.team_a_score} - ${m.team_b_score}`}</td>
                <td className={cell}>{nm(m.team_b_id)}</td>
                <td className={cell}>{m.winner_id ? nm(m.winner_id) : ""}</td>
                <td className={cell}>{m.scheduled_time ? timeOf(m.scheduled_time) : ""}</td>
                <td className={cell}>{statusLabel[m.status]}</td>
              </tr>
            ))}
            {ms.length === 0 && <tr><td className={cell} colSpan={7}>ยังไม่ได้จัดสาย</td></tr>}
          </tbody>
        </table>
      </section>
    </Sheet>
  );
}
