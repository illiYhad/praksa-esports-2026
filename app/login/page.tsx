import Link from "next/link";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { getStaff, ROLE_LABEL } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { signOutAction } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string }> }) {
  const q = await searchParams;
  if (!hasSupabaseEnv) {
    return (
      <div className="mx-auto max-w-md space-y-3 rounded bg-surface p-4 text-sm">
        <h1 className="text-lg font-bold">โหมดทดสอบ (ยังไม่ต่อ Supabase)</h1>
        <p className="text-muted">ไม่มีล็อกอิน — ทุกหน้าเปิดได้ในสิทธิ์แอดมิน · เมื่อใส่ค่า Supabase ใน .env.local ระบบจะเปิดล็อกอินและกั้นหน้าสตาฟตามบทบาทอัตโนมัติ</p>
        <Link href={q.next ?? "/admin"} className="text-accent">ไปต่อ →</Link>
      </div>
    );
  }
  const staff = await getStaff();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-lg font-bold">เข้าสู่ระบบสตาฟ</h1>
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
