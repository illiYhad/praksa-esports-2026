"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { EVENT } from "@/lib/event";
import { btn } from "@/components/ui/ConfirmButton";

/** แสดงผลจับสลากทีละทีมบนจอ — ลำดับถูกสุ่มและบันทึกไว้แล้ว หน้านี้แค่เปิดเผยทีละลำดับ */
export function DrawReveal({ title, names, backHref }: { title: string; names: string[]; backHref: string }) {
  const [n, setN] = useState(0);
  const next = () => setN((x) => Math.min(names.length, x + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowRight" || e.code === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names.length]);

  return (
    <>
      <style>{"header,footer{display:none}main{max-width:none;padding:0}"}</style>
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="text-2xl text-muted">{EVENT.shortTitle} · จับสลากวางสาย</div>
        <h1 className="text-4xl font-bold">{title}</h1>
        <div key={n} className="animate-pop min-h-28 text-6xl font-black text-accent">
          {n === 0 ? <span className="text-3xl text-muted">กด “ถัดไป” หรือ Space เพื่อเริ่ม</span> : <>ลำดับที่ {n}: {names[n - 1]}</>}
        </div>
        <ol className="grid w-full max-w-4xl gap-x-8 gap-y-1 text-left text-2xl sm:grid-cols-2">
          {names.map((name, i) => (
            <li key={i} className={i < n ? "" : "text-muted/40"}>
              {i + 1}. {i < n ? name : "…"}
            </li>
          ))}
        </ol>
        <div className="no-print flex gap-2">
          <button className={`${btn} text-lg`} onClick={next} disabled={n >= names.length}>ถัดไป ▶</button>
          <button className={btn} onClick={() => setN(names.length)}>เปิดทั้งหมด</button>
          <button className={btn} onClick={() => setN(0)}>เริ่มใหม่</button>
          <Link href={backHref} className={btn}>กลับ</Link>
        </div>
      </div>
    </>
  );
}
