"use client";

import React, { useState } from "react";
import type { Category, Game, Match, MatchStatus, Station, Team } from "@/lib/types";
import { fromLocalInput, statusLabel, toLocalInput } from "@/lib/view";
import { btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { autoQueueAction, scheduleConflictsAction, updateScheduleAction } from "@/app/admin/actions";
import type { OverlapRow } from "@/lib/data/queue";

type Props = {
  games: Game[]; categories: Category[]; stations: Station[]; matches: Match[]; teams: Team[];
  /** ประเภทที่มีนักกีฬาซ้ำ (จำนวนเท่านั้น) */
  overlaps: OverlapRow[];
  /** matchId → "รอ: นักกีฬาซ้ำกับ …" */
  waitNotes: Record<string, string>;
};
const field = "min-w-0 rounded bg-bg p-2 text-sm";

export function ScheduleClient({ games, categories, stations, matches, teams, overlaps, waitNotes }: Props) {
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<MatchStatus | "all" | "ready">("ready");
  const { busy, msg, act } = useAct();

  const cats = categories.filter((c) => c.game_id === gameId);
  const catIds = new Set(cats.map((c) => c.id));
  const gameMatches = matches.filter((m) => catIds.has(m.category_id));
  const gameStations = stations.filter((s) => s.game_id === gameId);
  const nm = (id?: string) => teams.find((t) => t.id === id)?.short_name ?? teams.find((t) => t.id === id)?.name ?? "รอผล";
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const list = gameMatches
    .filter((m) => catFilter === "all" || m.category_id === catFilter)
    .filter((m) => statusFilter === "all" ? true : statusFilter === "ready" ? m.status === "scheduled" && !!m.team_a_id && !!m.team_b_id : m.status === statusFilter)
    .sort((a, b) => (a.round_no ?? 0) - (b.round_no ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select className={field} value={gameId} onChange={(e) => { setGameId(e.target.value); setCatFilter("all"); }}>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className={`${field} flex-1`} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">ทุกประเภท</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={field} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as MatchStatus | "all" | "ready")}>
          <option value="ready">พร้อมเล่น (ครบสองฝั่ง)</option>
          <option value="all">ทั้งหมด</option>
          {(Object.keys(statusLabel) as MatchStatus[]).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>
      </div>

      {overlaps.length > 0 && (
        <section className="space-y-1 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <h2 className="font-bold text-amber-300">ประเภทที่มีนักกีฬาซ้ำ</h2>
          <ul className="space-y-0.5">
            {overlaps.map((o) => <li key={`${o.a}|${o.b}`}>{o.a} ↔ {o.b}: {o.people} คน ({o.orgs} อปท.)</li>)}
          </ul>
          <p className="text-xs text-muted">จัดคิวอัตโนมัติจะไม่ลงแมตช์ที่มีนักกีฬาซ้ำกับแมตช์ที่กำลังแข่งหรือลงสถานีแล้ว</p>
        </section>
      )}

      <section className="space-y-2 rounded bg-surface/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-accent-2">สถานี</h2>
          <div className="flex gap-1 text-xs">
            {[1, 2, 3, 4].map((d) => <a key={d} href={`/print/schedule/${d}`} target="_blank" rel="noreferrer" className={btn}>🖨 วันที่ {d}</a>)}
          </div>
          <button className={`${btn} text-accent`} disabled={busy} onClick={() => act(() => autoQueueAction(gameId), (n) => `จัดคิวอัตโนมัติแล้ว ${n ?? 0} แมตช์`)}>
            ⚡ จัดคิวอัตโนมัติ (แมตช์ที่พร้อมเล่น → สถานีว่าง)
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {gameStations.map((s) => {
            const now = gameMatches.find((m) => m.station_id === s.id && m.status === "ongoing");
            const queued = gameMatches.filter((m) => m.station_id === s.id && m.status === "scheduled");
            return (
              <div key={s.id} className="rounded bg-bg/60 p-2 text-xs">
                <div className="font-bold text-accent">{s.name}</div>
                {now ? <div className="text-live">● {nm(now.team_a_id)} vs {nm(now.team_b_id)}</div> : <div className="text-muted">{queued.length ? `รอเริ่ม ${queued.length}` : "ว่าง"}</div>}
                {queued.slice(0, 2).map((m) => <div key={m.id} className="truncate text-muted">↳ {nm(m.team_a_id)} vs {nm(m.team_b_id)}</div>)}
              </div>
            );
          })}
        </div>
        <MsgLine msg={msg} />
      </section>

      <ul className="space-y-1">
        {list.map((m) => <Row key={m.id} m={m} stations={gameStations} nm={nm} catName={catName(m.category_id)} wait={waitNotes[m.id]} />)}
        {list.length === 0 && <li className="text-sm text-muted">ไม่มีแมตช์ตามตัวกรอง</li>}
      </ul>
    </div>
  );
}

function Row({ m, stations, nm, catName, wait }: { m: Match; stations: Station[]; nm: (id?: string) => string; catName: string; wait?: string }) {
  const [station, setStation] = useState(m.station_id ?? "");
  const [time, setTime] = useState(toLocalInput(m.scheduled_time));
  const [bo, setBo] = useState(m.best_of);
  const [clash, setClash] = useState<string[]>([]);
  const { busy, msg, setMsg, act } = useAct();
  const started = m.status !== "scheduled" || m.game_scores.length > 0;
  const patch = () => ({ station_id: station || null, scheduled_time: fromLocalInput(time), ...(started ? {} : { best_of: bo }) });
  const save = () => act(() => updateScheduleAction(m.id, patch()), "บันทึกแล้ว").then(() => setClash([]));
  // นักกีฬาซ้ำ = เตือนแล้วให้ยืนยัน (ไม่บล็อก — หน้างานอาจจำเป็น)
  const trySave = async () => {
    const res = await scheduleConflictsAction(m.id, patch());
    if (!res.ok) return setMsg({ ok: false, text: res.error });
    if (res.data?.length) return setClash(res.data);
    await save();
  };
  return (
    <li className="rounded bg-surface p-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">{catName} · {m.round_name}</span>
        <span className={m.status === "ongoing" ? "text-live" : "text-muted"}>· {statusLabel[m.status]}</span>
        {wait && <span className="rounded bg-amber-500/20 px-1.5 text-xs text-amber-300">{wait}</span>}
      </div>
      <div className="font-bold">{nm(m.team_a_id)} vs {nm(m.team_b_id)}</div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select className="rounded bg-bg p-1" value={station} onChange={(e) => setStation(e.target.value)} aria-label="สถานี">
          <option value="">— ไม่ระบุสถานี —</option>
          {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="datetime-local" className="rounded bg-bg p-1" value={time} onChange={(e) => setTime(e.target.value)} aria-label="เวลา" />
        <select className="rounded bg-bg p-1" value={bo} disabled={started} onChange={(e) => setBo(Number(e.target.value))} aria-label="BO">
          {[1, 3, 5, 7].map((n) => <option key={n} value={n}>BO{n}</option>)}
        </select>
        <button className={btn} disabled={busy} onClick={trySave}>
          บันทึก
        </button>
        <a href={`/print/result-sheet/${m.id}`} target="_blank" rel="noreferrer" className={btn}>🖨 ใบบันทึกผล</a>
      </div>
      {clash.length > 0 && (
        <div className="mt-2 space-y-1 rounded border border-amber-500/50 bg-amber-500/15 p-2 text-amber-200" role="alert">
          {clash.map((c) => <div key={c}>⚠ แมตช์นี้มีนักกีฬาซ้ำกับแมตช์ {c} ที่เวลาเดียวกัน</div>)}
          <div className="flex gap-2">
            <button className={`${btn} text-amber-300`} disabled={busy} onClick={save}>ยืนยันบันทึก</button>
            <button className={btn} disabled={busy} onClick={() => setClash([])}>ยกเลิก</button>
          </div>
        </div>
      )}
      <MsgLine msg={msg} />
    </li>
  );
}
