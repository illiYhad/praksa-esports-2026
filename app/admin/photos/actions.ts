"use server";

import { data } from "@/lib/data";
import { run, type ActionResult } from "@/lib/actions";

// ยังไม่มีระบบล็อกอิน — เฟส F จะตรวจบทบาท admin / result_staff
export async function setPhotoConsentAction(photoId: string, consent: boolean): Promise<ActionResult> {
  return run(async () => void (await data.setPhotoConsent(photoId, consent)));
}
export async function deletePhotoAction(photoId: string): Promise<ActionResult> {
  return run(() => data.deletePhoto(photoId));
}
