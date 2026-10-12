"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AthletePhoto } from "@/lib/types";
import { DEFAULT_CHROMA, chromaKey, fitCanvas, type ChromaOptions } from "@/lib/chroma";
import { notifyDataChanged } from "@/lib/data/live";
import { ConfirmButton, btn } from "@/components/ui/ConfirmButton";
import { KrasaMark } from "@/components/brand/Brand";
import { MsgLine, useAct } from "@/components/ui/useAct";
import { deletePhotoAction, setPhotoConsentAction } from "@/app/admin/photos/actions";

type PersonRow = { key: string; name: string; ign: string; teams: string; categories: string };
const PREVIEW_MAX = 1000;
const ORIGINAL_MAX = 1600;
// พื้นพรีวิว = พื้นงานจริง (navy→blue + ลายน้ำนก) ตรงกับ Avatar บนเว็บ
const BRAND_BG = "linear-gradient(160deg, var(--brand-navy) 0%, var(--brand-blue) 100%)";

async function loadImage(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("เปิดรูปไม่ได้"));
      img.src = URL.createObjectURL(file);
    });
  }
}

export function PhotoStudioClient({ persons, photos }: { persons: PersonRow[]; photos: AthletePhoto[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [opts, setOpts] = useState<ChromaOptions>(DEFAULT_CHROMA);
  const [preview, setPreview] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const cutoutRef = useRef<HTMLCanvasElement | null>(null);
  const { busy, msg, act } = useAct();

  const needle = q.trim().toLowerCase();
  const list = useMemo(
    () => persons.filter((p) => !needle || `${p.name} ${p.ign} ${p.teams} ${p.categories}`.toLowerCase().includes(needle)).slice(0, 60),
    [persons, needle],
  );
  const person = persons.find((p) => p.key === selected);
  const existing = photos.find((p) => p.person_key === selected);
  const doneCount = new Set(photos.map((p) => p.person_key)).size;
  const consentCount = photos.filter((p) => p.consent).length;

  // ประมวลผลตัดพื้นใหม่เมื่อรูป/ตัวเลือกเปลี่ยน (หน่วงเล็กน้อยตอนลากแถบ)
  useEffect(() => {
    if (!source) return;
    const t = setTimeout(() => {
      const ctx = source.getContext("2d", { willReadFrequently: true })!;
      const out = chromaKey(ctx.getImageData(0, 0, source.width, source.height), opts);
      const c = document.createElement("canvas");
      c.width = source.width;
      c.height = source.height;
      c.getContext("2d")!.putImageData(out, 0, 0);
      cutoutRef.current = c;
      setPreview(c.toDataURL("image/png"));
    }, 120);
    return () => clearTimeout(t);
  }, [source, opts]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setSaveMsg(null);
    try {
      const img = await loadImage(file);
      setSource(fitCanvas(img, PREVIEW_MAX));
      (window as unknown as { __praksaOriginal?: HTMLCanvasElement }).__praksaOriginal = fitCanvas(img, ORIGINAL_MAX);
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : "เปิดรูปไม่ได้" });
    }
  };

  const save = async () => {
    if (!person || !cutoutRef.current) return;
    const original = (window as unknown as { __praksaOriginal?: HTMLCanvasElement }).__praksaOriginal ?? source;
    if (!original) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_key: person.key,
          original: original.toDataURL("image/jpeg", 0.85),
          cutout: cutoutRef.current.toDataURL("image/png"),
          consent,
        }),
      });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error ?? "บันทึกไม่สำเร็จ");
      setSaveMsg({ ok: true, text: `บันทึกรูปของ ${person.name} แล้ว` });
      setSource(null);
      setPreview(null);
      setConsent(false);
      notifyDataChanged();
      router.refresh();
    } catch (e) {
      setSaveMsg({ ok: false, text: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" });
    } finally {
      setSaving(false);
    }
  };

  const slider = (label: string, key: keyof ChromaOptions, min: number, max: number, step = 1) => (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="w-20">{label}</span>
      <input type="range" min={min} max={max} step={step} value={opts[key] as number} onChange={(e) => setOpts({ ...opts, [key]: Number(e.target.value) })} className="flex-1" />
      <span className="w-10 text-right">{opts[key] as number}</span>
    </label>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-2">
        <div className="rounded bg-surface p-2 text-sm">
          ถ่ายแล้ว <b className="text-accent">{doneCount}</b> / {persons.length} คน · ยินยอม {consentCount}
        </div>
        <input className="w-full rounded bg-surface p-2 text-sm" placeholder="ค้นชื่อ / ทีม / ประเภท" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
          {list.map((p) => {
            const has = photos.find((x) => x.person_key === p.key);
            return (
              <li key={p.key}>
                <button onClick={() => { setSelected(p.key); setSaveMsg(null); }} className={`w-full rounded p-2 text-left text-sm ${selected === p.key ? "bg-accent text-black" : "bg-surface"}`}>
                  <span>{has ? (has.consent ? "✅" : "🔒") : "⬜"}</span> <b>{p.name}</b>
                  <span className="block truncate text-xs opacity-70">{p.teams} · {p.categories}</span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="text-sm text-muted">ไม่พบ</li>}
        </ul>
      </aside>

      <section className="space-y-3">
        {!person ? (
          <p className="text-sm text-muted">เลือกนักกีฬาจากรายการซ้าย</p>
        ) : (
          <>
            <h2 className="text-lg font-bold">{person.name} <span className="text-sm font-normal text-muted">{person.teams}</span></h2>

            {existing && (
              <div className="flex flex-wrap items-center gap-3 rounded bg-surface/60 p-2 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={existing.cutout_url} alt="" className="h-24 w-20 rounded object-contain object-bottom" style={{ background: BRAND_BG }} />
                <div className="space-y-1">
                  <div>มีรูปแล้ว · {existing.consent ? "ยินยอมแล้ว (แสดงบนเว็บ)" : "ยังไม่ยินยอม (ไม่แสดงบนเว็บ)"}</div>
                  <div className="flex gap-2">
                    <button className={btn} disabled={busy} onClick={() => act(() => setPhotoConsentAction(existing.id, !existing.consent), "อัปเดตความยินยอมแล้ว")}>
                      {existing.consent ? "ถอนความยินยอม" : "ติ๊กยินยอม"}
                    </button>
                    <ConfirmButton label="ลบรูป" question="ลบรูปของนักกีฬาคนนี้?" danger disabled={busy} onConfirm={() => act(() => deletePhotoAction(existing.id), "ลบรูปแล้ว")} />
                  </div>
                  <MsgLine msg={msg} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <label className={`${btn} cursor-pointer text-accent`}>
                📷 ถ่ายจากกล้องเครื่อง
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <label className={`${btn} cursor-pointer`}>
                📁 อัปโหลดไฟล์
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>

            {source && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted">ต้นฉบับ</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={source.toDataURL("image/jpeg", 0.7)} alt="" className="w-full rounded" />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted">ตัดพื้นแล้ว (พรีวิวบนพื้นสีงาน)</div>
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded" style={{ background: BRAND_BG }}>
                    <div className="pointer-events-none absolute -right-[10%] -top-[8%] opacity-10" aria-hidden><KrasaMark variant="white" size={320} /></div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {preview && <img src={preview} alt="" className="relative h-full w-full object-contain object-bottom" />}
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  {slider("สีฉาก (องศา)", "hue", 0, 360)}
                  {slider("ความแรง", "tolerance", 5, 90)}
                  {slider("ขอบนุ่ม", "softness", 0, 60)}
                  {slider("อิ่มสีขั้นต่ำ", "minSaturation", 0.05, 0.8, 0.05)}
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input type="checkbox" checked={opts.spill} onChange={(e) => setOpts({ ...opts, spill: e.target.checked })} /> ลดสีเขียวสะท้อนที่ขอบ
                  </label>
                  <button className={btn} onClick={() => setOpts(DEFAULT_CHROMA)}>ค่าเริ่มต้น</button>
                </div>
                <label className="flex items-start gap-2 text-sm md:col-span-2">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                  <span>ได้รับความยินยอมให้ใช้รูปแล้ว (เยาวชน: ผู้ปกครองยินยอม) — <b>บังคับก่อนบันทึก</b> · ไม่ติ๊ก = ไม่แสดงรูปบนหน้าสาธารณะ</span>
                </label>
                <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                  <button className={`${btn} text-accent`} disabled={saving || !consent || !preview} onClick={save}>
                    {saving ? "กำลังบันทึก…" : "บันทึกรูป (ต้นฉบับ + ตัดพื้น)"}
                  </button>
                  <button className={btn} onClick={() => { setSource(null); setPreview(null); }}>ถ่ายใหม่</button>
                </div>
              </div>
            )}
            {saveMsg && <p className={`text-sm ${saveMsg.ok ? "text-emerald-400" : "text-live"}`} role="status">{saveMsg.text}</p>}
          </>
        )}
      </section>
    </div>
  );
}
