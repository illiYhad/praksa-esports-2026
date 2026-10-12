import { cache } from "react";
import type { StaffRole } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

export type Staff = { id: string; email: string; role: StaffRole };

/** โหมดทดสอบ (ไม่มี Supabase env): ทุกคนเป็น admin ชื่อ dev — ห้ามใช้บน production */
const DEV_STAFF: Staff = { id: "dev-admin", email: "dev@local", role: "admin" };

/** ผู้ใช้ที่ล็อกอิน + บทบาทจาก staff_profiles (cache ต่อ request) · null = ยังไม่ล็อกอิน/ไม่ใช่สตาฟ */
export const getStaff = cache(async (): Promise<Staff | null> => {
  if (!hasSupabaseEnv) return DEV_STAFF;
  const sb = await createServerSupabase();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("staff_profiles").select("id,email,role").eq("id", user.id).maybeSingle();
  if (!data) return null;
  return { id: data.id as string, email: data.email as string, role: data.role as StaffRole };
});

export const ROLE_LABEL: Record<StaffRole, string> = { admin: "แอดมิน", result_staff: "สตาฟกรอกผล", stream_operator: "คนคุมจอ" };

/** ตรวจบทบาทฝั่ง server (ใช้ในทุก server action / route) — ไม่ผ่านให้ throw ข้อความไทย */
export async function requireRole(...roles: StaffRole[]): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) throw new Error("กรุณาล็อกอินก่อน");
  if (!roles.includes(staff.role)) throw new Error(`ไม่มีสิทธิ์ — ต้องเป็น ${roles.map((r) => ROLE_LABEL[r]).join(" / ")}`);
  return staff;
}

/** สิทธิ์ตามเส้นทาง (ใช้ทั้ง proxy.ts และหน้าเว็บ) */
export const PATH_ROLES: { prefix: string; roles: StaffRole[] }[] = [
  { prefix: "/admin/result", roles: ["admin", "result_staff"] },
  { prefix: "/admin/photos", roles: ["admin", "result_staff"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/print", roles: ["admin"] },
  { prefix: "/checkin", roles: ["admin", "result_staff"] },
  { prefix: "/stream-hub", roles: ["admin", "stream_operator"] },
];

export function rolesForPath(path: string): StaffRole[] | undefined {
  return PATH_ROLES.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`))?.roles;
}
