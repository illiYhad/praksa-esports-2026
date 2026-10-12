"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Zap } from "lucide-react";
import type { Category, Game, Match, Scene, Team } from "@/lib/types";
import { EVENTS, matchChannelName, openBus, type BugCorner, type Bus, type HudTone, type ScoreBarPosition } from "@/lib/realtime";
import { defaultBarPosition } from "./OverlayStage";
import { DEFAULT_HOTKEYS, HOTKEY_ACTIONS, SCENE_ACTIONS, comboFromEvent, useStreamHubHotkeys } from "./hotkeys";
import { HotkeySettingsModal } from "./HotkeySettingsModal";
import { NetworkStat } from "./NetworkStat";

const QUICK_HUD: { text: string; tone: HudTone }[] = [
  { text: "พักการแข่งขัน", tone: "info" },
  { text: "MATCH POINT", tone: "warn" },
  { text: "ปัญหาทางเทคนิค", tone: "alert" },
];
const HEARTBEAT_MS = 5000;
const BUG_CORNERS: { v: BugCorner; label: string }[] = [
  { v: "tl", label: "ซ้ายบน" },
  { v: "tr", label: "ขวาบน" },
  { v: "bl", label: "ซ้ายล่าง" },
  { v: "br", label: "ขวาล่าง" },
  { v: "hidden", label: "ซ่อน" },
];

export function StreamHubClient({
  channelKey,
  games,
  matches,
  categories,
  teams,
}: {
  channelKey: string;
  games: Game[];
  matches: Match[];
  categories: Category[];
  teams: Team[];
}) {
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const gid = (m: Match) => categories.find((c) => c.id === m.category_id)?.game_id;
  const gameMatches = matches.filter((m) => gid(m) === gameId);
  const [matchId, setMatchId] = useState(gameMatches[0]?.id ?? "");
  const game = games.find((g) => g.id === gameId);
  const match = matches.find((m) => m.id === matchId);
  const nm = (id?: string) => teams.find((p) => p.id === id)?.name ?? "รอผล";

  const [scene, setScene] = useState<Scene>(match?.status === "ongoing" ? "LIVE" : "STARTING");
  const [withStinger, setWithStinger] = useState(true);
  const [score, setScore] = useState({ a_series: 0, b_series: 0, games: [] as { a: number; b: number }[] });
  const [hudText, setHudText] = useState("");
  const [bug, setBug] = useState<BugCorner>("bl");
  const [barPos, setBarPos] = useState<ScoreBarPosition>("top");
  const [rosterShow, setRosterShow] = useState(true);
  const [showKeys, setShowKeys] = useState(false);
  const { hotkeys, save } = useStreamHubHotkeys(DEFAULT_HOTKEYS);
  const busRef = useRef<Bus | null>(null);

  // เปลี่ยนแมตช์ → เปิด channel ใหม่ + โหลดสกอร์ตั้งต้นจากข้อมูล
  useEffect(() => {
    if (!match) return;
    setScore({ a_series: match.team_a_score, b_series: match.team_b_score, games: match.game_scores });
    setScene(match.status === "ongoing" ? "LIVE" : "STARTING");
    setBarPos(defaultBarPosition(game?.code ?? ""));
    const bus = openBus(matchChannelName(channelKey, match.id));
    busRef.current = bus;
    return () => {
      bus.close();
      busRef.current = null;
    };
  }, [channelKey, match]);

  // ส่งสถานะซ้ำทุก 5 วินาที — overlay ที่เพิ่งเปิด/รีเฟรชใน OBS จะตามทัน
  useEffect(() => {
    const t = setInterval(() => {
      busRef.current?.send(EVENTS.sceneChange, { scene });
      busRef.current?.send(EVENTS.scoreUpdate, score);
      busRef.current?.send(EVENTS.brandBug, { corner: bug });
      busRef.current?.send(EVENTS.scoreBar, { position: barPos });
      busRef.current?.send(EVENTS.rosterShow, { show: rosterShow });
    }, HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [scene, score, bug, barPos, rosterShow]);

  const setBar = (position: ScoreBarPosition) => {
    setBarPos(position);
    busRef.current?.send(EVENTS.scoreBar, { position });
  };
  const setRoster = (show: boolean) => {
    setRosterShow(show);
    busRef.current?.send(EVENTS.rosterShow, { show });
  };

  const setBugCorner = (corner: BugCorner) => {
    setBug(corner);
    busRef.current?.send(EVENTS.brandBug, { corner });
  };

  const gotoScene = useCallback(
    (next: Scene) => {
      setScene(next);
      if (withStinger) busRef.current?.send(EVENTS.stingerPlay, { then_scene: next });
      else busRef.current?.send(EVENTS.sceneChange, { scene: next });
    },
    [withStinger],
  );
  const playStinger = useCallback(() => busRef.current?.send(EVENTS.stingerPlay, {}), []);
  const clearHud = useCallback(() => busRef.current?.send(EVENTS.hudNotificationClear, {}), []);
  const sendHud = (text: string, tone: HudTone) => text.trim() && busRef.current?.send(EVENTS.hudNotification, { text, tone });

  const pushScore = (next: typeof score) => {
    setScore(next);
    busRef.current?.send(EVENTS.scoreUpdate, next);
  };
  const bumpSeries = (side: "a" | "b", d: number) =>
    pushScore({ ...score, [`${side}_series`]: Math.min(Math.ceil((match?.best_of ?? 1) / 2), Math.max(0, score[`${side}_series`] + d)) });
  const bumpGame = (side: "a" | "b", d: number) => {
    const games = score.games.length ? [...score.games] : [{ a: 0, b: 0 }];
    const last = games.length - 1;
    games[last] = { ...games[last], [side]: Math.max(0, games[last][side] + d) };
    pushScore({ ...score, games });
  };
  const newGame = () => pushScore({ ...score, games: [...score.games, { a: 0, b: 0 }] });

  // คีย์ลัด
  useEffect(() => {
    if (showKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const combo = comboFromEvent(e);
      if (!combo) return;
      const id = Object.keys(hotkeys).find((k) => hotkeys[k] === combo);
      if (!id) return;
      e.preventDefault();
      const s = SCENE_ACTIONS.find((x) => x.id === id);
      if (s) gotoScene(s.scene);
      else if (id === "stinger") playStinger();
      else if (id === "clearHud") clearHud();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys, showKeys, gotoScene, playStinger, clearHud]);

  // พรีวิว: iframe ของหน้า overlay จริง ย่อด้วย scale
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const previewSrc = useMemo(
    () => (game && match ? `/overlay/${game.code}/${match.id}?k=${encodeURIComponent(channelKey)}` : ""),
    [game, match, channelKey],
  );

  const btn = "rounded bg-surface px-3 py-2 text-sm font-bold hover:bg-white/10";
  const sideRow = (label: string, onMinus: () => void, onPlus: () => void) => (
    <div className="flex items-center gap-1">
      <button className={btn} onClick={onMinus}>−</button>
      <span className="min-w-24 text-center text-xs text-muted">{label}</span>
      <button className={btn} onClick={onPlus}>+</button>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr_300px]">
      <aside className="space-y-3">
        <select
          className="w-full rounded bg-surface p-2"
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value);
            setMatchId(matches.find((m) => gid(m) === e.target.value)?.id ?? "");
          }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <ul className="space-y-1">
          {gameMatches.map((m) => (
            <li key={m.id}>
              <button
                onClick={() => setMatchId(m.id)}
                className={`w-full rounded p-2 text-left text-xs ${m.id === matchId ? "bg-accent text-black" : "bg-surface"}`}
              >
                {m.round_name}
                <br />
                {nm(m.team_a_id)} vs {nm(m.team_b_id)}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section>
        <div ref={boxRef} className="relative aspect-video w-full overflow-hidden rounded border border-white/10 bg-black">
          {previewSrc && (
            <iframe
              key={previewSrc}
              src={previewSrc}
              title="พรีวิว overlay"
              style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left", border: 0 }}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-muted">
          พรีวิว = หน้า overlay จริง · ฉากปัจจุบัน: <b className="text-accent">{scene}</b> · {match ? `${nm(match.team_a_id)} vs ${nm(match.team_b_id)}` : "-"}
        </p>
      </section>

      <aside className="space-y-4">
        <div className="flex items-center justify-between">
          <NetworkStat />
          <button className={btn} onClick={() => setShowKeys(true)} aria-label="ตั้งค่า Hotkey">
            <Keyboard className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {SCENE_ACTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => gotoScene(s.scene)}
              className={`${btn} ${scene === s.scene ? "ring-2 ring-accent" : ""}`}
            >
              {s.scene}
              <span className="block text-[10px] font-normal text-muted">{hotkeys[s.id]}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={withStinger} onChange={(e) => setWithStinger(e.target.checked)} />
          เล่นสติงเกอร์ก่อนเปลี่ยนฉาก
        </label>
        <button className={`${btn} flex w-full items-center justify-center gap-2`} onClick={playStinger}>
          <Zap className="h-4 w-4" /> สติงเกอร์ <span className="text-[10px] text-muted">{hotkeys.stinger}</span>
        </button>

        <div className="space-y-1 rounded bg-surface/60 p-2">
          <div className="text-xs text-accent-2">แถบคะแนน (ฉาก LIVE) — ROV บน · SF6/eFootball ล่าง</div>
          <div className="flex gap-1">
            {(["top", "bottom"] as ScoreBarPosition[]).map((p) => (
              <button key={p} className={`${btn} ${barPos === p ? "ring-2 ring-accent" : ""}`} onClick={() => setBar(p)}>{p === "top" ? "บน" : "ล่าง"}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 pt-1 text-xs">
            <input type="checkbox" checked={rosterShow} onChange={(e) => setRoster(e.target.checked)} /> แสดงรายชื่อ (เฉพาะฉาก STARTING)
          </label>
        </div>

        <div className="space-y-1 rounded bg-surface/60 p-2">
          <div className="text-xs text-accent-2">ตรามุมจอ (ฉาก LIVE) — หลบ UI ของเกม</div>
          <div className="flex flex-wrap gap-1">
            {BUG_CORNERS.map((c) => (
              <button key={c.v} className={`${btn} ${bug === c.v ? "ring-2 ring-accent" : ""}`} onClick={() => setBugCorner(c.v)}>{c.label}</button>
            ))}
          </div>
        </div>

        <div className="space-y-1 rounded bg-surface/60 p-2">
          <div className="text-xs text-accent-2">สกอร์ซีรีส์ (BO{match?.best_of})</div>
          {sideRow(nm(match?.team_a_id), () => bumpSeries("a", -1), () => bumpSeries("a", 1))}
          {sideRow(nm(match?.team_b_id), () => bumpSeries("b", -1), () => bumpSeries("b", 1))}
          <div className="pt-1 text-xs text-accent-2">{game?.code === "efootball" ? "ประตูเกมปัจจุบัน" : "สกอร์รายเกม"}</div>
          {sideRow(nm(match?.team_a_id), () => bumpGame("a", -1), () => bumpGame("a", 1))}
          {sideRow(nm(match?.team_b_id), () => bumpGame("b", -1), () => bumpGame("b", 1))}
          <button className={`${btn} w-full`} onClick={newGame}>เกมใหม่</button>
          <div className="text-xs text-muted">
            ซีรีส์ {score.a_series}-{score.b_series} · เกม {score.games.map((g) => `${g.a}-${g.b}`).join(", ") || "-"}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-accent-2">ป้ายแจ้งเตือน</div>
          <input
            className="w-full rounded bg-surface p-2 text-sm"
            placeholder="พิมพ์ข้อความ"
            value={hudText}
            onChange={(e) => setHudText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendHud(hudText, "info")}
          />
          <button className={`${btn} w-full`} onClick={() => sendHud(hudText, "info")}>ส่งป้าย</button>
          <div className="flex flex-wrap gap-1">
            {QUICK_HUD.map((q) => (
              <button key={q.text} className={btn} onClick={() => sendHud(q.text, q.tone)}>{q.text}</button>
            ))}
          </div>
          <button className={`${btn} w-full`} onClick={clearHud}>
            ล้างป้าย <span className="text-[10px] text-muted">{hotkeys.clearHud}</span>
          </button>
        </div>
      </aside>

      {showKeys && (
        <HotkeySettingsModal
          actions={HOTKEY_ACTIONS}
          hotkeys={hotkeys}
          defaults={DEFAULT_HOTKEYS}
          onSave={save}
          onClose={() => setShowKeys(false)}
        />
      )}
    </div>
  );
}
