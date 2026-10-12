"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

/** รับเฉพาะ path ภายในเว็บ: แปลงเป็น URL แล้วตรวจ origin (กัน open redirect ทุกรูปแบบ เช่น //evil.com · /\evil.com · อักขระควบคุม) */
function safeNext(next: string): string {
  if (!next.startsWith("/") || /[\u0000-\u001f\\]/.test(next)) return "/admin";
  try {
    const u = new URL(next, window.location.origin);
    if (u.origin !== window.location.origin) return "/admin";
    return u.pathname + u.search + u.hash;
  } catch {
    return "/admin";
  }
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createBrowserSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error.message);
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded bg-surface p-4">
      <label className="flex flex-col text-sm">
        อีเมล
        <input type="email" required autoComplete="username" className="rounded bg-bg p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="flex flex-col text-sm">
        รหัสผ่าน
        <input type="password" required autoComplete="current-password" className="rounded bg-bg p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="text-sm text-live" role="status">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded bg-accent px-3 py-2 font-bold text-black disabled:opacity-50">
        {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
      <p className="text-xs text-muted">บัญชีสตาฟสร้างโดยแอดมินเท่านั้น (ไม่มีสมัครเอง)</p>
    </form>
  );
}
