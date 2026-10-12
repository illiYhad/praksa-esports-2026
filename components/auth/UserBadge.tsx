import Link from "next/link";
import { getStaff, mockBlocked, mockInProduction, ROLE_LABEL } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { signOutAction } from "@/app/login/actions";

/** มุมขวาหัวเว็บ: สถานะล็อกอิน (server component) */
export async function UserBadge() {
  if (mockInProduction) return <span className="ml-auto rounded bg-live px-2 py-0.5 text-[11px] font-bold text-white">โหมดทดสอบบน production · ทุกคนเป็นแอดมิน</span>;
  if (mockBlocked) return <span className="ml-auto rounded bg-live/20 px-2 py-0.5 text-[11px] text-live">ยังไม่ได้ตั้งค่าฐานข้อมูล</span>;
  if (!hasSupabaseEnv) return <span className="ml-auto rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-300">โหมดทดสอบ · ไม่มีล็อกอิน</span>;
  const staff = await getStaff();
  if (!staff) return <Link href="/login" className="ml-auto text-xs text-muted hover:text-accent">เข้าสู่ระบบสตาฟ</Link>;
  return (
    <form action={signOutAction} className="ml-auto flex items-center gap-2 text-xs text-muted">
      <span>{staff.email} · {ROLE_LABEL[staff.role]}</span>
      <button className="rounded bg-surface px-2 py-0.5 hover:text-accent">ออก</button>
    </form>
  );
}
