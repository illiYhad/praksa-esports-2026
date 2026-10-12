import React from "react";
import type { StandingRow } from "@/lib/bracket/standings";

export function StandingsTable({ rows, nameOf, advance }: { rows: StandingRow[]; nameOf: (id?: string) => string; advance?: number }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted">
        <tr>
          <th className="py-1 text-left">#</th>
          <th className="text-left">ทีม</th>
          <th className="text-center">แข่ง</th>
          <th className="text-center">ชนะ</th>
          <th className="text-center">แพ้</th>
          <th className="text-center">+/−</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.team_id} className={`border-t border-white/5 ${advance && r.rank <= advance ? "text-accent" : ""}`}>
            <td className="py-1">{r.rank}</td>
            <td className="truncate">{nameOf(r.team_id)}</td>
            <td className="text-center">{r.played}</td>
            <td className="text-center font-bold">{r.wins}</td>
            <td className="text-center">{r.losses}</td>
            <td className="text-center">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
