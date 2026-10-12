import React from "react";
import { EVENT } from "@/lib/event";
import { BRAND } from "@/components/brand/Brand";

/** กระดาษ A4 (พรีวิวบนจอ) + หัวกระดาษ: ตรา SVG 22mm ซ้าย · ชื่องานเต็มกลาง · KRASA ตัวสี SVG 40mm ขวา · ท้ายกระดาษ */
export function Sheet({ children, landscape, title, subtitle }: { children: React.ReactNode; landscape?: boolean; title: string; subtitle?: string }) {
  return (
    <div
      className={`sheet mx-auto my-4 bg-white p-[12mm] text-black shadow-lg ${landscape ? "w-[297mm] min-h-[210mm]" : "w-[210mm] min-h-[297mm]"}`}
      style={{ fontFamily: "'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', system-ui, sans-serif" }}
    >
      {landscape && <style>{"@page { size: A4 landscape; }"}</style>}
      <header className="mb-4 border-b-2 border-black pb-2">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.sealSvg} alt={BRAND.sealAlt} style={{ width: "22mm", height: "22mm" }} />
          <div className="flex-1 text-center">
            <div className="text-[11pt]">{EVENT.titleLine1}</div>
            <div className="text-[14pt] font-bold">{EVENT.titleLine2}</div>
            <div className="text-[10pt]">กีฬาอีสปอร์ต · จัดโดย {EVENT.organizer}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND.logoColor} alt={BRAND.alt} style={{ width: "40mm", height: "auto" }} />
        </div>
        <h1 className="mt-2 text-center text-[16pt] font-bold">{title}</h1>
        {subtitle && <div className="text-center text-[11pt]">{subtitle}</div>}
      </header>
      {children}
      <footer className="mt-6 flex justify-between text-[8pt] text-gray-500">
        <span>{EVENT.shortTitle} · {EVENT.organizer}</span>
        <span>ระบบโดย {EVENT.provider}</span>
      </footer>
    </div>
  );
}
