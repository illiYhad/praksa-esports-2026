"use client";

import { useCallback, useEffect, useState } from "react";
import type { Scene } from "@/lib/types";

// ยกจาก Stream Hub เดิม: ตัดการเก็บใน Supabase auth ออก — เก็บในเบราว์เซอร์เครื่องนั้นอย่างเดียว (บัญชีสตาฟมาใน K-S3)
export type HotkeyMap = Record<string, string>;

export interface HotkeyAction {
  id: string;
  label: string;
}

export const SCENE_ACTIONS: (HotkeyAction & { scene: Scene })[] = [
  { id: "STARTING", label: "1. Starting Soon", scene: "STARTING" },
  { id: "LIVE", label: "2. Live", scene: "LIVE" },
  { id: "BREAK", label: "3. Break", scene: "BREAK" },
  { id: "RESULT", label: "4. Result", scene: "RESULT" },
  { id: "BRACKET", label: "5. Bracket", scene: "BRACKET" },
  { id: "SPONSOR", label: "6. Sponsor", scene: "SPONSOR" },
];

export const HOTKEY_ACTIONS: HotkeyAction[] = [
  ...SCENE_ACTIONS,
  { id: "stinger", label: "เล่นสติงเกอร์" },
  { id: "clearHud", label: "ล้างป้ายแจ้งเตือน" },
];

export const DEFAULT_HOTKEYS: HotkeyMap = {
  STARTING: "Alt+1",
  LIVE: "Alt+2",
  BREAK: "Alt+3",
  RESULT: "Alt+4",
  BRACKET: "Alt+5",
  SPONSOR: "Alt+6",
  stinger: "Alt+7",
  clearHud: "Alt+C",
};

const LOCAL_KEY = "praksa-stream-hub-hotkeys";

// แปลง KeyboardEvent เป็นข้อความเช่น "Alt+1" — ใช้ e.code เพื่อให้ทำงานได้แม้เปิดแป้นภาษาไทยอยู่
export function comboFromEvent(e: KeyboardEvent): string | null {
  let key: string | null = null;
  if (/^Digit\d$/.test(e.code)) key = e.code.slice(5);
  else if (/^Numpad\d$/.test(e.code)) key = e.code.slice(6);
  else if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3);
  else if (/^F\d{1,2}$/.test(e.code)) key = e.code;
  if (!key) return null;

  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  // ปุ่มตัวอักษร/ตัวเลขเดี่ยวๆ ต้องมีปุ่มเสริมเสมอ ไม่งั้นจะชนกับการพิมพ์ปกติ (F1-F12 กดเดี่ยวได้)
  if (parts.length === 0 && !key.startsWith("F")) return null;
  parts.push(key);
  return parts.join("+");
}

export function useStreamHubHotkeys(defaults: HotkeyMap) {
  const [hotkeys, setHotkeys] = useState<HotkeyMap>(defaults);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) setHotkeys({ ...defaults, ...(JSON.parse(raw) as HotkeyMap) });
    } catch {
      // localStorage ใช้ไม่ได้ — ใช้ค่าเริ่มต้น
    }
    // defaults เป็นค่าคงที่ของหน้า โหลดครั้งเดียวพอ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async (next: HotkeyMap): Promise<string | null> => {
    setHotkeys(next);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      return null;
    } catch {
      return "บันทึกในเครื่องไม่สำเร็จ";
    }
  }, []);

  return { hotkeys, save };
}
