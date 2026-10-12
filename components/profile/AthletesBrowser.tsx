"use client";

import React, { useState } from "react";
import type { Category, Game, Player, Team } from "@/lib/types";
import { athleteName } from "@/lib/people";
import { AthleteCard } from "./AthleteCard";

export type AthleteItem = {
  player: Player;
  photo?: string;
  teamIds: string[];
  teamLabel: string;
  categoryIds: string[];
  categoryLabel: string;
  gameIds: string[];
  position?: string;
};

export function AthletesBrowser({ items, games, categories, teams }: { items: AthleteItem[]; games: Game[]; categories: Category[]; teams: Team[] }) {
  const [game, setGame] = useState("all");
  const [cat, setCat] = useState("all");
  const [org, setOrg] = useState("all");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const orgs = [...new Map(teams.filter((t) => t.team_code).map((t) => [t.team_code!, t.short_name ?? t.name])).entries()];

  const list = items.filter((it) => {
    if (game !== "all" && !it.gameIds.includes(game)) return false;
    if (cat !== "all" && !it.categoryIds.includes(cat)) return false;
    if (org !== "all" && !it.teamIds.some((id) => teams.find((t) => t.id === id)?.team_code === org)) return false;
    if (needle) {
      const hay = `${athleteName(it.player)} ${it.player.hide_real_name ? "" : it.player.real_name ?? ""} ${it.teamLabel} ${it.categoryLabel}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
  const sel = "min-w-0 rounded bg-surface p-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-4">
        <select className={sel} value={game} onChange={(e) => { setGame(e.target.value); setCat("all"); }}>
          <option value="all">ทุกเกม</option>
          {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">ทุกประเภท</option>
          {categories.filter((c) => game === "all" || c.game_id === game).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={sel} value={org} onChange={(e) => setOrg(e.target.value)}>
          <option value="all">ทุก อปท.</option>
          {orgs.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        <input className={sel} placeholder="ค้นชื่อ" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="text-xs text-muted">{list.length} คน</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {list.map((it) => (
          <AthleteCard key={it.player.id} player={it.player} photo={it.photo} team={it.teamLabel} category={it.categoryLabel} position={it.position} />
        ))}
      </div>
    </div>
  );
}
