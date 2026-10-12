import type { Metadata } from "next";
import { EVENT } from "@/lib/event";
import { data } from "@/lib/data";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import "./globals.css";

const description = `${EVENT.titleLine1} ${EVENT.titleLine2} · กีฬาอีสปอร์ต · จัดโดย ${EVENT.organizer}`;

export const metadata: Metadata = {
  title: { default: EVENT.shortTitle, template: `%s · ${EVENT.shortTitle}` },
  description,
  // รูปแชร์ใช้ app/opengraph-image.png อัตโนมัติ (ระบบไฟล์ metadata ของ Next)
  openGraph: { title: EVENT.shortTitle, description, siteName: EVENT.shortTitle, locale: "th_TH", type: "website" },
  twitter: { card: "summary_large_image", title: EVENT.shortTitle, description },
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
        <SiteHeader logoSrc={config.logo_url || undefined} />
        <main className="mx-auto max-w-6xl p-4">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
