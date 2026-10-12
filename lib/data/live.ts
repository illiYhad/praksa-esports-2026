"use client";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createBrowserSupabase } from "@/lib/supabase/client";

// ฝั่งเบราว์เซอร์: แจ้ง "ข้อมูลเปลี่ยน ให้โหลดใหม่" (ไม่มีคำสั่งควบคุม จึงไม่ต้องใช้รหัสลับ)
const NAME = "praksa-data";
const TABLES = ["matches", "teams", "sponsors"] as const;

/** mock: BroadcastChannel ในเครื่อง · Supabase: postgres_changes บน matches / teams / sponsors */
export function subscribeDataChanges(onChange: () => void): () => void {
  if (hasSupabaseEnv) {
    const sb = createBrowserSupabase();
    let ch = sb.channel(`${NAME}-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, () => onChange());
    ch.subscribe();
    return () => void sb.removeChannel(ch);
  }
  if (typeof BroadcastChannel === "undefined") return () => {};
  const bc = new BroadcastChannel(NAME);
  bc.onmessage = () => onChange();
  return () => bc.close();
}

/** หลังบันทึกสำเร็จ: ให้แท็บอื่นในเครื่องเดียวกันรีเฟรช (Supabase จะแจ้งข้ามเครื่องเองผ่าน postgres_changes) */
export function notifyDataChanged() {
  if (typeof BroadcastChannel === "undefined") return;
  const bc = new BroadcastChannel(NAME);
  bc.postMessage("changed");
  bc.close();
}
