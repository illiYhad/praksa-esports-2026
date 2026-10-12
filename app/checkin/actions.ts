"use server";

import { data } from "@/lib/data";
import { run, type ActionResult } from "@/lib/actions";

// ยังไม่มีระบบล็อกอิน — เฟส F จะตรวจบทบาท admin/result_staff
export async function setCheckInAction(teamId: string, checkedIn: boolean): Promise<ActionResult> {
  return run(async () => void (await data.setCheckIn(teamId, checkedIn)));
}
