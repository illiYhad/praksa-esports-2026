import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Praksa Esports 2026",
  description: "การแข่งขัน Esports เทศบาลแพรกษา",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="min-h-screen">
        <header className="border-b border-white/10 bg-surface px-4 py-3 flex items-center gap-6">
          <Link href="/" className="font-bold text-accent">Praksa Esports 2026</Link>
          <nav className="flex gap-4 text-sm text-muted">
            <Link href="/bracket/rov">สาย</Link>
            <Link href="/display/rov">บอร์ดสถานี</Link>
            <Link href="/checkin">เช็กอิน</Link>
            <Link href="/admin">แอดมิน</Link>
            <Link href="/stream-hub">ห้องคุม</Link>
          </nav>
        </header>
        <main className="p-4 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
