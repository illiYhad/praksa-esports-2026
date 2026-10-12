"use client";

import React, { useState } from "react";
import type { Category, Game, Player, Team } from "@/lib/types";
import { ConfirmButton, btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import {
  createPlayerAction,
  createTeamAction,
  deletePlayerAction,
  deleteTeamAction,
  updatePlayerAction,
  updateTeamAction,
} from "@/app/admin/actions";

type Props = { games: Game[]; categories: Category[]; teams: Team[]; players: Player[]; inBracket: string[] };

const field = "min-w-0 rounded bg-bg p-2 text-sm";
const POSITION_HINT: Record<string, string> = { rov: "เลน (เช่น Mid · Jungle)", sf6: "ตัวละครหลัก", efootball: "ทีมที่ใช้" };

export function TeamsClient({ games, categories, teams, players, inBracket }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [open, setOpen] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const { busy, msg, act } = useAct();

  const category = categories.find((c) => c.id === categoryId);
  const game = games.find((g) => g.id === category?.game_id);
  const needle = q.trim().toLowerCase();
  const list = teams
    .filter((t) => t.category_id === categoryId)
    .filter((t) => !needle || t.name.toLowerCase().includes(needle) || players.some((p) => p.team_id === t.id && `${p.real_name ?? ""} ${p.in_game_name}`.toLowerCase().includes(needle)));
  const locked = new Set(inBracket);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className={`${field} flex-1`} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setOpen(null); }}>
          {games.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {categories.filter((c) => c.game_id === g.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <input className={`${field} flex-1`} placeholder="ค้นชื่อทีม / นักกีฬา" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded bg-surface/60 p-2">
        <label className="flex flex-col text-xs text-muted">
          เพิ่มทีม/นักกีฬาใหม่ในประเภทนี้
          <input className={field} placeholder="ชื่อ อปท. / ชื่อทีม" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </label>
        <label className="flex flex-col text-xs text-muted">
          รหัส อปท. (เช่น T20)
          <input className={`${field} w-24`} value={newCode} onChange={(e) => setNewCode(e.target.value)} />
        </label>
        <button
          className={`${btn} text-accent`}
          disabled={busy || !newName.trim()}
          onClick={async () => {
            const r = await act(() => createTeamAction(categoryId, { name: newName, team_code: newCode }), "เพิ่มแล้ว");
            if (r.ok) { setNewName(""); setNewCode(""); }
          }}
        >
          + เพิ่ม
        </button>
      </div>
      <MsgLine msg={msg} />

      <ul className="space-y-1">
        {list.map((t) => (
          <li key={t.id}>
            <button onClick={() => setOpen(open === t.id ? null : t.id)} className={`w-full rounded p-2 text-left text-sm ${open === t.id ? "bg-accent text-black" : "bg-surface"}`}>
              <span className="font-bold">{t.name}</span>
              <span className="ml-2 opacity-70">{t.short_name} · {t.team_code ?? "-"} · {players.filter((p) => p.team_id === t.id).length} คน{locked.has(t.id) ? " · 🔒 อยู่ในสาย" : ""}</span>
            </button>
            {open === t.id && game && (
              <TeamEditor team={t} game={game} categories={categories.filter((c) => c.game_id === game.id)} teams={teams.filter((x) => categories.find((c) => c.id === x.category_id)?.game_id === game.id)} players={players.filter((p) => p.team_id === t.id)} locked={locked.has(t.id)} />
            )}
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted">ไม่มีทีมในประเภทนี้</li>}
      </ul>
    </div>
  );
}

function TeamEditor({ team, game, categories, teams, players, locked }: { team: Team; game: Game; categories: Category[]; teams: Team[]; players: Player[]; locked: boolean }) {
  const [form, setForm] = useState({
    name: team.name,
    short_name: team.short_name ?? "",
    team_code: team.team_code ?? "",
    category_id: team.category_id,
    logo_url: team.logo_url ?? "",
    photo_url: team.photo_url ?? "",
  });
  const [np, setNp] = useState({ real_name: "", in_game_name: "", position: "" });
  const { busy, msg, act } = useAct();
  return (
    <div className="mt-1 space-y-3 rounded bg-surface/60 p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="flex flex-col text-xs text-muted">ชื่อ<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="flex flex-col text-xs text-muted">ชื่อย่อ<input className={field} value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} /></label>
        <label className="flex flex-col text-xs text-muted">รหัส อปท.<input className={field} value={form.team_code} onChange={(e) => setForm({ ...form, team_code: e.target.value })} /></label>
        <label className="flex flex-col text-xs text-muted">
          ประเภท {locked && "(ล็อก)"}
          <select className={field} disabled={locked} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs text-muted sm:col-span-2">URL โลโก้ทีม<input className={field} placeholder="https://…" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></label>
        <label className="flex flex-col text-xs text-muted sm:col-span-2">URL รูปทีม<input className={field} placeholder="https://…" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={`${btn} text-accent`} disabled={busy} onClick={() => act(() => updateTeamAction(team.id, form), "บันทึกทีมแล้ว")}>บันทึกทีม</button>
        <ConfirmButton label="ลบทีม" question={`ลบ ${team.name} และนักกีฬาทั้งหมดในทีม?`} danger disabled={busy || locked} onConfirm={() => act(() => deleteTeamAction(team.id), "ลบแล้ว")} />
      </div>

      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr><th className="text-left">#</th><th className="text-left">ชื่อจริง</th><th className="text-left">ชื่อในเกม</th><th className="text-left">{POSITION_HINT[game.code] ?? "ตำแหน่ง"}</th><th>C</th><th></th></tr>
        </thead>
        <tbody>
          {[...players].sort((a, b) => (a.order_in_team ?? 0) - (b.order_in_team ?? 0)).map((p) => (
            <PlayerRow key={p.id} player={p} teams={teams} />
          ))}
          <tr className="border-t border-white/10">
            <td className="py-1 text-muted">+</td>
            <td><input className={`${field} w-full`} placeholder="ชื่อจริง" value={np.real_name} onChange={(e) => setNp({ ...np, real_name: e.target.value })} /></td>
            <td><input className={`${field} w-full`} placeholder="ชื่อในเกม" value={np.in_game_name} onChange={(e) => setNp({ ...np, in_game_name: e.target.value })} /></td>
            <td><input className={`${field} w-full`} placeholder="ตำแหน่ง" value={np.position} onChange={(e) => setNp({ ...np, position: e.target.value })} /></td>
            <td></td>
            <td>
              <button className={btn} disabled={busy || (!np.real_name.trim() && !np.in_game_name.trim())} onClick={async () => {
                const r = await act(() => createPlayerAction(team.id, np), "เพิ่มนักกีฬาแล้ว");
                if (r.ok) setNp({ real_name: "", in_game_name: "", position: "" });
              }}>เพิ่ม</button>
            </td>
          </tr>
        </tbody>
      </table>
      <MsgLine msg={msg} />
    </div>
  );
}

function PlayerRow({ player, teams }: { player: Player; teams: Team[] }) {
  const [f, setF] = useState({
    real_name: player.real_name ?? "",
    in_game_name: player.in_game_name,
    position: player.position ?? "",
    order_in_team: player.order_in_team ?? 0,
    quote: player.quote ?? "",
    hide_real_name: !!player.hide_real_name,
  });
  const [moveTo, setMoveTo] = useState(player.team_id);
  const { busy, act } = useAct();
  return (
    <tr className="border-t border-white/5 align-top">
      <td className="py-1"><input type="number" className={`${field} w-12 p-1`} value={f.order_in_team} onChange={(e) => setF({ ...f, order_in_team: Number(e.target.value) })} /></td>
      <td>
        <input className={`${field} w-full`} value={f.real_name} onChange={(e) => setF({ ...f, real_name: e.target.value })} />
        <label className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <input type="checkbox" checked={f.hide_real_name} onChange={(e) => setF({ ...f, hide_real_name: e.target.checked })} /> ซ่อนชื่อจริงบนเว็บ
        </label>
      </td>
      <td>
        <input className={`${field} w-full`} value={f.in_game_name} onChange={(e) => setF({ ...f, in_game_name: e.target.value })} />
        <input className={`${field} mt-1 w-full text-xs`} placeholder="คำพูดประจำตัว" value={f.quote} onChange={(e) => setF({ ...f, quote: e.target.value })} />
      </td>
      <td><input className={`${field} w-full`} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></td>
      <td className="text-center">
        <input type="radio" name={`captain-${player.team_id}`} checked={player.is_captain} onChange={() => act(() => updatePlayerAction(player.id, { is_captain: true }), "ตั้งกัปตันแล้ว")} aria-label="กัปตัน" />
      </td>
      <td className="whitespace-nowrap">
        <div className="flex flex-wrap gap-1">
          <button className={btn} disabled={busy} onClick={() => act(() => updatePlayerAction(player.id, f), "บันทึกแล้ว")}>บันทึก</button>
          <select className={`${field} p-1`} value={moveTo} onChange={(e) => setMoveTo(e.target.value)} aria-label="ย้ายไปทีม">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.short_name ?? t.name}</option>)}
          </select>
          <button className={btn} disabled={busy || moveTo === player.team_id} onClick={() => act(() => updatePlayerAction(player.id, { team_id: moveTo }), "ย้ายแล้ว")}>ย้าย</button>
          <ConfirmButton label="ลบ" question="ลบนักกีฬาคนนี้?" danger disabled={busy} onConfirm={() => act(() => deletePlayerAction(player.id), "ลบแล้ว")} />
        </div>
      </td>
    </tr>
  );
}
