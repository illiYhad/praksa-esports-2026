"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";

// เช็กอิน = admin หรือ result_staff (ตรวจบทบาทฝั่ง server ทุกครั้ง)
export async function setCheckInAction(teamId: string, checkedIn: boolean): Promise<ActionResult> {
  return run(async () => {
    await requireRole("admin", "result_staff");
    await data.setCheckIn(teamId, checkedIn);
  });
}
