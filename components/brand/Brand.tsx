import React from "react";
import Image from "next/image";

// คอมโพเนนต์แบรนด์กลาง — ทุกหน้าเรียกจากที่นี่ (ห้ามเขียน <img> โลโก้กระจายเอง)
// ไฟล์ใน public/brand/ (ใบ 1418 ข้อ 0) · กฎ: กำหนดแค่กว้างหรือสูงอย่างเดียว (ไม่ยืด/บีบ) · โลโก้เต็มเล็กสุด 120px · ตราเล็กสุด 32px · ห้ามใส่ฟิลเตอร์ตรา

export const BRAND = {
  logoWhite: "/brand/krasa-games-2026_white.svg",
  logoColor: "/brand/krasa-games-2026_color.svg",
  logoWhitePng: "/brand/krasa-games-2026_white_3000.png",
  markWhite: "/brand/krasa-mark_white.svg",
  markColor: "/brand/krasa-mark_color.svg",
  markPng: "/brand/krasa-mark_512.png",
  sealSvg: "/brand/seal-praksa_color.svg",
  sealPng: "/brand/seal-praksa_color_3000.png",
  /** สัดส่วนโลโก้เต็ม 560×390 */
  logoRatio: 390 / 560,
  alt: "KRASA GAMES 2026",
  sealAlt: "ตราเทศบาลตำบลแพรกษา",
  organizer: "เทศบาลตำบลแพรกษา",
} as const;

type Variant = "white" | "color";

/** โลโก้เต็ม KRASA GAMES 2026 · width ≥ 120 (เล็กกว่านั้นใช้ KrasaMark) · src = ไฟล์แทน (จากตั้งค่างาน) */
export function KrasaLogo({ variant = "white", width, className = "", src, priority }: { variant?: Variant; width: number; className?: string; src?: string; priority?: boolean }) {
  const w = Math.max(120, Math.round(width));
  const h = Math.round(w * BRAND.logoRatio);
  if (src) {
    // โลโก้ที่แอดมินตั้งเอง — สัดส่วนไม่รู้ จึงกำหนดแค่ความสูง
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={BRAND.alt} style={{ height: h, width: "auto" }} className={className} />;
  }
  return <Image src={variant === "white" ? BRAND.logoWhite : BRAND.logoColor} alt={BRAND.alt} width={w} height={h} unoptimized priority={priority} className={className} style={{ width: w, height: "auto" }} />;
}

/** นกอย่างเดียว (ไม่มีตัวอักษร) — ใช้ที่เล็กกว่า 120px · ลายน้ำ · ไอคอน */
export function KrasaMark({ variant = "white", size, className = "", style }: { variant?: Variant; size: number; className?: string; style?: React.CSSProperties }) {
  const s = Math.round(size);
  return <Image src={variant === "white" ? BRAND.markWhite : BRAND.markColor} alt="" aria-hidden width={s} height={s} unoptimized className={className} style={{ width: s, height: s, ...style }} />;
}

/** ตราเทศบาลตำบลแพรกษา (PNG 3000 ให้ Next ย่อ) · size ≥ 32 · ห้ามเปลี่ยนสี/ฟิลเตอร์ */
export function Seal({ size, className = "", priority }: { size: number; className?: string; priority?: boolean }) {
  const s = Math.max(32, Math.round(size));
  return <Image src={BRAND.sealPng} alt={BRAND.sealAlt} title={BRAND.sealAlt} width={s} height={s} sizes={`${s}px`} priority={priority} className={`shrink-0 ${className}`} style={{ width: s, height: s }} />;
}

/** ตรา + เส้นคั่น + KRASA ขาว ในกล่องโปร่ง (มุมจอ overlay) · sm = ตรา 64 + โลโก้ 130 · md = ตรา 96 + โลโก้ 200 */
export function OfficialBug({ size = "sm", className = "", style }: { size?: "sm" | "md"; className?: string; style?: React.CSSProperties }) {
  const seal = size === "sm" ? 64 : 96;
  const logo = size === "sm" ? 130 : 200;
  return (
    <div className={`flex items-center gap-4 rounded-xl bg-bg/70 px-4 py-2 ${className}`} style={style}>
      <Seal size={seal} />
      <div className="h-12 w-px bg-white/30" />
      <KrasaLogo variant="white" width={logo} />
    </div>
  );
}

/** แถบบนของฉากเต็มจอ (overlay): ซ้าย = ตรา 96 + "จัดโดย / เทศบาลตำบลแพรกษา" · ขวา = KRASA 240 (ซ่อนได้เมื่อมีโลโก้ใหญ่กลางจอ) */
export function OfficialHeader({ showLogo = true }: { showLogo?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-x-16 top-12 z-20 flex items-start justify-between">
      <div className="flex items-center gap-4">
        <Seal size={96} />
        <div className="leading-tight">
          <div className="text-[20px] text-muted">จัดโดย</div>
          <div className="text-[30px] font-bold">{BRAND.organizer}</div>
        </div>
      </div>
      {showLogo && <KrasaLogo variant="white" width={240} />}
    </div>
  );
}

/** ลายน้ำนก (ชิดขวา หลังเนื้อหา) — ใส่ใน container ที่เป็น relative + overflow-hidden */
export function Watermark({ height, opacity = 0.05, className = "" }: { height: number; opacity?: number; className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-y-0 right-0 z-0 flex items-center ${className}`} style={{ opacity }} aria-hidden>
      <KrasaMark variant="white" size={height} />
    </div>
  );
}
