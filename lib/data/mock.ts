import type { DataSource } from "./source";
import { subscribeDataChanges } from "./live";
import { db } from "./store";
import { Engine, type Ctx } from "./engine";
import { photoIdFor } from "@/lib/people";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";

// แหล่งข้อมูลจำลองในหน่วยความจำ — กติกาทั้งหมดอยู่ใน engine.ts (ใช้ร่วมกับ Supabase)
const NOW = () => new Date().toISOString();
let seq = 0;
const ctx: Ctx = {
  now: NOW,
  newId: (prefix) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}`,
};
const engine = () => new Engine(db, ctx);

const inGame = <T extends { category_id: string }>(rows: T[], gameId?: string) =>
  gameId ? rows.filter((r) => db.categories.find((c) => c.id === r.category_id)?.game_id === gameId) : rows;

export const mockSource: DataSource = {
  async getGames() { return db.games; },
  async getCategories(gameId) { return gameId ? db.categories.filter((c) => c.game_id === gameId) : db.categories; },
  async getTeams(gameId) { return inGame(db.teams, gameId); },
  async getPlayers(gameId) {
    if (!gameId) return db.players;
    const ids = new Set(inGame(db.teams, gameId).map((t) => t.id));
    return db.players.filter((p) => ids.has(p.team_id));
  },
  async getStations(gameId) { return gameId ? db.stations.filter((x) => x.game_id === gameId) : db.stations; },
  async getMatches(gameId) { return inGame(db.matches, gameId); },
  async getSponsors() { return db.sponsors; },
  async getAuditLogs(matchId) { return db.audit.filter((a) => a.match_id === matchId); },
  async getCategorySettings() { return db.categories.map((c) => db.settings.find((s) => s.category_id === c.id) ?? DEFAULT_SETTING(c.id)); },
  async getEventConfig() { return db.eventConfig; },
  async getPhotos() { return db.photos; },

  async saveProgress(matchId, scores) { return engine().saveProgress(matchId, scores); },
  async saveResult(matchId, scores) { return engine().saveResult(matchId, scores); },
  async certifyMatch(matchId) { return engine().certifyMatch(matchId); },
  async uncertifyMatch(matchId) { return engine().uncertifyMatch(matchId); },
  async setCheckIn(teamId, checkedIn) { return engine().setCheckIn(teamId, checkedIn); },

  async saveCategorySetting(categoryId, patch) { return engine().saveCategorySetting(categoryId, patch); },
  async drawSeedOrder(categoryId) { return engine().drawSeedOrder(categoryId); },
  async generateBracket(categoryId) { return engine().generateBracket(categoryId); },
  async generateKnockout(categoryId) { return engine().generateKnockout(categoryId); },
  async resolveSingleEntry(categoryId, resolution, mergeInto) { return engine().resolveSingleEntry(categoryId, resolution, mergeInto); },

  async createTeam(categoryId, input) { return engine().createTeam(categoryId, input); },
  async updateTeam(teamId, patch) { return engine().updateTeam(teamId, patch); },
  async deleteTeam(teamId) { engine().deleteTeam(teamId); },
  async createPlayer(teamId, input) { return engine().createPlayer(teamId, input); },
  async updatePlayer(playerId, patch) { return engine().updatePlayer(playerId, patch); },
  async deletePlayer(playerId) { engine().deletePlayer(playerId); },

  async previewImport(text) { return engine().previewImport(text); },
  async applyImport(text) { return engine().applyImport(text); },

  async updateMatchSchedule(matchId, patch) { return engine().updateMatchSchedule(matchId, patch); },
  async autoQueue(gameId) { return engine().autoQueue(gameId); },

  async createSponsor(input) { return engine().createSponsor(input); },
  async updateSponsor(sponsorId, patch) { return engine().updateSponsor(sponsorId, patch); },
  async deleteSponsor(sponsorId) { engine().deleteSponsor(sponsorId); },

  async saveEventConfig(patch) { return engine().saveEventConfig(patch); },

  async savePhoto(personKey, upload) {
    if (!upload.cutout.length || !upload.original.length) throw new Error("ไม่มีข้อมูลรูป");
    const id = photoIdFor(personKey);
    db.photoFiles.set(id, { original: upload.original, originalMime: upload.originalMime || "image/jpeg", cutout: upload.cutout });
    const v = Date.now().toString(36);
    return engine().savePhotoRow(personKey, { original_url: `/api/photos/${id}/original?v=${v}`, cutout_url: `/api/photos/${id}/cutout?v=${v}` }, upload.consent);
  },
  async setPhotoConsent(photoId, consent) { return engine().setPhotoConsent(photoId, consent); },
  async deletePhoto(photoId) {
    engine().deletePhotoRow(photoId);
    db.photoFiles.delete(photoId);
  },
  async getPhotoFile(photoId, kind) {
    const f = db.photoFiles.get(photoId);
    if (!f) return null;
    return kind === "original" ? { bytes: f.original, mime: f.originalMime } : { bytes: f.cutout, mime: "image/png" };
  },

  subscribe: subscribeDataChanges,
};
