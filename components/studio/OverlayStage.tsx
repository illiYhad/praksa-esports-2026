"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AthletePhoto, Game, Match, Player, Scene, Sponsor, SponsorPosition, Team } from "@/lib/types";
import { sponsorsAt } from "@/lib/view";
import { EVENTS, matchChannelName, openBus, type BugCorner, type HubEventMap, type HudTone } from "@/lib/realtime";
import { athleteName, publicPhoto } from "@/lib/people";
import { EVENT } from "@/lib/event";
import { Avatar } from "@/components/profile/Avatar";
import { BRAND, KrasaLogo, OfficialBug, OfficialHeader, Seal, Watermark } from "@/components/brand/Brand";
import { SponsorLogo } from "./SponsorLogo";
import { Stinger } from "./Stinger";

const EVENT_TITLE = EVENT.shortTitle;
const BAR_ROTATE_MS = 8000;
const TONE: Record<HudTone, string> = { info: "bg-accent text-black", warn: "bg-amber-400 text-black", alert: "bg-live text-white" };
/** ตำแหน่ง OfficialBug บนฉาก LIVE (ค่าเริ่มต้น ซ้ายล่าง เหนือแถบสปอนเซอร์) */
const BUG_POS: Record<Exclude<BugCorner, "hidden">, string> = { tl: "left-8 top-8", tr: "right-8 top-8", bl: "left-8 bottom-20", br: "right-8 bottom-20" };

const withSlot = (sponsors: Sponsor[], slot: SponsorPosition) => sponsorsAt(sponsors, slot);

type Props = {
  channelKey: string;
  game: Game;
  match: Match;
  matches: Match[];
  teams: Team[];
  players: Player[];
  sponsors: Sponsor[];
  photos: AthletePhoto[];
  showRoster: boolean;
  stingerVideo?: string;
};

export function OverlayStage({ channelKey, game, match, matches, teams, players, sponsors, photos, showRoster, stingerVideo }: Props) {
  const [scene, setScene] = useState<Scene>(match.status === "ongoing" ? "LIVE" : "STARTING");
  const [score, setScore] = useState({ a_series: match.team_a_score, b_series: match.team_b_score, games: match.game_scores });
  const [hud, setHud] = useState<{ text: string; tone: HudTone } | null>(null);
  const [bug, setBug] = useState<BugCorner>("bl");
  const [stingerId, setStingerId] = useState(0);
  const pending = useRef<Scene | undefined>(undefined);
  const [barIdx, setBarIdx] = useState(0);

  const a = teams.find((p) => p.id === match.team_a_id);
  const b = teams.find((p) => p.id === match.team_b_id);
  const bars = withSlot(sponsors, "bottom_ticker");
  const corner = withSlot(sponsors, "corner")[0];
  const stingerSponsor = withSlot(sponsors, "stinger")[0];

  useEffect(() => {
    const bus = openBus(matchChannelName(channelKey, match.id));
    const off = bus.on((event, raw) => {
      switch (event) {
        case EVENTS.sceneChange:
          setScene((raw as HubEventMap["scene_change"]).scene);
          break;
        case EVENTS.scoreUpdate: {
          const p = raw as HubEventMap["score_update"];
          setScore({ a_series: p.a_series, b_series: p.b_series, games: p.games });
          break;
        }
        case EVENTS.hudNotification:
          setHud(raw as HubEventMap["hud_notification"]);
          break;
        case EVENTS.hudNotificationClear:
          setHud(null);
          break;
        case EVENTS.stingerPlay:
          pending.current = (raw as HubEventMap["stinger_play"]).then_scene;
          setStingerId((n) => n + 1);
          break;
        case EVENTS.brandBug:
          setBug((raw as HubEventMap["brand_bug"]).corner);
          break;
      }
    });
    return () => {
      off();
      bus.close();
    };
  }, [channelKey, match.id]);

  useEffect(() => {
    if (bars.length < 2) return;
    const t = setInterval(() => setBarIdx((i) => i + 1), BAR_ROTATE_MS);
    return () => clearInterval(t);
  }, [bars.length]);

  const onCovered = useCallback(() => {
    if (pending.current) setScene(pending.current);
    pending.current = undefined;
  }, []);

  const gameNo = Math.max(score.games.length, 1);
  const cur = score.games[score.games.length - 1] ?? { a: 0, b: 0 };
  const aName = a?.name ?? "รอผล";
  const bName = b?.name ?? "รอผล";
  const winner = score.a_series > score.b_series ? aName : score.b_series > score.a_series ? bName : null;
  const barSponsor = bars.length ? bars[barIdx % bars.length] : undefined;
  const fullScreen = scene !== "LIVE";

  const members = (p?: Team) =>
    p ? players.filter((x) => x.team_id === p.id).sort((x, y) => (x.order_in_team ?? 0) - (y.order_in_team ?? 0)) : [];
  // รายชื่อ (ROV) มีรูปเล็ก · รูปขึ้นเฉพาะคนที่ยินยอม
  const roster = (p: Team | undefined, align: "left" | "right") =>
    game.format === "team" && showRoster && p ? (
      <ul className="mt-2 space-y-1 text-xl text-muted">
        {members(p).slice(0, 7).map((m) => (
          <li key={m.id} className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
            <Avatar src={publicPhoto(photos, m)?.cutout_url} name={m.real_name ?? athleteName(m)} size="sm" />
            <span>{athleteName(m)}{m.is_captain ? " (C)" : ""}</span>
          </li>
        ))}
      </ul>
    ) : null;
  // ฉาก STARTING: รูปคู่แข่ง (เดี่ยว = รูปใหญ่ 1 รูป · ทีม = สมาชิกสูงสุด 5)
  const sidePhotos = (p?: Team) => {
    const ms = members(p);
    if (!ms.length) return null;
    if (game.format === "solo") return <Avatar src={publicPhoto(photos, ms[0])?.cutout_url} name={ms[0].real_name ?? athleteName(ms[0])} size="xl" />;
    return (
      <div className="flex gap-3">
        {ms.slice(0, 5).map((m) => <Avatar key={m.id} src={publicPhoto(photos, m)?.cutout_url} name={m.real_name ?? athleteName(m)} size="lg" />)}
      </div>
    );
  };

  const rounds = [...new Set(matches.map((m) => m.round_name))];

  return (
    <div className="relative h-[1080px] w-[1920px] overflow-hidden text-text" style={{ background: "transparent" }}>
      {scene === "STARTING" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-hidden bg-bg/90">
          <Watermark height={820} />
          <OfficialHeader showLogo={false} />
          <KrasaLogo variant="white" width={480} priority />
          <div className="relative text-6xl font-black">เริ่มเร็ว ๆ นี้</div>
          <div className="relative flex items-end justify-center gap-10">
            <div className="flex flex-col items-center gap-3">{sidePhotos(a)}<div className="text-5xl font-bold">{aName}</div></div>
            <div className="pb-6 text-5xl text-accent-2">vs</div>
            <div className="flex flex-col items-center gap-3">{sidePhotos(b)}<div className="text-5xl font-bold">{bName}</div></div>
          </div>
          <div className="relative text-3xl text-muted">{match.round_name} · {game.name}</div>
        </div>
      )}

      {scene === "LIVE" && (
        <>
          <div className="absolute bottom-24 left-1/2 flex max-w-[1760px] -translate-x-1/2 items-stretch overflow-hidden rounded-xl bg-bg/90 shadow-2xl">
            <div className="w-[560px] max-w-[640px] shrink px-8 py-4 text-right">
              <div className="text-5xl font-black leading-tight">{aName}</div>
              {roster(a, "right")}
            </div>
            <div className="flex min-w-[300px] shrink-0 flex-col items-center justify-center whitespace-nowrap bg-surface px-8">
              <div className="whitespace-nowrap text-7xl font-black text-accent">
                {score.a_series} - {score.b_series}
              </div>
              <div className="whitespace-nowrap text-xl text-muted">
                {match.round_name} · BO{match.best_of}
                {game.code === "rov" ? ` · เกมที่ ${gameNo}` : ""}
              </div>
              {game.code === "efootball" && (
                <div className="mt-1 whitespace-nowrap text-3xl font-bold text-accent-2">
                  ประตู {cur.a} - {cur.b}
                </div>
              )}
            </div>
            <div className="w-[560px] max-w-[640px] shrink px-8 py-4">
              <div className="text-5xl font-black leading-tight">{bName}</div>
              {roster(b, "left")}
            </div>
          </div>
          {bug !== "hidden" && <OfficialBug size="sm" className={`absolute ${BUG_POS[bug]}`} />}
        </>
      )}

      {scene === "BREAK" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 overflow-hidden bg-bg/90">
          <Watermark height={820} />
          <OfficialHeader showLogo={false} />
          <KrasaLogo variant="white" width={640} priority />
          <div className="relative text-8xl font-black">พักการแข่งขัน</div>
          <div className="relative flex items-center gap-4 text-3xl text-muted">
            <Seal size={110} />
            <span>จัดโดย {BRAND.organizer}</span>
          </div>
        </div>
      )}

      {scene === "RESULT" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden bg-bg/90">
          <Watermark height={820} />
          <OfficialHeader />
          <div className="relative text-4xl text-accent">{match.round_name}</div>
          <div className="relative text-8xl font-black">{winner ? `${winner} ชนะ` : "ผลการแข่งขัน"}</div>
          <div className="relative text-6xl font-bold text-accent-2">
            {aName} {score.a_series} - {score.b_series} {bName}
          </div>
          <div className="relative flex gap-6 text-3xl text-muted">
            {score.games.map((g, i) => (
              <span key={i}>
                เกม {i + 1}: {g.a}-{g.b}
              </span>
            ))}
          </div>
        </div>
      )}

      {scene === "BRACKET" && (
        <div className="absolute inset-0 flex items-center justify-center gap-16 overflow-hidden bg-bg/90 px-16 pb-16 pt-44">
          <Watermark height={820} />
          <OfficialHeader />
          {rounds.map((r) => (
            <div key={r} className="relative space-y-4">
              <div className="text-2xl text-accent">{r}</div>
              {matches
                .filter((m) => m.round_name === r)
                .map((m) => {
                  const here = m.id === match.id;
                  const sa = here ? score.a_series : m.team_a_score;
                  const sb = here ? score.b_series : m.team_b_score;
                  const nm = (id?: string) => teams.find((p) => p.id === id)?.short_name ?? teams.find((p) => p.id === id)?.name ?? "รอผล";
                  return (
                    <div key={m.id} className={`w-80 rounded-lg bg-surface p-3 text-2xl ${here ? "ring-2 ring-accent" : ""}`}>
                      <div className="flex justify-between"><span>{nm(m.team_a_id)}</span><b>{sa}</b></div>
                      <div className="flex justify-between"><span>{nm(m.team_b_id)}</span><b>{sb}</b></div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      )}

      {scene === "SPONSOR" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 overflow-hidden bg-bg/95">
          <Watermark height={820} />
          <div className="relative text-4xl text-muted">ขอบคุณผู้สนับสนุน</div>
          {withSlot(sponsors, "full_screen").map((s) => (
            <div key={s.id} className={`relative ${s.level === "main" ? "text-7xl" : s.level === "co" ? "text-5xl" : "text-3xl"}`}>
              <SponsorLogo sponsor={s} className={s.level === "main" ? "h-40" : "h-24"} />
            </div>
          ))}
          <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-6">
            <KrasaLogo variant="white" width={260} />
            <Seal size={96} />
          </div>
        </div>
      )}

      {/* สปอนเซอร์มุม: LIVE ขวาบน (ซ้ายบนถ้าตราอยู่ขวาบน) · ฉากเต็มจอ ขวาล่าง (กันชน OfficialHeader) */}
      {scene !== "SPONSOR" && corner && (
        <div className={`absolute rounded-lg bg-bg/80 px-4 py-2 text-2xl ${fullScreen ? "bottom-10 right-10" : bug === "tr" ? "left-10 top-10" : "right-10 top-10"}`}>
          <SponsorLogo sponsor={corner} />
        </div>
      )}
      {scene === "LIVE" && barSponsor && (
        <div className="absolute inset-x-0 bottom-0 flex h-16 items-center justify-center bg-bg/85 text-2xl text-muted">
          <span className="mr-4 text-base uppercase tracking-widest">Sponsored by</span>
          <SponsorLogo sponsor={barSponsor} className="h-10" />
        </div>
      )}

      {hud && (
        <div className={`absolute inset-x-0 top-10 z-30 mx-auto w-fit rounded-xl px-12 py-4 text-5xl font-black shadow-2xl ${TONE[hud.tone]}`}>
          {hud.text}
        </div>
      )}

      <Stinger playId={stingerId} onCovered={onCovered} title={EVENT_TITLE} sponsor={stingerSponsor} videoSrc={stingerVideo} />
    </div>
  );
}
