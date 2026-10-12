import React from "react";
import type { CategorySetting, Match, Team } from "@/lib/types";
import { computeStandings } from "@/lib/bracket/standings";
import { statusLabel } from "@/lib/view";
import { StandingsTable } from "./StandingsTable";

// แสดงสายทุกรูปแบบจาก Match[] ของประเภทเดียว (ไม่มี hook — ใช้ได้ทั้ง server/client)
type Props = {
  matches: Match[];
  teams: Team[];
  setting?: CategorySetting;
  compact?: boolean;
  highlightId?: string;
  /** เน้นทุกแมตช์ที่ทีมนี้อยู่ (หน้าทีม) */
  highlightTeamId?: string;
};

export function BracketView({ matches, teams, setting, compact, highlightId, highlightTeamId }: Props) {
  const nm = (id?: string) => teams.find((t) => t.id === id)?.short_name ?? teams.find((t) => t.id === id)?.name ?? "รอผลคู่ก่อนหน้า";
  if (!matches.length) return <p className="text-sm text-muted">ยังไม่ได้จัดสาย</p>;

  const sorted = [...matches].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const group = sorted.filter((m) => m.stage === "group");
  const winners = sorted.filter((m) => !m.stage || m.stage === "winners");
  const losers = sorted.filter((m) => m.stage === "losers");
  const finals = sorted.filter((m) => m.stage === "final");
  const third = sorted.filter((m) => m.stage === "third");

  const Card = ({ m }: { m: Match }) => {
    const row = (id: string | undefined, score: number) => (
      <div className={`flex justify-between gap-2 ${m.winner_id && m.winner_id === id ? "font-bold text-accent" : ""}`}>
        <span className="truncate">{nm(id)}</span>
        <span>{score}</span>
      </div>
    );
    return (
      <div
        className={`relative rounded bg-surface p-2 text-sm ${m.status === "ongoing" ? "ring-1 ring-live" : ""} ${
          m.id === highlightId || (highlightTeamId && (m.team_a_id === highlightTeamId || m.team_b_id === highlightTeamId)) ? "ring-2 ring-accent-2" : ""
        }`}
      >
        {m.status === "ongoing" && (
          <span className="absolute -top-2 right-2 rounded bg-live px-1.5 text-[10px] font-bold text-white">LIVE</span>
        )}
        {row(m.team_a_id, m.team_a_score)}
        {row(m.team_b_id, m.team_b_score)}
        {!compact && (
          <div className="mt-1 text-[10px] text-muted">
            BO{m.best_of} · {statusLabel[m.status]}
          </div>
        )}
      </div>
    );
  };

  const Columns = ({ ms, extra }: { ms: Match[]; extra?: { title: string; ms: Match[] }[] }) => {
    const roundNos = [...new Set(ms.map((m) => m.round_no ?? 0))].sort((a, b) => a - b);
    return (
      <div className="flex gap-6 overflow-x-auto pb-2">
        {roundNos.map((r) => {
          const col = ms.filter((m) => (m.round_no ?? 0) === r);
          return (
            <div key={r} className="min-w-52 space-y-3">
              <h3 className="text-xs text-muted">{col[0].round_name}</h3>
              {col.map((m) => <Card key={m.id} m={m} />)}
            </div>
          );
        })}
        {extra?.map((e) => e.ms.length > 0 && (
          <div key={e.title} className="min-w-52 space-y-3">
            <h3 className="text-xs text-muted">{e.title}</h3>
            {e.ms.map((m) => <Card key={m.id} m={m} />)}
          </div>
        ))}
      </div>
    );
  };

  const groupNames = [...new Set(group.map((m) => m.group_name ?? ""))];

  return (
    <div className="space-y-6">
      {group.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {groupNames.map((g) => {
            const ms = group.filter((m) => (m.group_name ?? "") === g);
            const ids = [...new Set(ms.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((x): x is string => !!x))];
            const rows = computeStandings(ids, ms, setting?.seed_order ?? []);
            return (
              <section key={g || "rr"} className="space-y-2 rounded bg-surface/40 p-3">
                <h3 className="font-bold text-accent-2">{g || "พบกันหมด"}</h3>
                <StandingsTable rows={rows} nameOf={nm} advance={setting?.format === "groups" ? setting.advance_per_group : undefined} />
                <p className="text-[10px] text-muted">นับเฉพาะแมตช์ที่รับรองผลแล้ว</p>
                {!compact && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {ms.map((m) => (
                      <div key={m.id}>
                        <div className="text-[10px] text-muted">{m.round_name}</div>
                        <Card m={m} />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {winners.length > 0 && (
        <section>
          {losers.length > 0 && <h3 className="mb-2 font-bold text-accent-2">สายบน</h3>}
          <Columns ms={winners} extra={[{ title: "ชิงอันดับ 3", ms: third }, { title: "Grand Final", ms: finals }]} />
        </section>
      )}
      {losers.length > 0 && (
        <section>
          <h3 className="mb-2 font-bold text-accent-2">สายล่าง</h3>
          <Columns ms={losers} />
        </section>
      )}
    </div>
  );
}
