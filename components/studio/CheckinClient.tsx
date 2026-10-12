"use client";

import React, { useState } from "react";
import type { Category, Game, Player, Team } from "@/lib/types";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { setCheckInAction } from "@/app/checkin/actions";

type Props = { games: Game[]; categories: Category[]; teams: Team[]; players: Player[] };

export function CheckinClient({ games, categories, teams, players }: Props) {
  const [q, setQ] = useState("");
  const [onlyCat, setOnlyCat] = useState("all");
  const { msg, act } = useAct();
  const needle = q.trim().toLowerCase();

  const matches = (t: Team) =>
    !needle ||
    t.name.toLowerCase().includes(needle) ||
    (t.short_name ?? "").toLowerCase().includes(needle) ||
    players.some(
      (p) => p.team_id === t.id && (p.in_game_name.toLowerCase().includes(needle) || (p.real_name ?? "").toLowerCase().includes(needle)),
    );

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className="min-w-0 flex-1 rounded bg-surface p-2" placeholder="ค้นชื่อทีม / ผู้เล่น" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="min-w-0 rounded bg-surface p-2" value={onlyCat} onChange={(e) => setOnlyCat(e.target.value)}>
          <option value="all">ทุกประเภท</option>
          {games.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {categories.filter((c) => c.game_id === g.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <MsgLine msg={msg} />
      {games.map((g) => (
        <div key={g.id} className="space-y-3">
          {categories.filter((c) => c.game_id === g.id && (onlyCat === "all" || c.id === onlyCat)).map((c) => {
            const all = teams.filter((t) => t.category_id === c.id);
            const here = all.filter((t) => t.is_checked_in).length;
            const shown = all.filter(matches);
            if (needle && shown.length === 0) return null;
            return (
              <section key={c.id}>
                <h2 className="mb-1 font-bold text-accent-2">
                  {c.name} <span className="text-sm font-normal text-muted">มาแล้ว {here} / ทั้งหมด {all.length}</span>
                </h2>
                <ul className="space-y-1">
                  {shown.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => act(() => setCheckInAction(t.id, !t.is_checked_in), t.is_checked_in ? `ยกเลิกเช็กอิน ${t.name}` : `เช็กอิน ${t.name} แล้ว`)}
                        className="flex w-full min-w-0 items-center gap-2 rounded bg-surface p-2 text-left text-sm"
                        aria-pressed={t.is_checked_in}
                      >
                        <span>{t.is_checked_in ? "✅" : "⬜"}</span>
                        <span className="truncate">{t.name}</span>
                        <span className="ml-auto text-xs text-muted">{players.filter((p) => p.team_id === t.id).length} คน</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}
