import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rolesForPath } from "@/lib/auth";
import type { StaffRole } from "@/lib/types";

// Next 16: proxy.ts (ชื่อเดิม middleware) — ต่ออายุ session + กั้นหน้าสตาฟตามบทบาท
// ไม่มี Supabase env → ปล่อยผ่าน (โหมดทดสอบ mock)
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !key) {
    // production ไม่มี env และไม่ได้ตั้ง ALLOW_MOCK_IN_PRODUCTION=1 → หน้าสตาฟ/การเขียนตอบ 503 (หน้าสาธารณะไม่ผ่าน matcher จึงเปิดได้ปกติ)
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_IN_PRODUCTION !== "1") {
      const path = request.nextUrl.pathname;
      if (rolesForPath(path) || (path === "/api/photos" && request.method === "POST")) return blocked(request);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // ต้องเรียก getUser ทุกครั้ง (ต่ออายุ token) — อย่าใช้ getSession ในที่นี้
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPhotoPost = path === "/api/photos" && request.method === "POST";
  const roles: StaffRole[] | undefined = rolesForPath(path) ?? (isPhotoPost ? ["admin", "result_staff"] : undefined);
  if (!roles) return response;

  const deny = (reason: "login" | "denied") => {
    if (isPhotoPost) return NextResponse.json({ ok: false, error: reason === "login" ? "กรุณาล็อกอิน" : "ไม่มีสิทธิ์" }, { status: reason === "login" ? 401 : 403 });
    const login = new URL("/login", request.url);
    login.searchParams.set(reason === "login" ? "next" : "denied", path);
    return NextResponse.redirect(login);
  };
  if (!user) return deny("login");
  const { data: prof } = await supabase.from("staff_profiles").select("role").eq("id", user.id).maybeSingle();
  if (!prof || !roles.includes(prof.role as StaffRole)) return deny("denied");
  return response;
}

const BLOCKED_MESSAGE = "ระบบยังไม่ได้ตั้งค่าฐานข้อมูล — ติดต่อผู้ดูแล";
function blocked(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ ok: false, error: BLOCKED_MESSAGE }, { status: 503 });
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ยังไม่ได้ตั้งค่าระบบ</title></head><body style="font-family:system-ui,sans-serif;background:#061537;color:#EEF4FF;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0"><main style="text-align:center;padding:24px"><h1 style="font-size:22px">${BLOCKED_MESSAGE}</h1><p style="color:#9DB2D6">หน้านี้ต้องใช้ฐานข้อมูลและการล็อกอิน (ยังไม่ได้ใส่ค่า Supabase ใน env ของเซิร์ฟเวอร์)</p><p><a href="/" style="color:#5BC8F2">กลับหน้าแรก</a></p></main></body></html>`;
  return new NextResponse(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export const config = {
  matcher: ["/admin/:path*", "/print/:path*", "/checkin", "/stream-hub", "/api/photos"],
};
