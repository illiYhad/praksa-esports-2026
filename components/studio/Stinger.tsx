"use client";

import React, { useEffect, useRef } from "react";
import type { Sponsor } from "@/lib/types";
import { BRAND, KrasaLogo, KrasaMark, Seal } from "@/components/brand/Brand";
import { SponsorLogo } from "./SponsorLogo";

export const STINGER_MS = 1400;
const COVER_AT = 0.5; // สัดส่วนเวลาที่จอถูกปิดมิด (สลับฉากตรงนี้ = 700ms)

/**
 * สติงเกอร์ KRASA GAMES 2026 (ใบ 1418 ข้อ 3.1): แผ่นน้ำเงินเอียงกวาดเข้า → เส้นคลื่นฟ้าวิ่งตาม → โลโก้บินเข้า → ตรา/สปอนเซอร์ → ปิดมิด (onCovered) → ค้าง → กวาดออก
 * playId เปลี่ยน = เล่น 1 รอบ · videoSrc (.webm) = ใช้วิดีโอแทนทั้งหมด · title ใช้เป็น aria-label เท่านั้น
 */
export function Stinger({
  playId,
  onCovered,
  title,
  sponsor,
  videoSrc,
}: {
  playId: number;
  onCovered: () => void;
  title: string;
  sponsor?: Sponsor;
  videoSrc?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const coveredRef = useRef(onCovered);
  useEffect(() => {
    coveredRef.current = onCovered;
  }, [onCovered]);

  useEffect(() => {
    if (!playId) return;
    const root = rootRef.current;
    if (!root) return;
    root.style.visibility = "visible";
    const anims: Animation[] = [];
    if (!videoSrc) {
      const plate = plateRef.current, l1 = line1Ref.current, l2 = line2Ref.current, logo = logoRef.current, credit = creditRef.current;
      if (!plate || !l1 || !l2 || !logo || !credit) return;
      const opts = { duration: STINGER_MS, easing: "linear", fill: "forwards" as const };
      const sweep = "cubic-bezier(.7,0,.3,1)";
      // แผ่นน้ำเงิน: 0→45% กวาดเข้า · ค้าง · 68→100% กวาดออกขวา
      anims.push(plate.animate([
        { transform: "skewX(-12deg) translateX(-115%)", offset: 0, easing: sweep },
        { transform: "skewX(-12deg) translateX(0%)", offset: 0.45 },
        { transform: "skewX(-12deg) translateX(0%)", offset: 0.68, easing: sweep },
        { transform: "skewX(-12deg) translateX(115%)", offset: 1 },
      ], opts));
      // เส้นคลื่นฟ้า 2 เส้น: 10→55% วิ่งซ้าย→ขวา ตามหลังแผ่น
      for (const [el, delay] of [[l1, 0], [l2, 0.04]] as const) {
        anims.push(el.animate([
          { transform: "rotate(-4deg) translateX(-120%)", opacity: 0, offset: 0 },
          { transform: "rotate(-4deg) translateX(-120%)", opacity: 1, offset: 0.10 + delay, easing: sweep },
          { transform: "rotate(-4deg) translateX(120%)", opacity: 1, offset: 0.55 + delay },
          { transform: "rotate(-4deg) translateX(120%)", opacity: 0, offset: 0.6 + delay },
          { transform: "rotate(-4deg) translateX(120%)", opacity: 0, offset: 1 },
        ], opts));
      }
      // โลโก้: 25→50% บินเข้า · ค้าง · 68→100% จางออก
      anims.push(logo.animate([
        { opacity: 0, transform: "scale(.82) translateX(-60px)", offset: 0 },
        { opacity: 0, transform: "scale(.82) translateX(-60px)", offset: 0.25, easing: "cubic-bezier(.2,.8,.2,1)" },
        { opacity: 1, transform: "scale(1) translateX(0)", offset: 0.5 },
        { opacity: 1, transform: "scale(1) translateX(0)", offset: 0.68, easing: "ease-in" },
        { opacity: 0, transform: "scale(1.06) translateX(0)", offset: 1 },
      ], opts));
      // ตรา + จัดโดย + สปอนเซอร์: 40→50% fade in · ค้าง · 68→100% จางออก
      anims.push(credit.animate([
        { opacity: 0, transform: "scale(1)", offset: 0 },
        { opacity: 0, transform: "scale(1)", offset: 0.4 },
        { opacity: 1, transform: "scale(1)", offset: 0.5 },
        { opacity: 1, transform: "scale(1)", offset: 0.68 },
        { opacity: 0, transform: "scale(1.06)", offset: 1 },
      ], opts));
    }
    const t = window.setTimeout(() => coveredRef.current(), STINGER_MS * COVER_AT);
    const end = window.setTimeout(() => {
      root.style.visibility = "hidden";
    }, STINGER_MS + (videoSrc ? 1600 : 0));
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(end);
      anims.forEach((a) => a.cancel());
      root.style.visibility = "hidden";
    };
  }, [playId, videoSrc]);

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={title}
      className="pointer-events-none absolute inset-0 z-[90] overflow-hidden"
      style={{ visibility: "hidden" }}
    >
      {videoSrc ? (
        <video src={videoSrc} key={playId} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          {/* แผ่นน้ำเงินเอียง + ลายน้ำนก */}
          <div ref={plateRef} className="absolute -inset-x-[20%] inset-y-0 overflow-hidden" style={{ background: "linear-gradient(120deg, var(--brand-navy) 0%, var(--brand-blue) 100%)", transform: "skewX(-12deg) translateX(-115%)" }}>
            <div className="absolute right-[18%] top-1/2 -translate-y-1/2" style={{ opacity: 0.06, transform: "skewX(12deg) translateY(-50%)" }}>
              <KrasaMark variant="white" size={900} />
            </div>
          </div>
          {/* เส้นคลื่นฟ้า */}
          <div ref={line1Ref} className="absolute left-0 top-[52%] h-[14px] w-full" style={{ background: "linear-gradient(90deg, var(--accent), var(--brand-cyan))", opacity: 0 }} />
          <div ref={line2Ref} className="absolute left-0 top-[56%] h-[6px] w-full" style={{ background: "linear-gradient(90deg, var(--accent), var(--brand-cyan))", opacity: 0 }} />
          {/* โลโก้ */}
          <div ref={logoRef} className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0 }}>
            <KrasaLogo variant="white" width={920} priority />
          </div>
          {/* ตรา + จัดโดย + สปอนเซอร์ */}
          <div ref={creditRef} className="absolute inset-x-0 bottom-0 top-[70%] flex flex-col items-center justify-between pb-10" style={{ opacity: 0 }}>
            <div className="flex items-center gap-5">
              <Seal size={120} />
              <div className="text-[28px] font-bold">จัดโดย {BRAND.organizer}</div>
            </div>
            {sponsor && (
              <div className="flex items-center gap-4 text-2xl text-muted">
                <span>สนับสนุนโดย</span>
                <SponsorLogo sponsor={sponsor} className="h-20" />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
