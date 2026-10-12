"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Game, Player, Team } from "@/lib/types";
import { notifyDataChanged } from "@/lib/data/live";
import { setCheckInAction } from "@/app/checkin/actions";

type Props = { games: Game[]; categories: Category[]; teams: Team[]; players: Player[] };

export function CheckinClient({ games, categories, teams, players }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const needle = q.trim().toLowerCase();

  const gameOf = (t: Team) => categories.find((c) => c.id === t.category_id)?.game_id;
  const matches = (t: Team) =>
    !needle ||
    t.name.toLowerCase().includes(needle) ||
    players.some(
      (p) => p.team_id === t.id && (p.in_game_name.toLowerCase().includes(needle) || (p.real_name ?? "").toLowerCase().includes(needle)),
    );

  const toggle = async (t: Team) => {
    setError(null);
    const res = await setCheckInAction(t.id, !t.is_checked_in);
    if (!res.ok) return setError(res.error ?? "เกิดข้อผิดพลาด");
    notifyDataChanged();
    router.refresh();
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <input
        className="w-full rounded bg-surface p-2"
        placeholder="ค้นชื่อทีม / ผู้เล่น"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="text-sm text-live" role="status">{error}</p>}
      {games.map((g) => {
        const all = teams.filter((t) => gameOf(t) === g.id);
        const here = all.filter((t) => t.is_checked_in).length;
        return (
          <section key={g.id}>
            <h2 className="mb-1 font-bold text-accent-2">
              {g.name} <span className="text-sm font-normal text-muted">มาแล้ว {here} / ทั้งหมด {all.length}</span>
            </h2>
            <ul className="space-y-1">
              {all.filter(matches).map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => toggle(t)}
                    className="flex w-full min-w-0 items-center gap-2 rounded bg-surface p-2 text-left text-sm"
                    aria-pressed={t.is_checked_in}
                  >
                    <span>{t.is_checked_in ? "✅" : "⬜"}</span>
                    <span className="truncate">{t.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
