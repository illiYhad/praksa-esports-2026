import React from "react";
import { initialsOf } from "@/lib/people";

const SIZES = { sm: "h-8 w-8 text-xs", md: "h-24 w-20 text-xl", lg: "h-48 w-40 text-4xl", xl: "h-80 w-64 text-6xl", fill: "h-full w-full text-5xl" };

/** รูปตัดพื้นบนพื้นสีงาน · ไม่มีรูป = เงา + อักษรย่อ */
export function Avatar({ src, name, size = "md", className = "" }: { src?: string; name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <div
      className={`relative flex shrink-0 items-end justify-center overflow-hidden rounded-lg ${SIZES[size]} ${className}`}
      style={{ background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-2) 100%)" }}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-contain object-bottom" />
      ) : (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-black/25" aria-hidden>
            <circle cx="50" cy="36" r="20" fill="currentColor" />
            <path d="M10 100c0-24 18-38 40-38s40 14 40 38z" fill="currentColor" />
          </svg>
          <span className="relative mb-[12%] font-black text-white/90 drop-shadow">{initialsOf(name)}</span>
        </>
      )}
    </div>
  );
}
