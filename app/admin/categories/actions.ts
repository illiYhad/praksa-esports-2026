"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { CategorySetting, SingleEntryResolution } from "@/lib/types";

// ทุก action ตรวจบทบาท admin ฝั่ง server ก่อนเสมอ
const admin = <T,>(fn: () => Promise<T>) => run(async () => { await requireRole("admin"); return fn(); });

export async function saveSettingAction(
  categoryId: string,
  patch: Partial<Omit<CategorySetting, "category_id" | "updated_at">>,
): Promise<ActionResult> {
  return admin(async () => void (await data.saveCategorySetting(categoryId, patch)));
}
export async function drawAction(categoryId: string): Promise<ActionResult> {
  return admin(async () => void (await data.drawSeedOrder(categoryId)));
}
export async function generateAction(categoryId: string): Promise<ActionResult<number>> {
  return admin(async () => (await data.generateBracket(categoryId)).length);
}
export async function knockoutAction(categoryId: string): Promise<ActionResult<number>> {
  return admin(async () => (await data.generateKnockout(categoryId)).length);
}
export async function resolveSingleEntryAction(categoryId: string, resolution: SingleEntryResolution, mergeInto?: string): Promise<ActionResult> {
  return admin(async () => void (await data.resolveSingleEntry(categoryId, resolution, mergeInto)));
}
