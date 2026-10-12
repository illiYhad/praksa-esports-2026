import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStaff, mockBlocked, BLOCKED_MESSAGE, ROLE_LABEL } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { signOutAction } from "@/app/login/actions";
import { KrasaLogo, Seal } from "@/components/brand/Brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "เข้าสู่ระบบสตาฟ" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string }> }) {
  const q = await searchParams;
  const Brand = () => (
    <div className="flex flex-col items-center gap-3 py-2">
      <KrasaLogo variant="white" width={280} priority />
      <Seal size={72} />
    </div>
  );
  if (mockBlocked) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded bg-surface p-4 text-sm">
        <Brand />
        <h1 className="text-lg font-bold text-live">{BLOCKED_MESSAGE}</h1>
        <p className="text-muted">เซิร์ฟเวอร์นี้ยังไม่ได้ใส่ค่า Supabase ใน env จึงเปิดเฉพาะหน้าสาธารณะ</p>
      </div>
    );
  }
  if (!hasSupabaseEnv) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded bg-surface p-4 text-sm">
        <Brand />
        <h1 className="text-lg font-bold">โหมดทดสอบ (ยังไม่ต่อ Supabase)</h1>
        <p className="text-muted">ไม่มีล็อกอิน — ทุกหน้าเปิดได้ในสิทธิ์แอดมิน · เมื่อใส่ค่า Supabase ใน .env.local ระบบจะเปิดล็อกอินและกั้นหน้าสตาฟตามบทบาทอัตโนมัติ</p>
        <Link href={q.next ?? "/admin"} className="text-accent">ไปต่อ →</Link>
      </div>
    );
  }
  const staff = await getStaff();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Brand />
      <h1 className="text-center text-lg font-bold">เข้าสู่ระบบสตาฟ</h1>
      {q.denied && <p className="rounded bg-live/20 p-2 text-sm text-live">บัญชีนี้ไม่มีสิทธิ์เข้า {q.denied}</p>}
      {staff ? (
        <div className="space-y-2 rounded bg-surface p-3 text-sm">
          <div>ล็อกอินอยู่: <b>{staff.email}</b> · {ROLE_LABEL[staff.role]}</div>
          <form action={signOutAction}>
            <button className="rounded bg-surface px-3 py-1 text-sm font-bold hover:bg-white/10">ออกจากระบบ</button>
          </form>
        </div>
      ) : (
        <LoginForm next={q.next ?? "/admin"} />
      )}
    </div>
  );
}
