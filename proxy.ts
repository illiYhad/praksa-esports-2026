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
  if (!url || !key) return response;

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

export const config = {
  matcher: ["/admin/:path*", "/print/:path*", "/checkin", "/stream-hub", "/api/photos"],
};
