"use client";

import React, { useEffect, useState } from "react";
import type { Sponsor } from "@/lib/types";
import { SponsorLogo } from "./SponsorLogo";

/** แถบสปอนเซอร์ล่าง หมุนทุก 8 วินาที */
export function SponsorTicker({ sponsors }: { sponsors: Sponsor[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (sponsors.length < 2) return;
    const t = setInterval(() => setI((n) => n + 1), 8000);
    return () => clearInterval(t);
  }, [sponsors.length]);
  const s = sponsors.length ? sponsors[i % sponsors.length] : undefined;
  if (!s) return null;
  return (
    <div className="flex items-center gap-3 text-2xl text-muted">
      <span className="text-sm">สนับสนุนโดย</span>
      <SponsorLogo sponsor={s} className="h-10" />
    </div>
  );
}
