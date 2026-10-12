import React from "react";
import type { Sponsor } from "@/lib/types";

/** โลโก้สปอนเซอร์ — ถ้ายังไม่มีไฟล์โลโก้ แสดงชื่อเป็นข้อความแทน */
export function SponsorLogo({ sponsor, className = "h-12" }: { sponsor: Sponsor; className?: string }) {
  if (!sponsor.logo_url) return <span className="font-bold">{sponsor.name}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={sponsor.logo_url} alt={sponsor.name} className={`${className} w-auto object-contain`} />;
}
