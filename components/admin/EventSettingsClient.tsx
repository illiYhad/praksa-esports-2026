"use client";

import React, { useState } from "react";
import type { EventConfig } from "@/lib/types";
import { btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { saveEventConfigAction } from "@/app/admin/actions";

const field = "min-w-0 rounded bg-bg p-2 text-sm";

export function EventSettingsClient({ config }: { config: EventConfig }) {
  const [days, setDays] = useState<string[]>([0, 1, 2, 3].map((i) => config.days[i] ?? ""));
  const [announcement, setAnnouncement] = useState(config.announcement);
  const [logo, setLogo] = useState(config.logo_url ?? "");
  const [theme, setTheme] = useState({ accent: config.theme?.accent ?? "", accent2: config.theme?.accent2 ?? "", bg: config.theme?.bg ?? "" });
  const { busy, msg, act } = useAct();

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded bg-surface/60 p-3">
        <h2 className="font-bold text-accent-2">วันแข่ง</h2>
        <div className="grid gap-2 sm:grid-cols-4">
          {days.map((d, i) => (
            <label key={i} className="flex flex-col text-xs text-muted">
              วันที่ {i + 1}
              <input type="date" className={field} value={d} onChange={(e) => setDays(days.map((x, k) => (k === i ? e.target.value : x)))} />
            </label>
          ))}
        </div>
      </section>
      <section className="space-y-2 rounded bg-surface/60 p-3">
        <h2 className="font-bold text-accent-2">ข้อความประกาศหน้าแรก</h2>
        <textarea className={`${field} h-24 w-full`} placeholder="ว่าง = ไม่แสดง" value={announcement} onChange={(e) => setAnnouncement(e.target.value)} />
      </section>
      <section className="space-y-2 rounded bg-surface/60 p-3">
        <h2 className="font-bold text-accent-2">โลโก้ / สีงาน</h2>
        <label className="flex flex-col text-xs text-muted">URL โลโก้หัวเว็บ (ว่าง = ค่าตั้งต้น /brand/krasa-games-2026_white.svg)<input className={field} placeholder="/brand/krasa-games-2026_white.svg" value={logo} onChange={(e) => setLogo(e.target.value)} /></label>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["accent", "accent2", "bg"] as const).map((k) => (
            <label key={k} className="flex flex-col text-xs text-muted">
              {k === "accent" ? "สีหลัก" : k === "accent2" ? "สีรอง" : "สีพื้น"} (hex · ว่าง = ค่าเดิม)
              <div className="flex gap-2">
                <input className={`${field} flex-1`} placeholder="#38bdf8" value={theme[k]} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} />
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(theme[k]) ? theme[k] : "#000000"} onChange={(e) => setTheme({ ...theme, [k]: e.target.value })} aria-label="เลือกสี" />
              </div>
            </label>
          ))}
        </div>
      </section>
      <button
        className={`${btn} text-accent`}
        disabled={busy}
        onClick={() => act(() => saveEventConfigAction({ days, announcement, logo_url: logo || undefined, theme }), "บันทึกตั้งค่างานแล้ว")}
      >
        บันทึก
      </button>
      <MsgLine msg={msg} />
    </div>
  );
}
