"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AthletePhoto, Game, Match, Player, Scene, Sponsor, SponsorPosition, Team } from "@/lib/types";
import { sponsorsAt } from "@/lib/view";
import { EVENTS, matchChannelName, openBus, type BugCorner, type HubEventMap, type HudTone, type ScoreBarPosition } from "@/lib/realtime";
import { athleteName, publicPhoto } from "@/lib/people";
import { EVENT } from "@/lib/event";
import { Avatar } from "@/components/profile/Avatar";
import { BRAND, KrasaLogo, OfficialBug, OfficialHeader, Seal, Watermark } from "@/components/brand/Brand";
import { SponsorLogo } from "./SponsorLogo";
import { Stinger } from "./Stinger";

const EVENT_TITLE = EVENT.shortTitle;
const BAR_ROTATE_MS = 8000;
const TONE: Record<HudTone, string> = { info: "bg-accent text-black", warn: "bg-amber-400 text-black", alert: "bg-live text-white" };

// แถบคะแนนบาง (ใบ 1459 ข้อ 1): สูง 70 · กว้างรวม 1340 · ช่องว่างกลาง 300 · แถบสปอนเซอร์ 44
const BAR_H = 70;
const SIDE_W = 520;
const GAP_W = 300;
const LABEL_H = 36;
const SPONSOR_H = 44;
const BUG_MARGIN = 18;

const withSlot = (sponsors: Sponsor[], slot: SponsorPosition) => sponsorsAt(sponsors, slot);
/** ค่าตั้งต้นตำแหน่งแถบต่อเกม: ROV บน (แผนที่เล็กอยู่มุม) · SF6/eFootball ล่าง (หลอดเลือด SF6 อยู่แถบบน) */
export const defaultBarPosition = (gameCode: string): ScoreBarPosition => (gameCode === "rov" ? "top" : "bottom");

type Props = {
  channelKey: string;
  game: Game;
  match: Match;
  categoryName: string;
  matches: Match[];
  teams: Team[];
  players: Player[];
  sponsors: Sponsor[];
  photos: AthletePhoto[];
  showRoster: boolean;
  stingerVideo?: string;
};

export function OverlayStage({ channelKey, game, match, categoryName, matches, teams, players, sponsors, photos, showRoster, stingerVideo }: Props) {
  const [scene, setScene] = useState<Scene>(match.status === "ongoing" ? "LIVE" : "STARTING");
  const [score, setScore] = useState({ a_series: match.team_a_score, b_series: match.team_b_score, games: match.game_scores });
  const [hud, setHud] = useState<{ text: string; tone: HudTone } | null>(null);
  const [bug, setBug] = useState<BugCorner>("bl");
  const [barPos, setBarPos] = useState<ScoreBarPosition>(defaultBarPosition(game.code));
  const [roster, setRoster] = useState(showRoster);
  const [stingerId, setStingerId] = useState(0);
  const pending = useRef<Scene | undefined>(undefined);
  const [barIdx, setBarIdx] = useState(0);

  const a = teams.find((p) => p.id === match.team_a_id);
  const b = teams.find((p) => p.id === match.team_b_id);
  const bars = withSlot(sponsors, "bottom_ticker");
  const corner = withSlot(sponsors, "corner")[0];
  const stingerSponsor = withSlot(sponsors, "stinger")[0];
  const fullScreenSponsors = withSlot(sponsors, "full_screen");

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
        case EVENTS.scoreBar:
          setBarPos((raw as HubEventMap["score_bar"]).position);
          break;
        case EVENTS.rosterShow:
          setRoster((raw as HubEventMap["roster_show"]).show);
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
  const aShort = a?.short_name ?? aName;
  const bShort = b?.short_name ?? bName;
  const winner = score.a_series > score.b_series ? aName : score.b_series > score.a_series ? bName : null;
  const barSponsor = bars.length ? bars[barIdx % bars.length] : undefined;
  const fullScreen = scene !== "LIVE";
  const sponsorBarShown = scene === "LIVE" && !!barSponsor;
  const sponsorH = sponsorBarShown ? SPONSOR_H : 0;
  const need = Math.ceil(match.best_of / 2);

  const members = (p?: Team) =>
    p ? players.filter((x) => x.team_id === p.id).sort((x, y) => (x.order_in_team ?? 0) - (y.order_in_team ?? 0)) : [];
  // ฉาก STARTING: รูปคู่แข่ง (เดี่ยว = รูปใหญ่ 1 รูป · ทีม = สมาชิกสูงสุด 5) + รายชื่อ (เปิด/ปิดจากห้องคุม)
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
  const sideNames = (p?: Team) =>
    game.format === "team" && roster && p ? (
      <ul className="flex flex-wrap justify-center gap-x-4 text-[22px] text-muted">
        {members(p).slice(0, 7).map((m) => <li key={m.id}>{athleteName(m)}{m.is_captain ? " (C)" : ""}</li>)}
      </ul>
    ) : null;

  // จุดชนะซีรีส์ (BO1 ไม่แสดง)
  const Dots = ({ wins, color }: { wins: number; color: string }) =>
    match.best_of > 1 ? (
      <span className="flex shrink-0 items-center gap-1.5">
        {Array.from({ length: need }, (_, i) => (
          <span key={i} className="h-3.5 w-3.5 rounded-full border-2" style={{ borderColor: color, background: i < wins ? color : "transparent" }} />
        ))}
      </span>
    ) : null;
  const scoreBox = (n: number, color: string) => (
    <span className="flex h-[52px] min-w-[56px] shrink-0 items-center justify-center rounded-lg bg-surface px-3 text-[40px] font-black leading-none" style={{ color }}>
      {n}
    </span>
  );
  const label = `${categoryName} · ${match.round_name} · BO${match.best_of}${game.code === "rov" ? ` · เกมที่ ${gameNo}` : ""}${game.code === "efootball" ? ` · ประตู ${cur.a}-${cur.b}` : ""}`;
  const top = barPos === "top";
  // OfficialBug มุมล่าง: เหนือแถบสปอนเซอร์ · ถ้าแถบคะแนนอยู่ล่าง ขึ้นไปเหนือแถบคะแนน+ป้าย (ห้ามซ้อน)
  const bugBottom = sponsorH + BUG_MARGIN + (!top ? BAR_H + LABEL_H : 0);
  const bugStyle: React.CSSProperties =
    bug === "tl" ? { left: 32, top: 32 } : bug === "tr" ? { right: 32, top: 32 } : bug === "bl" ? { left: 32, bottom: bugBottom } : { right: 32, bottom: bugBottom };

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
            <div className="flex max-w-[800px] flex-col items-center gap-3">{sidePhotos(a)}<div className="text-5xl font-bold">{aName}</div>{sideNames(a)}</div>
            <div className="pb-6 text-5xl text-accent-2">vs</div>
            <div className="flex max-w-[800px] flex-col items-center gap-3">{sidePhotos(b)}<div className="text-5xl font-bold">{bName}</div>{sideNames(b)}</div>
          </div>
          <div className="relative text-3xl text-muted">{categoryName} · {match.round_name} · {game.name}</div>
        </div>
      )}

      {scene === "LIVE" && (
        <>
          <div
            className={`absolute left-1/2 flex -translate-x-1/2 ${top ? "flex-col" : "flex-col-reverse"} items-center`}
            style={top ? { top: 0 } : { bottom: sponsorH }}
          >
            <div className="flex items-stretch" style={{ width: SIDE_W * 2 + GAP_W, height: BAR_H }}>
              <div
                className={`flex items-center justify-end gap-3 bg-bg/90 px-4 ${top ? "rounded-bl-[18px] border-b-4" : "rounded-tl-[18px] border-t-4"}`}
                style={{ width: SIDE_W, borderColor: "var(--accent)" }}
              >
                <Dots wins={score.a_series} color="var(--accent)" />
                <span className="min-w-0 truncate text-[34px] font-bold leading-none">{aShort}</span>
                {scoreBox(score.a_series, "var(--accent)")}
              </div>
              <div style={{ width: GAP_W }} />
              <div
                className={`flex items-center justify-start gap-3 bg-bg/90 px-4 ${top ? "rounded-br-[18px] border-b-4" : "rounded-tr-[18px] border-t-4"}`}
                style={{ width: SIDE_W, borderColor: "var(--accent-2)" }}
              >
                {scoreBox(score.b_series, "var(--accent-2)")}
                <span className="min-w-0 truncate text-[34px] font-bold leading-none">{bShort}</span>
                <Dots wins={score.b_series} color="var(--accent-2)" />
              </div>
            </div>
            <div className={`bg-bg/80 px-4 text-[20px] text-muted ${top ? "rounded-b-lg" : "rounded-t-lg"}`} style={{ height: LABEL_H, lineHeight: `${LABEL_H}px` }}>
              {label}
            </div>
          </div>
          {bug !== "hidden" && <OfficialBug size="sm" className="absolute" style={bugStyle} />}
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
          <div className="relative text-4xl text-accent">{categoryName} · {match.round_name}</div>
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
          {fullScreenSponsors.length === 0 ? (
            // ไม่มีสปอนเซอร์ → โลโก้งาน + ตรา + ผู้จัด (ไม่เขียน "ขอบคุณผู้สนับสนุน")
            <>
              <KrasaLogo variant="white" width={760} priority />
              <div className="relative flex items-center gap-5 text-4xl">
                <Seal size={120} />
                <span>จัดโดย {BRAND.organizer}</span>
              </div>
            </>
          ) : (
            <>
              <div className="relative text-4xl text-muted">ขอบคุณผู้สนับสนุน</div>
              {fullScreenSponsors.map((s) => (
                <div key={s.id} className={`relative ${s.level === "main" ? "text-7xl" : s.level === "co" ? "text-5xl" : "text-3xl"}`}>
                  <SponsorLogo sponsor={s} className={s.level === "main" ? "h-40" : "h-24"} />
                </div>
              ))}
              <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-6">
                <KrasaLogo variant="white" width={260} />
                <Seal size={96} />
              </div>
            </>
          )}
        </div>
      )}

      {/* สปอนเซอร์มุม: LIVE ขวาบน (ซ้ายบนถ้าตราอยู่ขวาบน) · ฉากเต็มจอ ขวาล่าง (กันชน OfficialHeader) */}
      {scene !== "SPONSOR" && corner && (
        <div className={`absolute rounded-lg bg-bg/80 px-4 py-2 text-2xl ${fullScreen ? "bottom-10 right-10" : bug === "tr" ? "left-10 top-10" : "right-10 top-10"}`}>
          <SponsorLogo sponsor={corner} />
        </div>
      )}
      {/* แถบสปอนเซอร์ล่าง 44px · ไม่มีสปอนเซอร์ = ไม่แสดง */}
      {sponsorBarShown && barSponsor && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-bg/85 text-xl text-muted" style={{ height: SPONSOR_H }}>
          <span className="text-base">สนับสนุนโดย</span>
          <SponsorLogo sponsor={barSponsor} className="h-7" />
        </div>
      )}

      {hud && (
        <div className={`absolute inset-x-0 z-30 mx-auto w-fit rounded-xl px-12 py-4 text-5xl font-black shadow-2xl ${TONE[hud.tone]}`} style={{ top: scene === "LIVE" && top ? BAR_H + LABEL_H + 24 : 40 }}>
          {hud.text}
        </div>
      )}

      <Stinger playId={stingerId} onCovered={onCovered} title={EVENT_TITLE} sponsor={stingerSponsor} videoSrc={stingerVideo} />
    </div>
  );
}
