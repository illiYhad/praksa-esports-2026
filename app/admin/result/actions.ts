"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { GameScore, MatchAuditLog } from "@/lib/types";

export type { ActionResult };

// กรอกผล/รับรอง = admin หรือ result_staff (ตรวจบทบาทฝั่ง server ทุกครั้ง · staff_id ลง reported_by / certified_by / audit ผ่าน engine)
const staff = <T,>(fn: () => Promise<T>) => run(async () => { await requireRole("admin", "result_staff"); return fn(); });

export async function saveProgressAction(matchId: string, scores: GameScore[]): Promise<ActionResult> {
  return staff(async () => void (await data.saveProgress(matchId, scores)));
}
export async function saveResultAction(matchId: string, scores: GameScore[]): Promise<ActionResult> {
  return staff(async () => void (await data.saveResult(matchId, scores)));
}
export async function certifyAction(matchId: string): Promise<ActionResult> {
  return staff(async () => void (await data.certifyMatch(matchId)));
}
export async function uncertifyAction(matchId: string): Promise<ActionResult> {
  return staff(async () => void (await data.uncertifyMatch(matchId)));
}
export async function loadAuditAction(matchId: string): Promise<MatchAuditLog[]> {
  try {
    await requireRole("admin", "result_staff");
    return await data.getAuditLogs(matchId);
  } catch {
    return [];
  }
}
