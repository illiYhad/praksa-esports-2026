import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const matchChannel = (matchId: string) => `match-realtime-${matchId}`;
export const displayChannel = (gameCode: string) => `display-${gameCode}`;

export const EVENTS = {
  sceneChange: "scene_change",
  hudNotification: "hud_notification",
  hudNotificationClear: "hud_notification_clear",
  scoreUpdate: "score_update",
  stingerPlay: "stinger_play",
} as const;

let client: SupabaseClient | null | undefined;

/** คืน null (no-op) ถ้าไม่มีค่า env — ไม่ throw */
export function getRealtimeClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
