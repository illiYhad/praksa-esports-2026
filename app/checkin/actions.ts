"use server";

import { data } from "@/lib/data";

export async function setCheckInAction(teamId: string, checkedIn: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await data.setCheckIn(teamId, checkedIn);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
