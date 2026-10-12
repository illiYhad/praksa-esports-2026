"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

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
    // รับเฉพาะ path ภายในเว็บ (กัน open redirect เช่น //evil.com)
    const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/admin";
    router.replace(safe);
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
