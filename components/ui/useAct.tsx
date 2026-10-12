"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notifyDataChanged } from "@/lib/data/live";
import type { ActionResult } from "@/lib/actions";

export type Msg = { ok: boolean; text: string } | null;

/** เรียก server action → แสดงข้อความ → แจ้งแท็บอื่น + โหลดข้อมูลใหม่ */
export function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const act = async <T,>(fn: () => Promise<ActionResult<T>>, okText: string | ((d: T | undefined) => string)): Promise<ActionResult<T>> => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    setMsg(res.ok ? { ok: true, text: typeof okText === "function" ? okText(res.data) : okText } : { ok: false, text: res.error });
    if (res.ok) {
      notifyDataChanged();
      router.refresh();
    }
    return res;
  };

  return { busy, msg, setMsg, act };
}

export function MsgLine({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-live"}`} role="status">
      {msg.text}
    </p>
  );
}
