"use client";

import React, { useState } from "react";
import type { ImportPreview } from "@/lib/types";
import { btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { applyImportAction, previewImportAction } from "@/app/admin/actions";

const EXAMPLE = `## categories
code,game,name
rov-m-u16,rov,ประเภททีมชาย ROV รุ่น 16 ปี

## teams
team_code,name
T20,เทศบาลตำบลตัวอย่าง

## players
category_code,team_code,order_in_team,real_name
rov-m-u16,T20,1,ชื่อ นามสกุล
rov-m-u16,T20,2,ชื่อ นามสกุล`;

export function ImportClient() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const { busy, msg, act } = useAct();

  const Summary = ({ p, applied }: { p: ImportPreview; applied: boolean }) => (
    <div className="space-y-1 rounded bg-surface/60 p-3 text-sm">
      <div className="font-bold text-accent-2">{applied ? "นำเข้าแล้ว" : "พรีวิว (ยังไม่บันทึก)"}</div>
      <div>ประเภทใหม่: {p.newCategories.length ? p.newCategories.join(", ") : "-"}</div>
      <div>ทีม: ใหม่ {p.newTeams} · มีอยู่แล้ว {p.existingTeams}</div>
      <div>นักกีฬา: ใหม่ {p.newPlayers} · ซ้ำ (ข้าม) {p.existingPlayers}</div>
      {p.unknownGames.length > 0 && <div className="text-live">ไม่รู้จักเกม: {p.unknownGames.join(", ")} (ประเภทเหล่านั้นถูกข้าม)</div>}
      {p.errors.map((e) => <div key={e} className="text-live">{e}</div>)}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        วางข้อความรูปแบบเดียวกับไฟล์รายชื่อ (3 ส่วน <code>## categories</code> · <code>## teams</code> · <code>## players</code> คั่นด้วยจุลภาค) · รายการที่มีอยู่แล้ว (รหัส อปท. + ประเภท / ชื่อจริง + รหัส อปท.) จะถูกข้าม ไม่สร้างซ้ำ · <b>ห้ามใส่เลขบัตร วันเกิด เบอร์ โรงเรียน</b>
      </p>
      <textarea
        className="h-64 w-full rounded bg-surface p-2 font-mono text-xs"
        placeholder={EXAMPLE}
        value={text}
        onChange={(e) => { setText(e.target.value); setPreview(null); }}
      />
      <div className="flex flex-wrap gap-2">
        <button className={btn} disabled={busy || !text.trim()} onClick={async () => {
          const r = await act(() => previewImportAction(text), "พรีวิวแล้ว — ตรวจตัวเลขก่อนยืนยัน");
          setPreview(r.ok ? r.data ?? null : null);
        }}>พรีวิว</button>
        <button className={`${btn} text-accent`} disabled={busy || !preview} onClick={async () => {
          const r = await act(() => applyImportAction(text), (d) => `นำเข้าแล้ว: ทีมใหม่ ${d?.newTeams ?? 0} · นักกีฬาใหม่ ${d?.newPlayers ?? 0}`);
          if (r.ok) { setPreview(null); setText(""); }
        }}>ยืนยันนำเข้า</button>
        <button className={btn} onClick={() => setText(EXAMPLE)}>ใส่ตัวอย่าง</button>
      </div>
      <MsgLine msg={msg} />
      {preview && <Summary p={preview} applied={false} />}
    </div>
  );
}
