"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BracketFormat, Category, CategorySetting, Match, SeedingMode, SingleEntryResolution, Team } from "@/lib/types";
import { previewRoundNames } from "@/lib/bracket/generate";
import { formatLabel, singleEntryLabel } from "@/lib/view";
import { notifyDataChanged } from "@/lib/data/live";
import { ConfirmButton, btn } from "@/components/ui/ConfirmButton";
import type { ActionResult } from "@/lib/actions";
import { drawAction, generateAction, knockoutAction, resolveSingleEntryAction, saveSettingAction } from "@/app/admin/categories/actions";

type Props = { category: Category; teams: Team[]; setting: CategorySetting; matches: Match[]; siblings: Category[] };

const FORMATS: BracketFormat[] = ["single", "double", "round_robin", "groups"];

export function CategorySetupClient({ category, teams, setting, matches, siblings }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    format: setting.format,
    third_place: setting.third_place,
    group_count: setting.group_count,
    advance_per_group: setting.advance_per_group,
    seeding: setting.seeding as SeedingMode,
    best_of_by_round: { ...setting.best_of_by_round },
  });
  const [order, setOrder] = useState<string[]>(() => {
    const ids = teams.map((t) => t.id);
    const kept = setting.seed_order.filter((id) => ids.includes(id));
    return [...kept, ...ids.filter((id) => !kept.includes(id))];
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mergeInto, setMergeInto] = useState(setting.merge_into_category_id ?? siblings[0]?.id ?? "");

  const locked = matches.some((m) => m.status !== "scheduled" || m.game_scores.length > 0);
  const groupDone = matches.length > 0 && matches.filter((m) => m.stage === "group").every((m) => m.status === "certified");
  const koExists = matches.some((m) => m.stage !== "group");
  const nm = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
  const previewSetting: CategorySetting = { ...setting, ...form };
  const rounds = useMemo(() => previewRoundNames(previewSetting, teams.length), [previewSetting, teams.length]);

  const act = async (fn: () => Promise<ActionResult<unknown>>, okText: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: okText } : { ok: false, text: res.error });
    if (res.ok) {
      notifyDataChanged();
      router.refresh();
    }
    return res.ok;
  };

  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
  };
  const setPos = (i: number, pos: number) => {
    const j = Math.min(order.length, Math.max(1, Math.floor(pos))) - 1;
    if (j === i) return;
    const next = [...order];
    const [item] = next.splice(i, 1);
    next.splice(j, 0, item);
    setOrder(next);
  };

  const hasKo = form.format === "single" || form.format === "groups";
  const field = "rounded bg-bg p-2 text-sm";

  if (teams.length === 1) {
    return (
      <section className="space-y-3 rounded border border-amber-400/40 bg-surface/60 p-3 text-sm">
        <h2 className="font-bold text-amber-300">⚠ ประเภทนี้มีผู้สมัคร 1 คน: {nm(teams[0].id)}</h2>
        <p className="text-muted">สถานะปัจจุบัน: {singleEntryLabel[setting.single_entry]}</p>
        <div className="flex flex-wrap gap-2">
          <button className={btn} disabled={busy} onClick={() => act(() => resolveSingleEntryAction(category.id, "walkover"), "บันทึกแล้ว: ได้รางวัลโดยไม่มีคู่แข่ง")}>
            ได้รางวัลโดยไม่มีคู่แข่ง
          </button>
          <div className="flex items-center gap-2">
            <select className={field} value={mergeInto} onChange={(e) => setMergeInto(e.target.value)}>
              {siblings.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ConfirmButton
              label="ยุบรวมกับประเภทนี้"
              question="ยืนยันย้ายผู้สมัครไปประเภทที่เลือก? (ย้อนกลับต้องทำเองในหน้าทีม/นักกีฬา)"
              disabled={busy || !mergeInto}
              onConfirm={() => act(() => resolveSingleEntryAction(category.id, "merge", mergeInto), "ยุบรวมแล้ว")}
            />
          </div>
          <ConfirmButton
            label="ยกเลิกประเภท"
            question="ยืนยันยกเลิกประเภทนี้?"
            danger
            disabled={busy}
            onConfirm={() => act(() => resolveSingleEntryAction(category.id, "cancel"), "ยกเลิกประเภทแล้ว")}
          />
          {setting.single_entry !== "pending" && (
            <button className={btn} disabled={busy} onClick={() => act(() => resolveSingleEntryAction(category.id, "pending"), "ล้างการเลือกแล้ว")}>
              ล้างการเลือก
            </button>
          )}
        </div>
        {msg && <p className={msg.ok ? "text-emerald-400" : "text-live"} role="status">{msg.text}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {locked && <p className="rounded bg-amber-500/10 p-2 text-sm text-amber-300">🔒 สายถูกล็อกแล้ว (มีแมตช์เริ่มแข่ง/มีผล) — เปลี่ยนรูปแบบ ลำดับ หรือสร้างใหม่ไม่ได้ · แก้ BO ได้เฉพาะแมตช์ที่ยังไม่เริ่ม</p>}

      <section className="space-y-3 rounded bg-surface/60 p-3">
        <h2 className="font-bold text-accent-2">รูปแบบแข่ง</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            รูปแบบ
            <select className={field} disabled={locked} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as BracketFormat })}>
              {FORMATS.map((f) => <option key={f} value={f}>{formatLabel[f]}</option>)}
            </select>
            {form.format === "double" && <span className="text-xs text-muted">ชิงชนะเลิศนัดเดียว (ไม่มีนัดแก้มือ)</span>}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={!hasKo} checked={hasKo && form.third_place} onChange={(e) => setForm({ ...form, third_place: e.target.checked })} />
            ชิงอันดับ 3 {hasKo ? "" : "(ไม่ใช้กับรูปแบบนี้ — ปิด = ทองแดงร่วม 2 ทีม)"}
          </label>
          {form.format === "groups" && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                จำนวนกลุ่ม
                <input type="number" min={1} max={8} className={field} disabled={locked} value={form.group_count} onChange={(e) => setForm({ ...form, group_count: Number(e.target.value) || 1 })} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                เข้ารอบต่อกลุ่ม
                <input type="number" min={1} className={field} disabled={locked} value={form.advance_per_group} onChange={(e) => setForm({ ...form, advance_per_group: Number(e.target.value) || 1 })} />
              </label>
            </>
          )}
        </div>

        <div>
          <div className="mb-1 text-sm">BO ต่อรอบ <span className="text-xs text-muted">(ค่าตั้งต้น BO1 · รองชนะเลิศ/ชิง BO3)</span></div>
          <div className="grid gap-1 sm:grid-cols-2">
            {rounds.map((r) => (
              <label key={r.key} className="flex items-center justify-between gap-2 rounded bg-bg/60 px-2 py-1 text-sm">
                <span className="truncate">{r.label}</span>
                <select
                  className="rounded bg-bg p-1"
                  value={form.best_of_by_round[r.key] ?? ""}
                  onChange={(e) => {
                    const next = { ...form.best_of_by_round };
                    if (e.target.value) next[r.key] = Number(e.target.value);
                    else delete next[r.key];
                    setForm({ ...form, best_of_by_round: next });
                  }}
                >
                  <option value="">ค่าตั้งต้น</option>
                  {[1, 3, 5, 7].map((n) => <option key={n} value={n}>BO{n}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
        <button className={`${btn} text-accent`} disabled={busy} onClick={() => act(() => saveSettingAction(category.id, form), "บันทึกการตั้งค่าแล้ว")}>
          บันทึกการตั้งค่า
        </button>
      </section>

      <section className="space-y-3 rounded bg-surface/60 p-3">
        <h2 className="font-bold text-accent-2">การวางสาย</h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input type="radio" name="seeding" disabled={locked} checked={form.seeding === "random"} onChange={() => setForm({ ...form, seeding: "random" })} /> สุ่ม (จับสลาก)
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="seeding" disabled={locked} checked={form.seeding === "manual"} onChange={() => setForm({ ...form, seeding: "manual" })} /> เรียงเอง
          </label>
          {form.seeding === "random" && (
            <>
              <button className={btn} disabled={busy || locked} onClick={() => act(() => drawAction(category.id), "จับสลากแล้ว — กดสร้างสายเพื่อใช้ลำดับนี้")}>
                🎲 จับสลาก
              </button>
              {setting.seed_order.length > 0 && (
                <Link href={`/admin/categories/${category.id}/draw`} className={btn}>📺 แสดงผลจับสลากบนจอ</Link>
              )}
            </>
          )}
        </div>
        {form.seeding === "manual" && (
          <div className="space-y-1">
            {order.map((id, i) => (
              <div key={id} className="flex items-center gap-2 text-sm">
                <input type="number" min={1} max={order.length} className="w-14 rounded bg-bg p-1 text-center" disabled={locked} value={i + 1} onChange={(e) => setPos(i, Number(e.target.value))} />
                <button className={btn} disabled={locked || i === 0} onClick={() => move(i, -1)} aria-label="ขึ้น">▲</button>
                <button className={btn} disabled={locked || i === order.length - 1} onClick={() => move(i, 1)} aria-label="ลง">▼</button>
                <span className="truncate">{nm(id)}</span>
              </div>
            ))}
            <button className={btn} disabled={busy || locked} onClick={() => act(() => saveSettingAction(category.id, { seeding: "manual", seed_order: order }), "บันทึกลำดับแล้ว")}>
              บันทึกลำดับ
            </button>
          </div>
        )}
        {form.seeding === "random" && setting.seed_order.length > 0 && (
          <ol className="grid gap-x-4 text-sm text-muted sm:grid-cols-2">
            {setting.seed_order.map((id, i) => <li key={id}>{i + 1}. {nm(id)}</li>)}
          </ol>
        )}
        <div className="flex flex-wrap gap-2">
          {matches.length === 0 ? (
            <button className={`${btn} text-accent`} disabled={busy} onClick={() => act(() => generateAction(category.id), "สร้างสายแล้ว")}>
              สร้างสาย
            </button>
          ) : (
            <ConfirmButton
              label="สร้างสายใหม่"
              question={`มีสายอยู่แล้ว ${matches.length} แมตช์ (ยังไม่มีผล) — สร้างใหม่จะลบแมตช์เดิมทั้งหมด ยืนยัน?`}
              danger
              disabled={busy || locked}
              onConfirm={() => act(() => generateAction(category.id), "สร้างสายใหม่แล้ว")}
            />
          )}
          {form.format === "groups" && matches.length > 0 && (
            <ConfirmButton
              label={koExists ? "สร้างรอบน็อกเอาต์ใหม่" : "สร้างรอบน็อกเอาต์จากอันดับกลุ่ม"}
              question={groupDone ? "ยืนยันสร้างรอบน็อกเอาต์จากอันดับกลุ่มปัจจุบัน?" : "รอบแบ่งกลุ่มยังไม่จบ (ต้องรับรองผลทุกแมตช์) — ลองต่อไหม?"}
              disabled={busy}
              onConfirm={() => act(() => knockoutAction(category.id), "สร้างรอบน็อกเอาต์แล้ว")}
            />
          )}
        </div>
        <p className="text-xs text-muted">ใช้การตั้งค่าที่บันทึกแล้ว — ถ้าเพิ่งเปลี่ยนรูปแบบ ให้กด “บันทึกการตั้งค่า” ก่อน · จำนวนไม่ใช่กำลังสอง → ทีมลำดับต้น ๆ ได้ bye อัตโนมัติ</p>
      </section>

      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-live"}`} role="status">{msg.text}</p>}
    </div>
  );
}
