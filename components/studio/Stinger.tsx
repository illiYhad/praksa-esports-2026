"use client";

import React, { useEffect, useRef } from "react";
import type { Sponsor } from "@/lib/types";
import { SponsorLogo } from "./SponsorLogo";

export const STINGER_MS = 1200;
const COVER_AT = 0.5; // สัดส่วนเวลาที่จอถูกปิดมิด (สลับฉากตรงนี้)

/**
 * สติงเกอร์เต็มจอ: แถบสี --accent กวาดเข้า → ปิดมิด (เรียก onCovered) → กวาดออก
 * playId เปลี่ยน = เล่น 1 รอบ · ส่ง videoSrc (.webm) เพื่อใช้วิดีโอแทนแอนิเมชันได้ภายหลัง
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
  const barRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const coveredRef = useRef(onCovered);
  useEffect(() => {
    coveredRef.current = onCovered;
  }, [onCovered]);

  useEffect(() => {
    if (!playId) return;
    const root = rootRef.current;
    const bar = barRef.current;
    const text = textRef.current;
    if (!root || !bar || !text) return;
    root.style.visibility = "visible";
    const opts = { duration: STINGER_MS, easing: "linear", fill: "forwards" as const };
    const a1 = bar.animate(
      [
        { transform: "translateX(-100%)", offset: 0, easing: "cubic-bezier(.7,0,.3,1)" },
        { transform: "translateX(0%)", offset: COVER_AT },
        { transform: "translateX(0%)", offset: 0.58, easing: "cubic-bezier(.7,0,.3,1)" },
        { transform: "translateX(100%)", offset: 1 },
      ],
      opts,
    );
    const a2 = text.animate(
      [
        { opacity: 0, transform: "scale(0.9)", offset: 0 },
        { opacity: 1, transform: "scale(1)", offset: 0.35 },
        { opacity: 1, transform: "scale(1)", offset: 0.65 },
        { opacity: 0, transform: "scale(1.05)", offset: 0.85 },
        { opacity: 0, transform: "scale(1.05)", offset: 1 },
      ],
      opts,
    );
    const t = window.setTimeout(() => coveredRef.current(), STINGER_MS * COVER_AT);
    a1.onfinish = () => {
      root.style.visibility = "hidden";
    };
    return () => {
      window.clearTimeout(t);
      a1.cancel();
      a2.cancel();
      root.style.visibility = "hidden";
    };
  }, [playId]);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-[90] flex items-center justify-center overflow-hidden"
      style={{ visibility: "hidden" }}
    >
      {videoSrc ? (
        <video src={videoSrc} key={playId} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div ref={barRef} className="absolute inset-0" style={{ background: "linear-gradient(120deg, var(--accent), var(--accent-2))" }} />
      )}
      <div ref={textRef} className="relative flex flex-col items-center gap-6 text-black" style={{ opacity: 0 }}>
        <div className="text-8xl font-black tracking-wide">{title}</div>
        {sponsor && (
          <div className="text-3xl font-bold">
            <SponsorLogo sponsor={sponsor} className="h-24" />
          </div>
        )}
      </div>
    </div>
  );
}
