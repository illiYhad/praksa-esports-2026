"use client";

import React from "react";

export function PrintToolbar() {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center gap-2 bg-black/80 px-4 py-2 text-sm text-white">
      <button onClick={() => window.print()} className="rounded bg-white px-3 py-1 font-bold text-black">🖨 พิมพ์</button>
      <button onClick={() => (window.history.length > 1 ? window.history.back() : window.close())} className="rounded border border-white/40 px-3 py-1">ปิด</button>
      <span className="text-white/60">ตั้งค่าเครื่องพิมพ์: A4 · ปิดหัว/ท้ายกระดาษของเบราว์เซอร์</span>
    </div>
  );
}
