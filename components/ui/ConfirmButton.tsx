"use client";

import React, { useState } from "react";

export const btn = "rounded bg-surface px-3 py-2 text-sm font-bold hover:bg-white/10 disabled:opacity-40";

/** ปุ่มที่ต้องยืนยันซ้ำ 1 ครั้งในหน้า (ไม่ใช้ dialog ของเบราว์เซอร์) */
export function ConfirmButton({
  label,
  question,
  onConfirm,
  disabled,
  danger,
}: {
  label: string;
  question: string;
  onConfirm: () => unknown;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button className={`${btn} ${danger ? "text-live" : ""}`} disabled={disabled} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded border border-amber-400/50 p-2 text-sm">
      <p>{question}</p>
      <div className="flex gap-2">
        <button
          className={`${btn} text-accent`}
          disabled={disabled}
          onClick={async () => {
            setOpen(false);
            await onConfirm();
          }}
        >
          ยืนยัน
        </button>
        <button className={btn} onClick={() => setOpen(false)}>ยกเลิก</button>
      </div>
    </div>
  );
}
