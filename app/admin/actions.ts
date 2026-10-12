"use server";

import { data } from "@/lib/data";
import { run, type ActionResult } from "@/lib/actions";
import type { PlayerInput, SchedulePatch, TeamInput } from "@/lib/data/source";
import type { EventConfig, ImportPreview, Sponsor } from "@/lib/types";

// ยังไม่มีระบบล็อกอิน — เฟส F จะตรวจบทบาท admin ในทุก action นี้

export async function createTeamAction(categoryId: string, input: TeamInput & { name: string }): Promise<ActionResult> {
  return run(async () => void (await data.createTeam(categoryId, input)));
}
export async function updateTeamAction(teamId: string, patch: TeamInput): Promise<ActionResult> {
  return run(async () => void (await data.updateTeam(teamId, patch)));
}
export async function deleteTeamAction(teamId: string): Promise<ActionResult> {
  return run(() => data.deleteTeam(teamId));
}
export async function createPlayerAction(teamId: string, input: PlayerInput): Promise<ActionResult> {
  return run(async () => void (await data.createPlayer(teamId, input)));
}
export async function updatePlayerAction(playerId: string, patch: PlayerInput): Promise<ActionResult> {
  return run(async () => void (await data.updatePlayer(playerId, patch)));
}
export async function deletePlayerAction(playerId: string): Promise<ActionResult> {
  return run(() => data.deletePlayer(playerId));
}

export async function previewImportAction(text: string): Promise<ActionResult<ImportPreview>> {
  return run(() => data.previewImport(text));
}
export async function applyImportAction(text: string): Promise<ActionResult<ImportPreview>> {
  return run(() => data.applyImport(text));
}

export async function updateScheduleAction(matchId: string, patch: SchedulePatch): Promise<ActionResult> {
  return run(async () => void (await data.updateMatchSchedule(matchId, patch)));
}
export async function autoQueueAction(gameId: string): Promise<ActionResult<number>> {
  return run(async () => (await data.autoQueue(gameId)).length);
}

export async function createSponsorAction(input: Omit<Sponsor, "id">): Promise<ActionResult> {
  return run(async () => void (await data.createSponsor(input)));
}
export async function updateSponsorAction(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>): Promise<ActionResult> {
  return run(async () => void (await data.updateSponsor(sponsorId, patch)));
}
export async function deleteSponsorAction(sponsorId: string): Promise<ActionResult> {
  return run(() => data.deleteSponsor(sponsorId));
}

export async function saveEventConfigAction(patch: Partial<Omit<EventConfig, "updated_at">>): Promise<ActionResult> {
  return run(async () => void (await data.saveEventConfig(patch)));
}
