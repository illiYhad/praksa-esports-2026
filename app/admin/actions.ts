"use server";

import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";
import { run, type ActionResult } from "@/lib/actions";
import type { PlayerInput, SchedulePatch, TeamInput } from "@/lib/data/source";
import { manualConflicts, matchLabel } from "@/lib/data/queue";
import type { EventConfig, ImportPreview, Sponsor } from "@/lib/types";

// ทุก action ตรวจบทบาท admin ฝั่ง server ก่อนเสมอ (ไม่พึ่งหน้าเว็บ/proxy อย่างเดียว)
const admin = <T,>(fn: () => Promise<T>) => run(async () => { await requireRole("admin"); return fn(); });

export async function createTeamAction(categoryId: string, input: TeamInput & { name: string }): Promise<ActionResult> {
  return admin(async () => void (await data.createTeam(categoryId, input)));
}
export async function updateTeamAction(teamId: string, patch: TeamInput): Promise<ActionResult> {
  return admin(async () => void (await data.updateTeam(teamId, patch)));
}
export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  return admin(() => data.deleteTeam(teamId));
}
export async function createPlayerAction(teamId: string, input: PlayerInput): Promise<ActionResult> {
  return admin(async () => void (await data.createPlayer(teamId, input)));
}
export async function updatePlayerAction(playerId: string, patch: PlayerInput): Promise<ActionResult> {
  return admin(async () => void (await data.updatePlayer(playerId, patch)));
}
export async function deletePlayerAction(playerId: string): Promise<ActionResult> {
  return admin(() => data.deletePlayer(playerId));
}

export async function previewImportAction(text: string): Promise<ActionResult<ImportPreview>> {
  return admin(() => data.previewImport(text));
}
export async function applyImportAction(text: string): Promise<ActionResult<ImportPreview>> {
  return admin(() => data.applyImport(text));
}

export async function updateScheduleAction(matchId: string, patch: SchedulePatch): Promise<ActionResult> {
  return admin(async () => void (await data.updateMatchSchedule(matchId, patch)));
}
/** ก่อนบันทึกตารางด้วยมือ: คืนป้ายแมตช์ที่มีนักกีฬาซ้ำในเวลาเดียวกัน (ไม่มีชื่อคน) · ว่าง = ไม่ชน */
export async function scheduleConflictsAction(matchId: string, patch: SchedulePatch): Promise<ActionResult<string[]>> {
  return admin(async () => {
    const [categories, teams, players, matches] = await Promise.all([data.getCategories(), data.getTeams(), data.getPlayers(), data.getMatches()]);
    const m = matches.find((x) => x.id === matchId);
    if (!m) throw new Error("ไม่พบแมตช์");
    const next = { ...m };
    if (patch.station_id !== undefined) next.station_id = patch.station_id || undefined;
    if (patch.scheduled_time !== undefined) next.scheduled_time = patch.scheduled_time || undefined;
    return manualConflicts(next, { categories, teams, players, matches }).map((o) => matchLabel(o, categories));
  });
}
export async function autoQueueAction(gameId: string): Promise<ActionResult<number>> {
  return admin(async () => (await data.autoQueue(gameId)).length);
}

export async function createSponsorAction(input: Omit<Sponsor, "id">): Promise<ActionResult> {
  return admin(async () => void (await data.createSponsor(input)));
}
export async function updateSponsorAction(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>): Promise<ActionResult> {
  return admin(async () => void (await data.updateSponsor(sponsorId, patch)));
}
export async function deleteSponsorAction(sponsorId: string): Promise<ActionResult> {
  return admin(() => data.deleteSponsor(sponsorId));
}

export async function saveEventConfigAction(patch: Partial<Omit<EventConfig, "updated_at">>): Promise<ActionResult> {
  return admin(async () => void (await data.saveEventConfig(patch)));
}
