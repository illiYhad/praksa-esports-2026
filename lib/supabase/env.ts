// ใช้ได้ทั้ง server และ client (ค่า NEXT_PUBLIC_* ถูกฝังตอน build)
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** มี Supabase env ครบ → ใช้ Supabase + ล็อกอินจริง · ไม่มี → mock + โหมดทดสอบ (ไม่มีล็อกอิน) */
export const hasSupabaseEnv = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
export const PHOTO_BUCKET = "athlete-photos";
