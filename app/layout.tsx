import type { Metadata } from "next";
import Link from "next/link";
import { EVENT } from "@/lib/event";
import { data } from "@/lib/data";
import { UserBadge } from "@/components/auth/UserBadge";
import "./globals.css";

export const metadata: Metadata = {
  title: EVENT.shortTitle,
  description: `${EVENT.titleLine1} ${EVENT.titleLine2} · ${EVENT.organizer}`,
};

/** สีจากตั้งค่างาน (ถ้าตั้ง) ทับค่าตั้งต้นใน globals.css */
function themeStyle(theme?: { accent?: string; accent2?: string; bg?: string }): string {
  if (!theme) return "";
  const ok = (v?: string) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
  const parts = [ok(theme.accent) && `--accent:${theme.accent}`, ok(theme.accent2) && `--accent-2:${theme.accent2}`, ok(theme.bg) && `--bg:${theme.bg}`].filter(Boolean);
  return parts.length ? `:root{${parts.join(";")}}` : "";
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await data.getEventConfig();
  const css = themeStyle(config.theme);
  return (
    <html lang="th">
      <body className="min-h-screen">
        {css && <style>{css}</style>}
        <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/10 bg-surface px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-accent">
            {config.logo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={config.logo_url} alt="" className="h-8 w-auto" />}
            {EVENT.shortTitle}
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm text-muted">
            <Link href="/bracket/rov">สาย</Link>
            <Link href="/athletes">นักกีฬา</Link>
            <Link href="/teams">ทีม</Link>
            <Link href="/display/rov">บอร์ดสถานี</Link>
            <Link href="/checkin">เช็กอิน</Link>
            <Link href="/admin">แอดมิน</Link>
            <Link href="/stream-hub">ห้องคุม</Link>
          </nav>
          <UserBadge />
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
        <footer className="px-4 py-6 text-center text-xs text-muted">
          จัดโดย {EVENT.organizer} · ระบบโดย {EVENT.provider}
        </footer>
      </body>
    </html>
  );
}
