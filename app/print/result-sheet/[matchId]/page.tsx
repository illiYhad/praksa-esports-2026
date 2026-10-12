import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { Sheet } from "@/components/print/Sheet";
import { usesGoalsDirect } from "@/lib/match-logic";
import { clockOf, dayKeyOf, thaiDate } from "@/lib/view";

export const dynamic = "force-dynamic";

// ใบบันทึกผลการแข่งขัน (เอกสารภายในห้องผล — แสดงชื่อจริงเพื่อให้กรรมการตรวจตัวได้)
export default async function ResultSheetPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const matches = await data.getMatches();
  const match = matches.find((m) => m.id === matchId);
  if (!match) notFound();
  const [games, categories, stations, teams, players] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getStations(),
    data.getTeams(),
    data.getPlayers(),
  ]);
  const category = categories.find((c) => c.id === match.category_id);
  const game = games.find((g) => g.id === category?.game_id);
  const station = stations.find((s) => s.id === match.station_id);
  const a = teams.find((t) => t.id === match.team_a_id);
  const b = teams.find((t) => t.id === match.team_b_id);
  const roster = (teamId?: string) => players.filter((p) => p.team_id === teamId).sort((x, y) => (x.order_in_team ?? 0) - (y.order_in_team ?? 0));
  const direct = usesGoalsDirect(game?.code ?? "", match.best_of);
  const rows = direct ? 1 : match.best_of;
  const cell = "border border-black px-2 py-1 align-top";

  const Side = ({ label, team }: { label: string; team?: typeof a }) => (
    <div className="flex-1 border border-black p-2">
      <div className="text-[9pt] text-gray-600">{label}</div>
      <div className="text-[13pt] font-bold">{team?.name ?? "____________________"}</div>
      <ol className="mt-1 list-decimal pl-5 text-[10pt]">
        {roster(team?.id).map((p) => (
          <li key={p.id}>
            {p.real_name ?? p.in_game_name}
            {p.in_game_name && p.real_name ? ` (${p.in_game_name})` : ""}
            {p.is_captain ? " · กัปตัน" : ""}
          </li>
        ))}
        {roster(team?.id).length === 0 && <li className="list-none text-gray-500">—</li>}
      </ol>
    </div>
  );

  return (
    <Sheet title="ใบบันทึกผลการแข่งขัน" subtitle={`${category?.name ?? ""} · ${game?.name ?? ""}`}>
      <table className="mb-3 w-full text-[10pt]">
        <tbody>
          <tr>
            <td className={cell}><b>{match.round_name}</b>{match.group_name ? ` (${match.group_name})` : ""}</td>
            <td className={cell}><b>รูปแบบ</b> BO{match.best_of}</td>
            <td className={cell}><b>สถานี</b> {station?.name ?? "________"}</td>
            <td className={cell}><b>เวลา</b> {match.scheduled_time ? `${thaiDate(dayKeyOf(match.scheduled_time))} ${clockOf(match.scheduled_time)}` : "____/____/______ ____:____"}</td>
          </tr>
        </tbody>
      </table>

      <div className="mb-3 flex gap-3">
        <Side label="ฝ่าย A" team={a} />
        <div className="flex items-center text-[14pt] font-bold">VS</div>
        <Side label="ฝ่าย B" team={b} />
      </div>

      <table className="mb-3 w-full border-collapse text-[11pt]">
        <thead>
          <tr>
            <th className={`${cell} w-24`}>{direct ? "ประตู" : "เกมที่"}</th>
            <th className={cell}>{a?.short_name ?? "ฝ่าย A"}</th>
            <th className={cell}>{b?.short_name ?? "ฝ่าย B"}</th>
            <th className={`${cell} w-40`}>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className="h-10">
              <td className={`${cell} text-center`}>{direct ? "" : i + 1}</td>
              <td className={cell}>{match.game_scores[i] ? match.game_scores[i].a : ""}</td>
              <td className={cell}>{match.game_scores[i] ? match.game_scores[i].b : ""}</td>
              <td className={cell}></td>
            </tr>
          ))}
          <tr className="h-10 font-bold">
            <td className={`${cell} text-center`}>รวม</td>
            <td className={cell}>{match.status === "scheduled" ? "" : match.team_a_score}</td>
            <td className={cell}>{match.status === "scheduled" ? "" : match.team_b_score}</td>
            <td className={cell}></td>
          </tr>
        </tbody>
      </table>

      <div className="mb-6 text-[12pt]">
        <b>ผู้ชนะ:</b> {match.winner_id ? teams.find((t) => t.id === match.winner_id)?.name : "______________________________________"}
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-10 text-[10pt]">
        {["กรรมการ", "ตัวแทนฝ่าย A", "ตัวแทนฝ่าย B", "ผู้รับรองผล"].map((who) => (
          <div key={who}>
            <div className="border-b border-black pt-10"></div>
            <div className="mt-1">ลงชื่อ ............................................. {who}</div>
            <div className="text-gray-600">( ............................................... )</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-[8pt] text-gray-500">รหัสแมตช์ {match.id}</div>
    </Sheet>
  );
}
