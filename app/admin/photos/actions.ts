"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";

// สตาฟถ่ายรูป = admin หรือ result_staff (ตรวจฝั่ง server ทุกครั้ง)
const staff = <T,>(fn: () => Promise<T>) => run(async () => { await requireRole("admin", "result_staff"); return fn(); });

export async function setPhotoConsentAction(photoId: string, consent: boolean): Promise<ActionResult> {
  return staff(async () => void (await data.setPhotoConsent(photoId, consent)));
}
export async function deletePhotoAction(photoId: string): Promise<ActionResult> {
  return staff(() => data.deletePhoto(photoId));
}
