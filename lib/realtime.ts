import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { Scene } from "@/lib/types";

// ชื่อ channel มีรหัสลับต่องาน (CHANNEL_KEY ฝั่ง server) กันคนนอกเดาชื่อแล้วยิงเข้า channel
export const matchChannelName = (key: string, matchId: string) => `praksa-${key}-match-${matchId}`;

export const EVENTS = {
  sceneChange: "scene_change",
  hudNotification: "hud_notification",
  hudNotificationClear: "hud_notification_clear",
  scoreUpdate: "score_update",
  stingerPlay: "stinger_play",
  /** มุมของตราทางการ (OfficialBug) บนฉาก LIVE — คนคุมจอหลบ UI ของเกมได้ */
  brandBug: "brand_bug",
  /** ตำแหน่งแถบคะแนนบางบนฉาก LIVE (บน/ล่าง) */
  scoreBar: "score_bar",
  /** แสดง/ซ่อนรายชื่อผู้เล่น (มีผลเฉพาะฉาก STARTING) */
  rosterShow: "roster_show",
} as const;

export type HudTone = "info" | "warn" | "alert";
/** tl = ซ้ายบน · tr = ขวาบน · bl = ซ้ายล่าง (ค่าเริ่มต้น) · br = ขวาล่าง · hidden = ซ่อน */
export type BugCorner = "tl" | "tr" | "bl" | "br" | "hidden";
export type ScoreBarPosition = "top" | "bottom";

export type HubEventMap = {
  scene_change: { scene: Scene };
  score_update: { a_series: number; b_series: number; games: { a: number; b: number }[] };
  hud_notification: { text: string; tone: HudTone };
  hud_notification_clear: Record<string, never>;
  stinger_play: { then_scene?: Scene };
  brand_bug: { corner: BugCorner };
  score_bar: { position: ScoreBarPosition };
  roster_show: { show: boolean };
};
export type HubEventName = keyof HubEventMap;

export type Bus = {
  send<E extends HubEventName>(event: E, payload: HubEventMap[E]): void;
  on(handler: (event: HubEventName, payload: unknown) => void): () => void;
  close(): void;
};

let client: SupabaseClient | null | undefined;

/** คืน null (no-op) ถ้าไม่มีค่า env — ไม่ throw */
export function getRealtimeClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

const NOOP_BUS: Bus = { send() {}, on: () => () => {}, close() {} };

/**
 * เปิดช่องสื่อสาร: มี Supabase env → Realtime broadcast · ไม่มี → BroadcastChannel ของเบราว์เซอร์
 * (แท็บในเครื่องเดียวกันคุยกันได้) · ไม่มีทั้งคู่ (SSR) → no-op
 */
export function openBus(name: string): Bus {
  if (typeof window === "undefined") return NOOP_BUS;
  const handlers = new Set<(event: HubEventName, payload: unknown) => void>();
  const emit = (event: string, payload: unknown) => handlers.forEach((h) => h(event as HubEventName, payload));

  const sb = getRealtimeClient();
  if (sb) {
    const ch: RealtimeChannel = sb.channel(name, { config: { broadcast: { self: true } } });
    ch.on("broadcast", { event: "*" }, (m) => emit(m.event, m.payload)).subscribe();
    return {
      send: (event, payload) => void ch.send({ type: "broadcast", event, payload }),
      on: (h) => (handlers.add(h), () => handlers.delete(h)),
      close: () => void sb.removeChannel(ch),
    };
  }

  if (typeof BroadcastChannel === "undefined") return NOOP_BUS;
  const bc = new BroadcastChannel(name);
  bc.onmessage = (e: MessageEvent<{ event: string; payload: unknown }>) => emit(e.data.event, e.data.payload);
  return {
    send: (event, payload) => bc.postMessage({ event, payload }),
    on: (h) => (handlers.add(h), () => handlers.delete(h)),
    close: () => bc.close(),
  };
}
