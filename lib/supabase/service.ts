import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// ⚠ ฝั่ง server เท่านั้น — ใช้เฉพาะเซ็น URL รูปใน bucket private หลัง route ตรวจ consent/สิทธิ์แล้ว · ห้ามใช้ query ตารางแทน RLS
export function createServiceSupabase(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
