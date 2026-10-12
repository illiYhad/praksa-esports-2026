import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataSource } from "./source";
import { subscribeDataChanges } from "./live";
import { emptyStore, type Store } from "./defaults";
import { Engine, type Changes, type Ctx } from "./engine";
import { getStaff } from "@/lib/auth";
import { photoIdFor } from "@/lib/people";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { DEFAULT_SETTING } from "@/lib/bracket/generate";
import type { AthletePhoto, Category, CategorySetting, EventConfig, Game, Match, MatchAuditLog, Player, Sponsor, Station, Team } from "@/lib/types";

// แหล่งข้อมูลจริง: โหลดทุกตารางเป็น Store (ข้อมูลงานนี้เล็ก: ~60 ทีม · ~260 คน · <300 แมตช์)
// → รันกติกาใน Engine → เขียนเฉพาะแถวที่เปลี่ยน (RLS ของ Supabase บังคับสิทธิ์ตาม session ผู้ใช้)

type Row = Record<string, unknown>;
const nz = <T,>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

const COLS = {
  games: ["id", "name", "format", "code", "team_size"],
  categories: ["id", "game_id", "name", "code"],
  stations: ["id", "game_id", "name"],
  teams: ["id", "category_id", "name", "is_checked_in", "short_name", "logo_url", "team_code", "photo_url"],
  players: ["id", "team_id", "real_name", "in_game_name", "is_captain", "order_in_team", "position", "quote", "hide_real_name", "person_key"],
  matches: [
    "id", "category_id", "station_id", "round_name", "best_of", "status", "scheduled_time", "team_a_id", "team_b_id", "team_a_score", "team_b_score",
    "winner_id", "next_match_id", "next_match_slot", "loser_next_match_id", "loser_next_match_slot", "game_scores", "reported_by", "certified_by",
    "updated_at", "stage", "round_no", "group_name", "sort_order",
  ],
  audit: ["id", "match_id", "staff_id", "action_details", "created_at"],
  sponsors: ["id", "name", "level", "position", "sequence", "logo_url", "is_active"],
  settings: ["category_id", "format", "third_place", "group_count", "advance_per_group", "best_of_by_round", "seeding", "seed_order", "single_entry", "merge_into_category_id", "updated_at"],
  photos: ["id", "person_key", "original_url", "cutout_url", "consent", "updated_at"],
} as const;

/** object → แถว DB: ทุกคอลัมน์ในรายการ · undefined → null (ให้ upsert ล้างค่าได้) */
function toRow(obj: object, cols: readonly string[], defaults: Row = {}): Row {
  const src = obj as Row;
  const row: Row = {};
  for (const c of cols) row[c] = src[c] === undefined ? (defaults[c] ?? null) : src[c];
  return row;
}

async function selectAll<T>(sb: SupabaseClient, table: string, order?: string): Promise<T[]> {
  let q = sb.from(table).select("*");
  if (order) q = q.order(order, { ascending: true });
  const { data, error } = await q;
  if (error) throw new Error(`อ่านตาราง ${table} ไม่ได้: ${error.message}`);
  return (data ?? []) as T[];
}

/** โหลดทุกตารางเป็น Store (cache ต่อ request ฝั่ง server component) */
const loadStore = cache(async (): Promise<Store> => {
  const sb = await createServerSupabase();
  const [games, categories, stations, teams, players, matches, sponsors, settings, photos, config] = await Promise.all([
    selectAll<Row>(sb, "games", "name"),
    selectAll<Row>(sb, "categories", "name"),
    selectAll<Row>(sb, "stations", "name"),
    selectAll<Row>(sb, "teams", "name"),
    selectAll<Row>(sb, "players", "order_in_team"),
    selectAll<Row>(sb, "matches", "sort_order"),
    selectAll<Row>(sb, "sponsors", "sequence"),
    selectAll<Row>(sb, "category_settings"),
    selectAll<Row>(sb, "athlete_photos"),
    sb.from("event_config").select("*").eq("id", 1).maybeSingle(),
  ]);
  const s = emptyStore();
  s.games = games.map((r: Row) => ({ id: String(r.id), name: String(r.name), format: r.format as Game["format"], code: String(r.code ?? ""), team_size: Number(r.team_size ?? 1) }));
  s.categories = categories.map((r: Row) => ({ id: String(r.id), game_id: String(r.game_id), name: String(r.name), code: String(r.code ?? r.id) }));
  s.stations = stations.map((r: Row) => ({ id: String(r.id), game_id: String(r.game_id), name: String(r.name) }));
  s.teams = teams.map((r: Row) => ({
    id: String(r.id), category_id: String(r.category_id), name: String(r.name), is_checked_in: !!r.is_checked_in,
    short_name: nz(r.short_name as string | null), logo_url: nz(r.logo_url as string | null), team_code: nz(r.team_code as string | null), photo_url: nz(r.photo_url as string | null),
  }));
  s.players = players.map((r: Row) => ({
    id: String(r.id), team_id: String(r.team_id), real_name: nz(r.real_name as string | null), in_game_name: String(r.in_game_name ?? ""), is_captain: !!r.is_captain,
    order_in_team: nz(r.order_in_team as number | null), position: nz(r.position as string | null), quote: nz(r.quote as string | null),
    hide_real_name: !!r.hide_real_name, person_key: nz(r.person_key as string | null),
  }));
  s.matches = matches.map((r: Row) => ({
    id: String(r.id), category_id: String(r.category_id), station_id: nz(r.station_id as string | null), round_name: String(r.round_name), best_of: Number(r.best_of ?? 1),
    status: r.status as Match["status"], scheduled_time: nz(r.scheduled_time as string | null), team_a_id: nz(r.team_a_id as string | null), team_b_id: nz(r.team_b_id as string | null),
    team_a_score: Number(r.team_a_score ?? 0), team_b_score: Number(r.team_b_score ?? 0), winner_id: nz(r.winner_id as string | null),
    next_match_id: nz(r.next_match_id as string | null), next_match_slot: nz(r.next_match_slot as Match["next_match_slot"] | null),
    loser_next_match_id: nz(r.loser_next_match_id as string | null), loser_next_match_slot: nz(r.loser_next_match_slot as Match["loser_next_match_slot"] | null),
    game_scores: Array.isArray(r.game_scores) ? (r.game_scores as Match["game_scores"]) : [], reported_by: nz(r.reported_by as string | null), certified_by: nz(r.certified_by as string | null),
    updated_at: String(r.updated_at ?? ""), stage: nz(r.stage as Match["stage"] | null), round_no: nz(r.round_no as number | null), group_name: nz(r.group_name as string | null), sort_order: nz(r.sort_order as number | null),
  }));
  s.sponsors = sponsors.map((r: Row) => ({ id: String(r.id), name: String(r.name), level: r.level as Sponsor["level"], position: r.position as Sponsor["position"], sequence: Number(r.sequence ?? 0), logo_url: String(r.logo_url ?? ""), is_active: r.is_active !== false }));
  s.settings = settings.map((r: Row) => ({
    ...DEFAULT_SETTING(String(r.category_id)),
    format: r.format as CategorySetting["format"], third_place: !!r.third_place, group_count: Number(r.group_count ?? 2), advance_per_group: Number(r.advance_per_group ?? 2),
    best_of_by_round: (r.best_of_by_round as Record<string, number>) ?? {}, seeding: r.seeding as CategorySetting["seeding"], seed_order: (r.seed_order as string[]) ?? [],
    single_entry: r.single_entry as CategorySetting["single_entry"], merge_into_category_id: nz(r.merge_into_category_id as string | null), updated_at: String(r.updated_at ?? ""),
  }));
  s.photos = photos.map((r: Row) => ({ id: String(r.id), person_key: String(r.person_key), original_url: String(r.original_url), cutout_url: String(r.cutout_url), consent: !!r.consent, updated_at: String(r.updated_at ?? "") }));
  if (config.data) {
    const c = config.data as Row;
    s.eventConfig = { days: (c.days as string[]) ?? [], announcement: String(c.announcement ?? ""), logo_url: nz(c.logo_url as string | null), theme: nz(c.theme as EventConfig["theme"] | null), updated_at: String(c.updated_at ?? "") };
  }
  return s;
});

async function persist(sb: SupabaseClient, ch: Changes, staffId?: string) {
  const fail = (what: string, e: { message: string }) => new Error(`บันทึก${what}ไม่สำเร็จ: ${e.message}`);
  const upsert = async (table: string, rows: Row[], conflict = "id") => {
    if (!rows.length) return;
    const { error } = await sb.from(table).upsert(rows, { onConflict: conflict });
    if (error) throw fail(table, error);
  };
  const del = async (table: string, ids: Set<string>) => {
    if (!ids.size) return;
    const { error } = await sb.from(table).delete().in("id", [...ids]);
    if (error) throw fail(`ลบ ${table}`, error);
  };
  // ลำดับตาม FK: แม่ก่อนลูก · ลบก่อนเขียน
  await upsert("games", [...ch.games.values()].map((g) => toRow(g, COLS.games)));
  await upsert("stations", [...ch.stations.values()].map((x) => toRow(x, COLS.stations)));
  await upsert("categories", [...ch.categories.values()].map((c) => toRow(c, COLS.categories)));
  await del("matches", ch.deleteMatches);
  await del("players", ch.deletePlayers);
  await del("teams", ch.deleteTeams);
  await upsert("teams", [...ch.teams.values()].map((t) => toRow(t, COLS.teams)));
  await upsert("players", [...ch.players.values()].map((p) => toRow(p, COLS.players, { hide_real_name: false })));
  await upsert("category_settings", [...ch.settings.values()].map((s) => toRow(s, COLS.settings)), "category_id");
  await upsert("matches", [...ch.matches.values()].map((m) => toRow(m, COLS.matches)));
  await upsert("match_audit_logs", ch.audit.map((a) => toRow({ ...a, staff_id: a.staff_id ?? staffId }, COLS.audit)));
  await del("sponsors", ch.deleteSponsors);
  await upsert("sponsors", [...ch.sponsors.values()].map((x) => toRow(x, COLS.sponsors)));
  if (ch.eventConfig) await upsert("event_config", [{ id: 1, days: ch.eventConfig.days, announcement: ch.eventConfig.announcement, logo_url: ch.eventConfig.logo_url ?? null, theme: ch.eventConfig.theme ?? null, updated_at: ch.eventConfig.updated_at }]);
  await del("athlete_photos", ch.deletePhotos);
  await upsert("athlete_photos", [...ch.photos.values()].map((p) => toRow({ ...p, updated_by: staffId }, [...COLS.photos, "updated_by"])));
}

/** เตรียม Engine บน Store สดจาก DB · run(fn) แล้วเขียนการเปลี่ยนแปลงกลับ */
async function withEngine<T>(fn: (e: Engine) => T): Promise<T> {
  const sb = await createServerSupabase();
  const staff = await getStaff();
  const ctx: Ctx = { now: () => new Date().toISOString(), newId: () => crypto.randomUUID(), staffId: staff?.id };
  const e = new Engine(await loadStore(), ctx);
  const result = fn(e);
  await persist(sb, e.changes, staff?.id);
  return result;
}

const inGame = (s: Store, gameId?: string) => {
  const ids = new Set(s.categories.filter((c) => !gameId || c.game_id === gameId).map((c) => c.id));
  return <T extends { category_id: string }>(rows: T[]) => (gameId ? rows.filter((r) => ids.has(r.category_id)) : rows);
};

export const supabaseSource: DataSource = {
  async getGames() { return (await loadStore()).games; },
  async getCategories(gameId) { const s = await loadStore(); return gameId ? s.categories.filter((c) => c.game_id === gameId) : s.categories; },
  async getTeams(gameId) { const s = await loadStore(); return inGame(s, gameId)(s.teams); },
  async getPlayers(gameId) {
    const s = await loadStore();
    if (!gameId) return s.players;
    const ids = new Set(inGame(s, gameId)(s.teams).map((t) => t.id));
    return s.players.filter((p) => ids.has(p.team_id));
  },
  async getStations(gameId) { const s = await loadStore(); return gameId ? s.stations.filter((x) => x.game_id === gameId) : s.stations; },
  async getMatches(gameId) { const s = await loadStore(); return inGame(s, gameId)(s.matches); },
  async getSponsors() { return (await loadStore()).sponsors; },
  async getAuditLogs(matchId) {
    const sb = await createServerSupabase();
    const { data, error } = await sb.from("match_audit_logs").select("*").eq("match_id", matchId).order("created_at", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r: Row) => ({ id: String(r.id), match_id: String(r.match_id), staff_id: nz(r.staff_id as string | null), action_details: String(r.action_details), created_at: String(r.created_at) })) as MatchAuditLog[];
  },
  async getCategorySettings() { const s = await loadStore(); return s.categories.map((c) => s.settings.find((x) => x.category_id === c.id) ?? DEFAULT_SETTING(c.id)); },
  async getEventConfig() { return (await loadStore()).eventConfig; },
  async getPhotos() { return (await loadStore()).photos; },

  saveProgress: (id, scores) => withEngine((e) => e.saveProgress(id, scores)),
  saveResult: (id, scores) => withEngine((e) => e.saveResult(id, scores)),
  certifyMatch: (id) => withEngine((e) => e.certifyMatch(id)),
  uncertifyMatch: (id) => withEngine((e) => e.uncertifyMatch(id)),
  setCheckIn: (teamId, v) => withEngine((e) => e.setCheckIn(teamId, v)),

  saveCategorySetting: (id, patch) => withEngine((e) => e.saveCategorySetting(id, patch)),
  drawSeedOrder: (id) => withEngine((e) => e.drawSeedOrder(id)),
  generateBracket: (id) => withEngine((e) => e.generateBracket(id)),
  generateKnockout: (id) => withEngine((e) => e.generateKnockout(id)),
  resolveSingleEntry: (id, r, m) => withEngine((e) => e.resolveSingleEntry(id, r, m)),

  createTeam: (c, input) => withEngine((e) => e.createTeam(c, input)),
  updateTeam: (id, patch) => withEngine((e) => e.updateTeam(id, patch)),
  deleteTeam: (id) => withEngine((e) => e.deleteTeam(id)),
  createPlayer: (t, input) => withEngine((e) => e.createPlayer(t, input)),
  updatePlayer: (id, patch) => withEngine((e) => e.updatePlayer(id, patch)),
  deletePlayer: (id) => withEngine((e) => e.deletePlayer(id)),

  async previewImport(text) { return new Engine(await loadStore(), { now: () => "", newId: () => "" }).previewImport(text); },
  applyImport: (text) => withEngine((e) => e.applyImport(text)),

  updateMatchSchedule: (id, patch) => withEngine((e) => e.updateMatchSchedule(id, patch)),
  autoQueue: (gameId) => withEngine((e) => e.autoQueue(gameId)),

  createSponsor: (input) => withEngine((e) => e.createSponsor(input)),
  updateSponsor: (id, patch) => withEngine((e) => e.updateSponsor(id, patch)),
  deleteSponsor: (id) => withEngine((e) => e.deleteSponsor(id)),

  saveEventConfig: (patch) => withEngine((e) => e.saveEventConfig(patch)),

  async savePhoto(personKey, upload) {
    if (!upload.cutout.length || !upload.original.length) throw new Error("ไม่มีข้อมูลรูป");
    const sb = await createServerSupabase();
    const id = photoIdFor(personKey);
    const ext = upload.originalMime === "image/png" ? "png" : upload.originalMime === "image/webp" ? "webp" : "jpg";
    const bucket = sb.storage.from(PHOTO_BUCKET);
    const up = async (path: string, bytes: Uint8Array, contentType: string) => {
      const { error } = await bucket.upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);
    };
    await up(`${id}/original.${ext}`, upload.original, upload.originalMime || "image/jpeg");
    await up(`${id}/cutout.png`, upload.cutout, "image/png");
    // bucket เป็น private → เว็บเสิร์ฟผ่าน /api/photos/… ซึ่งตรวจ consent ก่อนแล้ว redirect ไป signed URL
    const v = Date.now().toString(36);
    return withEngine((e) => e.savePhotoRow(personKey, { original_url: `/api/photos/${id}/original?v=${v}`, cutout_url: `/api/photos/${id}/cutout?v=${v}` }, upload.consent));
  },
  setPhotoConsent: (id, consent) => withEngine((e) => e.setPhotoConsent(id, consent)),
  async deletePhoto(photoId) {
    const sb = await createServerSupabase();
    const { data: files } = await sb.storage.from(PHOTO_BUCKET).list(photoId);
    if (files?.length) await sb.storage.from(PHOTO_BUCKET).remove(files.map((f: { name: string }) => `${photoId}/${f.name}`));
    await withEngine((e) => e.deletePhotoRow(photoId));
  },
  async getPhotoFile(photoId, kind) {
    const p = (await loadStore()).photos.find((x) => x.id === photoId);
    if (!p) return null;
    // ต้องใช้ service role (ฝั่ง server เท่านั้น) เซ็น URL ชั่วคราว 1 ชม. — route เป็นคนตรวจ consent/สิทธิ์ก่อนเรียกมาถึงนี่
    const admin = createServiceSupabase();
    if (!admin) {
      console.warn("[praksa] ไม่มี SUPABASE_SERVICE_ROLE_KEY — เสิร์ฟรูปไม่ได้");
      return null;
    }
    const { data: files } = await admin.storage.from(PHOTO_BUCKET).list(photoId);
    const name = files?.find((f: { name: string }) => f.name.startsWith(kind === "original" ? "original." : "cutout."))?.name;
    if (!name) return null;
    const { data: signed, error } = await admin.storage.from(PHOTO_BUCKET).createSignedUrl(`${photoId}/${name}`, 3600);
    if (error || !signed) return null;
    return { redirect: signed.signedUrl };
  },

  subscribe: subscribeDataChanges,
};

export type { AthletePhoto, Category, Game, Player, Station, Team };
