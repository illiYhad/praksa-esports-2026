"use server";

import { data } from "@/lib/data";
import type { GameScore, MatchAuditLog } from "@/lib/types";

// ยังไม่มีระบบล็อกอิน (รอ K-S4) — จึงยังไม่ใส่ staff_id ลง reported_by / certified_by / audit
export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function saveProgressAction(matchId: string, scores: GameScore[]): Promise<ActionResult> {
  return run(() => data.saveProgress(matchId, scores));
}
export async function saveResultAction(matchId: string, scores: GameScore[]): Promise<ActionResult> {
  return run(() => data.saveResult(matchId, scores));
}
export async function certifyAction(matchId: string): Promise<ActionResult> {
  return run(() => data.certifyMatch(matchId));
}
export async function uncertifyAction(matchId: string): Promise<ActionResult> {
  return run(() => data.uncertifyMatch(matchId));
}
export async function loadAuditAction(matchId: string): Promise<MatchAuditLog[]> {
  return data.getAuditLogs(matchId);
}
