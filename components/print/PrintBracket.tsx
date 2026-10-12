import React from "react";
import type { CategorySetting, Match, Team } from "@/lib/types";
import { computeStandings } from "@/lib/bracket/standings";

// สายแข่งสำหรับพิมพ์ (ขาวดำ · เส้นขอบ) — ไม่ใช้สีธีม
export function PrintBracket({ matches, teams, setting }: { matches: Match[]; teams: Team[]; setting?: CategorySetting }) {
  const nm = (id?: string) => teams.find((t) => t.id === id)?.short_name ?? teams.find((t) => t.id === id)?.name ?? "—";
  if (!matches.length) return <p className="text-[11pt]">ยังไม่ได้จัดสาย</p>;
  const sorted = [...matches].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const group = sorted.filter((m) => m.stage === "group");
  const winners = sorted.filter((m) => !m.stage || m.stage === "winners");
  const losers = sorted.filter((m) => m.stage === "losers");
  const extra = sorted.filter((m) => m.stage === "third" || m.stage === "final");

  const Card = ({ m }: { m: Match }) => (
    <div className="mb-2 border border-black text-[9pt]">
      {[[m.team_a_id, m.team_a_score], [m.team_b_id, m.team_b_score]].map(([id, score], i) => (
        <div key={i} className={`flex justify-between px-1 ${i === 0 ? "border-b border-black" : ""} ${m.winner_id && m.winner_id === id ? "font-bold" : ""}`}>
          <span className="truncate">{nm(id as string | undefined)}</span>
          <span className="pl-2">{m.status === "scheduled" ? "" : score}</span>
        </div>
      ))}
      <div className="px-1 text-[7pt] text-gray-600">BO{m.best_of}{m.scheduled_time ? ` · ${new Date(m.scheduled_time).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}</div>
    </div>
  );

  const Columns = ({ ms }: { ms: Match[] }) => {
    const rounds = [...new Set(ms.map((m) => m.round_no ?? 0))].sort((a, b) => a - b);
    return (
      <div className="flex gap-3">
        {rounds.map((r) => {
          const col = ms.filter((m) => (m.round_no ?? 0) === r);
          return (
            <div key={r} className="flex min-w-[38mm] flex-1 flex-col justify-around">
              <div className="mb-1 text-center text-[9pt] font-bold">{col[0].round_name}</div>
              {col.map((m) => <Card key={m.id} m={m} />)}
            </div>
          );
        })}
        {extra.length > 0 && ms === winners && (
          <div className="flex min-w-[38mm] flex-1 flex-col justify-around">
            {extra.map((m) => (
              <div key={m.id}>
                <div className="mb-1 text-center text-[9pt] font-bold">{m.round_name}</div>
                <Card m={m} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const groupNames = [...new Set(group.map((m) => m.group_name ?? ""))];
  return (
    <div className="space-y-4">
      {groupNames.map((g) => {
        const ms = group.filter((m) => (m.group_name ?? "") === g);
        const ids = [...new Set(ms.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((x): x is string => !!x))];
        const rows = computeStandings(ids, ms, setting?.seed_order ?? []);
        return (
          <section key={g || "rr"} className="break-inside-avoid">
            <h3 className="text-[11pt] font-bold">{g || "พบกันหมด"}</h3>
            <table className="w-full border-collapse text-[9pt]">
              <thead><tr>{["#", "ทีม", "แข่ง", "ชนะ", "แพ้", "+/−"].map((h) => <th key={h} className="border border-black px-1 text-left">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.team_id}>
                    <td className="border border-black px-1">{r.rank}</td><td className="border border-black px-1">{nm(r.team_id)}</td>
                    <td className="border border-black px-1 text-center">{r.played}</td><td className="border border-black px-1 text-center">{r.wins}</td>
                    <td className="border border-black px-1 text-center">{r.losses}</td><td className="border border-black px-1 text-center">{r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-1 grid grid-cols-3 gap-x-3">
              {ms.map((m) => (
                <div key={m.id} className="text-[8pt]">{m.round_name}: {nm(m.team_a_id)} {m.status === "scheduled" ? "vs" : `${m.team_a_score}-${m.team_b_score}`} {nm(m.team_b_id)}</div>
              ))}
            </div>
          </section>
        );
      })}
      {winners.length > 0 && (
        <section>
          {losers.length > 0 && <h3 className="text-[11pt] font-bold">สายบน</h3>}
          <Columns ms={winners} />
        </section>
      )}
      {losers.length > 0 && (
        <section>
          <h3 className="text-[11pt] font-bold">สายล่าง</h3>
          <Columns ms={losers} />
        </section>
      )}
    </div>
  );
}
