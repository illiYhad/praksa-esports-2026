"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, Game, GameScore, Match, MatchAuditLog, MatchStatus, Team } from "@/lib/types";
import { checkFinished, seriesFromGames, usesGoalsDirect } from "@/lib/match-logic";
import { notifyDataChanged } from "@/lib/data/live";
import { nameOf, statusLabel } from "@/lib/view";
import {
  certifyAction,
  loadAuditAction,
  saveProgressAction,
  saveResultAction,
  uncertifyAction,
  type ActionResult,
} from "@/app/admin/result/actions";

type Props = { games: Game[]; categories: Category[]; matches: Match[]; teams: Team[] };
type Confirm = "certify" | "uncertify" | null;

const btn = "rounded bg-surface px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-40";

export function ResultClient({ games, categories, matches, teams }: Props) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [filter, setFilter] = useState<MatchStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = matches
    .filter((m) => m.category_id === categoryId && (filter === "all" || m.status === filter))
    .sort((a, b) => (a.round_no ?? 0) - (b.round_no ?? 0) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const selected = matches.find((m) => m.id === selectedId);
  const category = categories.find((c) => c.id === categoryId);
  const game = games.find((g) => g.id === category?.game_id);

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className="min-w-0 flex-1 rounded bg-surface p-2"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSelectedId(null);
          }}
        >
          {games.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {categories.filter((c) => c.game_id === g.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select className="min-w-0 flex-1 rounded bg-surface p-2" value={filter} onChange={(e) => setFilter(e.target.value as MatchStatus | "all")}>
          <option value="all">ทุกสถานะ</option>
          {(Object.keys(statusLabel) as MatchStatus[]).map((s) => (
            <option key={s} value={s}>{statusLabel[s]}</option>
          ))}
        </select>
      </div>

      <ul className="space-y-1">
        {list.map((m) => (
          <li key={m.id}>
            <button
              onClick={() => setSelectedId(m.id === selectedId ? null : m.id)}
              className={`w-full min-w-0 rounded p-2 text-left text-sm ${m.id === selectedId ? "bg-accent text-black" : "bg-surface"}`}
            >
              <span className="block truncate">
                {m.round_name}: {nameOf(teams, m.team_a_id)} {m.team_a_score}-{m.team_b_score} {nameOf(teams, m.team_b_id)}
              </span>
              <span className="text-xs opacity-70">{statusLabel[m.status]}</span>
            </button>
            {m.id === selectedId && game && selected && (
              <MatchForm key={selected.id} match={selected} game={game} teams={teams} />
            )}
          </li>
        ))}
        {list.length === 0 && <li className="text-sm text-muted">ไม่มีแมตช์ตามตัวกรอง</li>}
      </ul>
    </div>
  );
}

function MatchForm({ match, game, teams }: { match: Match; game: Game; teams: Team[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<GameScore[]>(match.game_scores);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<MatchAuditLog[]>([]);

  // ข้อมูลเปลี่ยนจากเซิร์ฟเวอร์ (บันทึก/รับรอง/คนอื่นแก้) → โหลดสกอร์ใหม่ แต่คงข้อความผลลัพธ์ไว้
  useEffect(() => {
    setRows(match.game_scores);
  }, [match.updated_at, match.game_scores]);

  const direct = usesGoalsDirect(game.code, match.best_of);
  const series = seriesFromGames(rows, direct);
  const locked = match.status === "certified";
  const incomplete = checkFinished(rows, match.best_of, direct);

  useEffect(() => {
    void loadAuditAction(match.id).then(setAudit);
  }, [match.id, match.updated_at]);

  const setCell = (i: number, side: "a" | "b", raw: string) =>
    setRows((r) => r.map((x, k) => (k === i ? { ...x, [side]: Math.max(0, Math.floor(Number(raw) || 0)) } : x)));

  const act = async (fn: () => Promise<ActionResult>, okText: string) => {
    setBusy(true);
    setConfirm(null);
    const res = await fn();
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error });
    if (res.ok) {
      notifyDataChanged();
      router.refresh();
    }
  };

  const a = nameOf(teams, match.team_a_id);
  const b = nameOf(teams, match.team_b_id);

  return (
    <div className="mt-1 w-full min-w-0 space-y-3 rounded bg-surface/60 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span><b>{a}</b> vs <b>{b}</b> · BO{match.best_of}</span>
        <a href={`/print/result-sheet/${match.id}`} target="_blank" rel="noreferrer" className="ml-auto rounded bg-surface px-2 py-1 text-xs hover:text-accent">🖨 ใบบันทึกผล</a>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex min-w-0 items-center gap-2 text-sm">
            <span className="w-14 shrink-0 text-muted">{direct ? "ประตู" : `เกม ${i + 1}`}</span>
            <input
              className="w-16 min-w-0 rounded bg-bg p-2 text-center"
              inputMode="numeric"
              disabled={locked}
              value={r.a}
              onChange={(e) => setCell(i, "a", e.target.value)}
              aria-label={`${a} เกม ${i + 1}`}
            />
            <span>-</span>
            <input
              className="w-16 min-w-0 rounded bg-bg p-2 text-center"
              inputMode="numeric"
              disabled={locked}
              value={r.b}
              onChange={(e) => setCell(i, "b", e.target.value)}
              aria-label={`${b} เกม ${i + 1}`}
            />
          </div>
        ))}
        {!locked && (
          <div className="flex gap-2">
            <button className={btn} disabled={rows.length >= match.best_of} onClick={() => setRows([...rows, { a: 0, b: 0 }])}>
              + เพิ่มเกม
            </button>
            <button className={btn} disabled={rows.length === 0} onClick={() => setRows(rows.slice(0, -1))}>
              − ลบเกมล่าสุด
            </button>
          </div>
        )}
      </div>

      <div className="text-sm">
        ซีรีส์: <b className="text-accent">{series.a} - {series.b}</b>
        {!locked && incomplete && <span className="block text-xs text-muted">{incomplete}</span>}
      </div>

      {!locked && match.status !== "certified" && (
        <div className="flex flex-wrap gap-2">
          <button className={btn} disabled={busy} onClick={() => act(() => saveProgressAction(match.id, rows), "บันทึกสกอร์ระหว่างแข่งแล้ว")}>
            บันทึกสกอร์ระหว่างแข่ง
          </button>
          <button className={`${btn} text-accent`} disabled={busy} onClick={() => act(() => saveResultAction(match.id, rows), "บันทึกผลจบแมตช์แล้ว")}>
            บันทึกผล
          </button>
        </div>
      )}

      {match.status === "ended" && (
        <ConfirmButton
          label="รับรองผล"
          question={`ยืนยันรับรองผล ${a} ${match.team_a_score}-${match.team_b_score} ${b} ?`}
          open={confirm === "certify"}
          onAsk={() => setConfirm("certify")}
          onCancel={() => setConfirm(null)}
          onYes={() => act(() => certifyAction(match.id), "รับรองผลแล้ว ผู้ชนะเลื่อนไปแมตช์ถัดไป")}
          disabled={busy}
        />
      )}
      {locked && (
        <ConfirmButton
          label="ยกเลิกการรับรอง"
          question="ยืนยันยกเลิกการรับรอง? ผู้เล่นจะถูกถอยออกจากแมตช์ถัดไป"
          open={confirm === "uncertify"}
          onAsk={() => setConfirm("uncertify")}
          onCancel={() => setConfirm(null)}
          onYes={() => act(() => uncertifyAction(match.id), "ยกเลิกการรับรองแล้ว")}
          disabled={busy}
        />
      )}

      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-live"}`} role="status">{msg.text}</p>}

      {audit.length > 0 && (
        <ul className="space-y-0.5 border-t border-white/10 pt-2 text-xs text-muted">
          {audit.map((l) => (
            <li key={l.id}>
              {new Date(l.created_at).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok" })} · {l.action_details}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConfirmButton(p: {
  label: string;
  question: string;
  open: boolean;
  disabled: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onYes: () => void;
}) {
  if (!p.open) {
    return <button className={btn} disabled={p.disabled} onClick={p.onAsk}>{p.label}</button>;
  }
  return (
    <div className="space-y-2 rounded border border-amber-400/50 p-2 text-sm">
      <p>{p.question}</p>
      <div className="flex gap-2">
        <button className={`${btn} text-accent`} disabled={p.disabled} onClick={p.onYes}>ยืนยัน</button>
        <button className={btn} onClick={p.onCancel}>ยกเลิก</button>
      </div>
    </div>
  );
}
