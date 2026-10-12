import { hasSupabaseEnv } from "@/lib/supabase/env";
import { mockSource } from "./mock";
import { supabaseSource } from "./supabase";
import type { DataSource } from "./source";

// มี NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY → Supabase · ไม่มี → mock ในหน่วยความจำ (โหมดทดสอบ ไม่มีล็อกอิน)
export const data: DataSource = hasSupabaseEnv ? supabaseSource : mockSource;
export type { DataSource };
