"use client";

import React, { useEffect, useState } from "react";
import { Activity } from "lucide-react";

const PING_EVERY_MS = 5000;
const SPEED_EVERY_MS = 20000;
const SPEED_TEST_KB = 128;

async function timedFetch(kb: number): Promise<number> {
  const t0 = performance.now();
  const res = await fetch(`/api/health/speed?kb=${kb}&t=${Date.now()}`, { cache: "no-store" });
  await res.arrayBuffer();
  if (!res.ok) throw new Error(String(res.status));
  return performance.now() - t0;
}

// ยกจาก Stream Hub เดิม: Ping + ความเร็วดาวน์โหลด (kbps) จากเครื่องคนคุมถึงเซิร์ฟเวอร์ — หยุดวัดตอนสลับไปแท็บอื่น
export function NetworkStat() {
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [kbps, setKbps] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let active = true;
    const ping = async () => {
      if (document.hidden) return;
      try {
        const ms = await timedFetch(0);
        if (active) {
          setPingMs(Math.round(ms));
          setOffline(false);
        }
      } catch {
        if (active) setOffline(true);
      }
    };
    const speed = async () => {
      if (document.hidden) return;
      try {
        const ms = await timedFetch(SPEED_TEST_KB);
        if (active) setKbps(Math.round((SPEED_TEST_KB * 1024 * 8) / 1000 / (ms / 1000)));
      } catch {
        if (active) setOffline(true);
      }
    };
    void ping();
    void speed();
    const p = setInterval(ping, PING_EVERY_MS);
    const s = setInterval(speed, SPEED_EVERY_MS);
    return () => {
      active = false;
      clearInterval(p);
      clearInterval(s);
    };
  }, []);

  const pingColor =
    offline || pingMs === null ? "text-rose-400" : pingMs < 80 ? "text-emerald-400" : pingMs < 200 ? "text-amber-300" : "text-rose-400";

  return (
    <div
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]"
      title={`ping ทุก ${PING_EVERY_MS / 1000} วิ · ความเร็ว = ดาวน์โหลดทดสอบ ${SPEED_TEST_KB} KB ทุก ${SPEED_EVERY_MS / 1000} วิ`}
    >
      <Activity className={`h-3.5 w-3.5 ${pingColor}`} />
      {offline ? (
        <span className="font-bold text-rose-400">OFFLINE</span>
      ) : (
        <>
          <span className={`font-bold ${pingColor}`}>{pingMs ?? "--"} ms</span>
          <span className="text-muted">|</span>
          <span className="font-bold">{kbps !== null ? kbps.toLocaleString() : "--"} kbps</span>
        </>
      )}
    </div>
  );
}
