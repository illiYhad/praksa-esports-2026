"use server";

import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";

export async function signOutAction() {
  if (hasSupabaseEnv) {
    const sb = await createServerSupabase();
    await sb.auth.signOut();
  }
  redirect("/");
}
