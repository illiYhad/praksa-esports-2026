"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeDataChanges } from "@/lib/data/live";

const POLL_MS = 10_000;

/** ให้หน้าสาธารณะโหลดข้อมูลใหม่เองเมื่อข้อมูลเปลี่ยน (ไม่รับคำสั่ง ไม่ใช้ CHANNEL_KEY) + ดึงซ้ำทุก 10 วิ กันกรณีคนละเครื่อง */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const off = subscribeDataChanges(() => router.refresh());
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, POLL_MS);
    return () => {
      off();
      clearInterval(t);
    };
  }, [router]);
  return null;
}
