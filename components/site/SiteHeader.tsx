import Link from "next/link";
import { EVENT } from "@/lib/event";
import { KrasaLogo, Seal } from "@/components/brand/Brand";
import { UserBadge } from "@/components/auth/UserBadge";

/** หัวเว็บทุกหน้า (ยกเว้น overlay/print ที่ซ่อนด้วย CSS): KRASA ขาว สูง 40 (มือถือ 32) ซ้าย · ตรา 36 ขวา */
export function SiteHeader({ logoSrc }: { logoSrc?: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 bg-surface px-4 py-2">
      <Link href="/" className="flex items-center" aria-label={EVENT.shortTitle}>
        <span className="hidden sm:block"><KrasaLogo variant="white" width={Math.round(40 / (390 / 560))} src={logoSrc} priority /></span>
        <span className="sm:hidden"><KrasaLogo variant="white" width={Math.round(32 / (390 / 560))} src={logoSrc} priority /></span>
      </Link>
      <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <Link href="/bracket/rov">สาย</Link>
        <Link href="/athletes">นักกีฬา</Link>
        <Link href="/teams">ทีม</Link>
        <Link href="/display/rov">บอร์ดสถานี</Link>
        <Link href="/checkin">เช็กอิน</Link>
        <Link href="/admin">แอดมิน</Link>
        <Link href="/stream-hub">ห้องคุม</Link>
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <UserBadge />
        <Seal size={36} />
      </div>
    </header>
  );
}
