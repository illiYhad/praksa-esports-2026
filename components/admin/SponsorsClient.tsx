"use client";

import React, { useState } from "react";
import type { Sponsor, SponsorLevel, SponsorPosition } from "@/lib/types";
import { ConfirmButton, btn } from "@/components/ui/ConfirmButton";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { createSponsorAction, deleteSponsorAction, updateSponsorAction } from "@/app/admin/actions";

const LEVELS: { v: SponsorLevel; label: string }[] = [
  { v: "main", label: "หลัก" },
  { v: "co", label: "ร่วม" },
  { v: "support", label: "สนับสนุน" },
];
const POSITIONS: { v: SponsorPosition; label: string }[] = [
  { v: "bottom_ticker", label: "แถบล่างหมุน" },
  { v: "corner", label: "มุมจอ" },
  { v: "stinger", label: "บนสติงเกอร์" },
  { v: "full_screen", label: "ฉาก SPONSOR เต็มจอ" },
];
const field = "min-w-0 rounded bg-bg p-2 text-sm";
const MAX_LOGO_BYTES = 400_000;

type Form = Omit<Sponsor, "id">;
const empty = (): Form => ({ name: "", level: "support", position: "bottom_ticker", sequence: 0, logo_url: "", is_active: true });

/** อ่านไฟล์โลโก้เป็น data URL (mock เก็บในหน่วยความจำ · Supabase จะอัปโหลดเข้า storage ภายหลัง) */
function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_LOGO_BYTES) return reject(new Error("ไฟล์โลโก้ใหญ่เกิน 400 KB"));
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("อ่านไฟล์ไม่ได้"));
    r.readAsDataURL(file);
  });
}

function SponsorForm({ initial, onSave, onDelete, busy }: { initial: Form; onSave: (f: Form) => Promise<unknown>; onDelete?: () => Promise<unknown>; busy: boolean }) {
  const [f, setF] = useState<Form>(initial);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="grid gap-2 rounded bg-surface/60 p-3 text-sm sm:grid-cols-6">
      <label className="flex flex-col text-xs text-muted sm:col-span-2">ชื่อ<input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="flex flex-col text-xs text-muted">ระดับ
        <select className={field} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as SponsorLevel })}>{LEVELS.map((l) => <option key={l.v} value={l.v}>{l.label}</option>)}</select>
      </label>
      <label className="flex flex-col text-xs text-muted">ตำแหน่ง
        <select className={field} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as SponsorPosition })}>{POSITIONS.map((p) => <option key={p.v} value={p.v}>{p.label}</option>)}</select>
      </label>
      <label className="flex flex-col text-xs text-muted">ลำดับ<input type="number" className={field} value={f.sequence} onChange={(e) => setF({ ...f, sequence: Number(e.target.value) || 0 })} /></label>
      <label className="flex items-center gap-2 pt-4 text-xs text-muted"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> เปิดใช้</label>
      <label className="flex flex-col text-xs text-muted sm:col-span-3">โลโก้ (URL หรือเลือกไฟล์)
        <input className={field} placeholder="https://…" value={f.logo_url.startsWith("data:") ? "(ไฟล์ที่อัปโหลด)" : f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} />
      </label>
      <label className="flex flex-col text-xs text-muted sm:col-span-2">ไฟล์โลโก้ (≤ 400 KB)
        <input type="file" accept="image/*" className="text-xs" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try { setF({ ...f, logo_url: await readLogo(file) }); setErr(null); } catch (x) { setErr(x instanceof Error ? x.message : "อ่านไฟล์ไม่ได้"); }
        }} />
      </label>
      <div className="flex items-end gap-2">
        {f.logo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={f.logo_url} alt="" className="h-10 w-auto rounded bg-white/10 object-contain" />}
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-6">
        <button className={`${btn} text-accent`} disabled={busy || !f.name.trim()} onClick={() => onSave(f)}>บันทึก</button>
        {onDelete && <ConfirmButton label="ลบ" question={`ลบสปอนเซอร์ ${f.name}?`} danger disabled={busy} onConfirm={onDelete} />}
        {err && <span className="text-live">{err}</span>}
      </div>
    </div>
  );
}

export function SponsorsClient({ sponsors }: { sponsors: Sponsor[] }) {
  const { busy, msg, act } = useAct();
  const [adding, setAdding] = useState(false);
  const sorted = [...sponsors].sort((a, b) => a.position.localeCompare(b.position) || a.sequence - b.sequence);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">1 แถว = 1 ตำแหน่ง · สปอนเซอร์ที่ต้องโผล่หลายตำแหน่งให้เพิ่มหลายแถว · ลำดับน้อยแสดงก่อน</p>
      {!adding ? (
        <button className={`${btn} text-accent`} onClick={() => setAdding(true)}>+ เพิ่มสปอนเซอร์</button>
      ) : (
        <SponsorForm initial={empty()} busy={busy} onSave={async (f) => { const r = await act(() => createSponsorAction(f), "เพิ่มแล้ว"); if (r.ok) setAdding(false); }} />
      )}
      <MsgLine msg={msg} />
      <div className="space-y-2">
        {sorted.map((s) => (
          <SponsorForm
            key={`${s.id}-${s.logo_url.length}`}
            initial={{ name: s.name, level: s.level, position: s.position, sequence: s.sequence, logo_url: s.logo_url, is_active: s.is_active }}
            busy={busy}
            onSave={(f) => act(() => updateSponsorAction(s.id, f), "บันทึกแล้ว")}
            onDelete={() => act(() => deleteSponsorAction(s.id), "ลบแล้ว")}
          />
        ))}
      </div>
    </div>
  );
}
