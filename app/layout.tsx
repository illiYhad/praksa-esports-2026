import type { Metadata } from "next";
import Link from "next/link";
import { EVENT } from "@/lib/event";
import "./globals.css";

export const metadata: Metadata = {
  title: EVENT.shortTitle,
  description: `${EVENT.titleLine1} ${EVENT.titleLine2} · ${EVENT.organizer}`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 bg-surface px-4 py-3">
          <Link href="/" className="font-bold text-accent">{EVENT.shortTitle}</Link>
          <nav className="flex flex-wrap gap-4 text-sm text-muted">
            <Link href="/bracket/rov">สาย</Link>
            <Link href="/athletes">นักกีฬา</Link>
            <Link href="/teams">ทีม</Link>
            <Link href="/display/rov">บอร์ดสถานี</Link>
            <Link href="/checkin">เช็กอิน</Link>
            <Link href="/admin">แอดมิน</Link>
            <Link href="/stream-hub">ห้องคุม</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
        <footer className="px-4 py-6 text-center text-xs text-muted">
          จัดโดย {EVENT.organizer} · ระบบโดย {EVENT.provider}
        </footer>
      </body>
    </html>
  );
}
