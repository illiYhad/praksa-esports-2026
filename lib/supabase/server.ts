import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Supabase client ฝั่ง server (server component · server action · route handler) ใช้ session ของผู้ใช้จาก cookie → RLS บังคับสิทธิ์ */
export async function createServerSupabase(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // เรียกจาก server component (ตั้ง cookie ไม่ได้) — proxy.ts เป็นคนต่ออายุ session ให้
        }
      },
    },
  });
}
