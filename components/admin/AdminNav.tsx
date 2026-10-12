"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/admin", label: "ภาพรวม" },
  { href: "/admin/categories", label: "ประเภท / จัดสาย" },
  { href: "/admin/teams", label: "ทีม / นักกีฬา" },
  { href: "/admin/import", label: "นำเข้า" },
  { href: "/admin/schedule", label: "ตาราง / สถานี" },
  { href: "/admin/sponsors", label: "สปอนเซอร์" },
  { href: "/admin/settings", label: "ตั้งค่างาน" },
  { href: "/admin/photos", label: "ถ่ายรูป" },
  { href: "/admin/result", label: "กรอกผล" },
  { href: "/checkin", label: "เช็กอิน" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav className="no-print mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-2 text-sm">
      {TABS.map((t) => {
        const active = t.href === "/admin" ? path === "/admin" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`rounded px-3 py-1 ${active ? "bg-accent text-black" : "bg-surface text-muted hover:text-text"}`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
