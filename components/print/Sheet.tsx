import React from "react";
import { EVENT } from "@/lib/event";

/** กระดาษ A4 (พรีวิวบนจอ) + หัวกระดาษชื่องาน */
export function Sheet({ children, landscape, title, subtitle }: { children: React.ReactNode; landscape?: boolean; title: string; subtitle?: string }) {
  return (
    <div
      className={`sheet mx-auto my-4 bg-white p-[12mm] text-black shadow-lg ${landscape ? "w-[297mm] min-h-[210mm]" : "w-[210mm] min-h-[297mm]"}`}
      style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', system-ui, sans-serif" }}
    >
      {landscape && <style>{"@page { size: A4 landscape; }"}</style>}
      <header className="mb-4 border-b-2 border-black pb-2 text-center">
        <div className="text-[11pt]">{EVENT.titleLine1}</div>
        <div className="text-[14pt] font-bold">{EVENT.titleLine2}</div>
        <div className="text-[10pt]">กีฬาอีสปอร์ต · จัดโดย {EVENT.organizer}</div>
        <h1 className="mt-2 text-[16pt] font-bold">{title}</h1>
        {subtitle && <div className="text-[11pt]">{subtitle}</div>}
      </header>
      {children}
      <footer className="mt-6 text-right text-[8pt] text-gray-500">ระบบโดย {EVENT.provider}</footer>
    </div>
  );
}
