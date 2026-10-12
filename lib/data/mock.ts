import type { DataSource } from "./source";
import { subscribeDataChanges } from "./live";
import { db, mergeRoster } from "./store";
import { abbreviateOrg, parseRoster, personKey } from "./roster-parse";
import { photoIdFor } from "@/lib/people";
import { checkFinished, checkProgress, seriesFromGames, usesGoalsDirect } from "@/lib/match-logic";
import {
  DEFAULT_SETTING,
  bestOfFor,
  generateBracket as buildBracket,
  generateKnockout as buildKnockout,
  GROUP_NAMES,
  shuffle,
  splitGroups,
  type MatchDraft,
} from "@/lib/bracket/generate";
import { computeStandings } from "@/lib/bracket/standings";
import type { AthletePhoto, Category, CategorySetting, GameScore, Match, Player, Sponsor, Team } from "@/lib/types";

const NOW = () => new Date().toISOString();
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}`;

const must = <T,>(row: T | undefined, what: string): T => {
  if (!row) throw new Error(`ไม่พบ${what}`);
  return row;
};

const matchOf = (id: string) => must(db.matches.find((m) => m.id === id), "แมตช์");
const categoryOf = (id: string) => must(db.categories.find((c) => c.id === id), "ประเภท");
const gameOfMatch = (m: Match) => {
  const cat = categoryOf(m.category_id);
  return must(db.games.find((x) => x.id === cat.game_id), "เกม");
};
const teamName = (id?: string) => db.teams.find((t) => t.id === id)?.name ?? "-";

const log = (m: Match, text: string) =>
  db.audit.push({ id: `audit-${db.audit.length + 1}`, match_id: m.id, action_details: text, created_at: NOW() });

const touch = (m: Match) => {
  m.updated_at = NOW();
  return m;
};

function applyScores(m: Match, scores: GameScore[]) {
  const game = gameOfMatch(m);
  const direct = usesGoalsDirect(game.code, m.best_of);
  const s = seriesFromGames(scores, direct);
  m.game_scores = scores.map((x) => ({ a: x.a, b: x.b }));
  m.team_a_score = s.a;
  m.team_b_score = s.b;
  return { game, direct, s };
}

function guardEditable(m: Match) {
  if (m.status === "certified") throw new Error("แมตช์นี้รับรองผลแล้ว — ต้องกด “ยกเลิกการรับรอง” ก่อนจึงจะแก้ได้");
  if (!m.team_a_id || !m.team_b_id) throw new Error("ยังไม่มีผู้เข้าแข่งครบทั้งสองฝั่ง (รอผลแมตช์ก่อนหน้า)");
}

const slotKey = (slot?: "a" | "b") => (slot === "b" ? "team_b_id" : "team_a_id");

function placeInto(nextId: string | undefined, slot: "a" | "b" | undefined, teamId: string | undefined) {
  if (!nextId || !slot) return;
  const next = matchOf(nextId);
  next[slotKey(slot)] = teamId;
  touch(next);
}

function blockedByNext(nextId: string | undefined): boolean {
  return !!nextId && matchOf(nextId).status !== "scheduled";
}

const inGame = <T extends { category_id: string }>(rows: T[], gameId?: string) =>
  gameId ? rows.filter((r) => db.categories.find((c) => c.id === r.category_id)?.game_id === gameId) : rows;

// ---------- จัดสาย ----------

const settingOf = (categoryId: string): CategorySetting =>
  db.settings.find((s) => s.category_id === categoryId) ?? DEFAULT_SETTING(categoryId);

function upsertSetting(categoryId: string, patch: Partial<CategorySetting>): CategorySetting {
  let s = db.settings.find((x) => x.category_id === categoryId);
  if (!s) {
    s = DEFAULT_SETTING(categoryId);
    db.settings.push(s);
  }
  Object.assign(s, patch, { category_id: categoryId, updated_at: NOW() });
  return s;
}

const teamsOf = (categoryId: string) => db.teams.filter((t) => t.category_id === categoryId);
const matchesOf = (categoryId: string) => db.matches.filter((m) => m.category_id === categoryId);
/** สายล็อกเมื่อมีแมตช์ที่เริ่มแข่งหรือมีสกอร์แล้ว */
const isLocked = (categoryId: string) => matchesOf(categoryId).some((m) => m.status !== "scheduled" || m.game_scores.length > 0);

/** ลำดับทีมที่ใช้วางสาย: ของเดิมที่ยังอยู่ + ทีมที่ยังไม่มีในลำดับ (สุ่มถ้าโหมดสุ่ม) */
function effectiveOrder(categoryId: string, setting: CategorySetting): string[] {
  const ids = teamsOf(categoryId).map((t) => t.id);
  const kept = setting.seed_order.filter((id) => ids.includes(id));
  const missing = ids.filter((id) => !kept.includes(id));
  return [...kept, ...(setting.seeding === "random" ? shuffle(missing) : missing)];
}

function materialize(drafts: MatchDraft[], cat: Category, prefix: string): Match[] {
  const id = (i: number) => `${cat.code}-${prefix}${i + 1}`;
  return drafts.map((d) => ({
    id: id(d.idx),
    category_id: cat.id,
    round_name: d.round_name,
    stage: d.stage,
    round_no: d.round_no,
    group_name: d.group_name,
    sort_order: d.sort_order,
    best_of: d.best_of,
    status: "scheduled",
    team_a_id: d.team_a_id,
    team_b_id: d.team_b_id,
    team_a_score: 0,
    team_b_score: 0,
    game_scores: [],
    next_match_id: d.next_idx !== undefined ? id(d.next_idx) : undefined,
    next_match_slot: d.next_match_slot,
    loser_next_match_id: d.loser_next_idx !== undefined ? id(d.loser_next_idx) : undefined,
    loser_next_match_slot: d.loser_next_match_slot,
    updated_at: NOW(),
  }));
}

function removeMatches(pred: (m: Match) => boolean) {
  const gone = new Set(db.matches.filter(pred).map((m) => m.id));
  db.matches = db.matches.filter((m) => !gone.has(m.id));
  db.audit = db.audit.filter((a) => !gone.has(a.match_id));
}

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
  async getCategorySettings() { return db.categories.map((c) => settingOf(c.id)); },

  async saveProgress(matchId, scores) {
    const m = matchOf(matchId);
    guardEditable(m);
    const game = gameOfMatch(m);
    const bad = checkProgress(scores, m.best_of, usesGoalsDirect(game.code, m.best_of));
    if (bad) throw new Error(bad);
    applyScores(m, scores);
    m.status = "ongoing";
    m.winner_id = undefined;
    log(m, `บันทึกสกอร์ระหว่างแข่ง ${teamName(m.team_a_id)} ${m.team_a_score}-${m.team_b_score} ${teamName(m.team_b_id)}`);
    return touch(m);
  },

  async saveResult(matchId, scores) {
    const m = matchOf(matchId);
    guardEditable(m);
    const game = gameOfMatch(m);
    const bad = checkFinished(scores, m.best_of, usesGoalsDirect(game.code, m.best_of));
    if (bad) throw new Error(bad);
    applyScores(m, scores);
    m.status = "ended";
    m.winner_id = m.team_a_score > m.team_b_score ? m.team_a_id : m.team_b_id;
    log(m, `บันทึกผลจบแมตช์ ${teamName(m.team_a_id)} ${m.team_a_score}-${m.team_b_score} ${teamName(m.team_b_id)} · ผู้ชนะ ${teamName(m.winner_id)}`);
    return touch(m);
  },

  async certifyMatch(matchId) {
    const m = matchOf(matchId);
    if (m.status !== "ended") throw new Error("รับรองได้เฉพาะแมตช์ที่บันทึกผลจบแล้ว");
    const loser = m.winner_id === m.team_a_id ? m.team_b_id : m.team_a_id;
    m.status = "certified";
    placeInto(m.next_match_id, m.next_match_slot, m.winner_id);
    placeInto(m.loser_next_match_id, m.loser_next_match_slot, loser);
    log(m, `รับรองผล · ผู้ชนะ ${teamName(m.winner_id)} เลื่อนไปแมตช์ถัดไป`);
    return touch(m);
  },

  async uncertifyMatch(matchId) {
    const m = matchOf(matchId);
    if (m.status !== "certified") throw new Error("แมตช์นี้ยังไม่ได้รับรอง");
    if (blockedByNext(m.next_match_id) || blockedByNext(m.loser_next_match_id)) {
      throw new Error("ยกเลิกไม่ได้: แมตช์ถัดไปเริ่มแข่งหรือจบแล้ว ต้องให้แอดมินจัดการ");
    }
    placeInto(m.next_match_id, m.next_match_slot, undefined);
    placeInto(m.loser_next_match_id, m.loser_next_match_slot, undefined);
    m.status = "ended";
    log(m, "ยกเลิกการรับรองผล · ถอยผู้เล่นออกจากแมตช์ถัดไป");
    return touch(m);
  },

  async setCheckIn(teamId, checkedIn) {
    const t = must(db.teams.find((x) => x.id === teamId), "ทีม/ผู้เล่น");
    t.is_checked_in = checkedIn;
    return t;
  },

  async saveCategorySetting(categoryId, patch) {
    categoryOf(categoryId);
    const locked = isLocked(categoryId);
    if (locked && (patch.format !== undefined || patch.seed_order !== undefined || patch.group_count !== undefined)) {
      throw new Error("สายถูกล็อกแล้ว (มีแมตช์เริ่มแข่ง) — เปลี่ยนรูปแบบ/ลำดับไม่ได้");
    }
    if (patch.group_count !== undefined && patch.group_count < 1) throw new Error("จำนวนกลุ่มต้องอย่างน้อย 1");
    if (patch.advance_per_group !== undefined && patch.advance_per_group < 1) throw new Error("จำนวนเข้ารอบต่อกลุ่มต้องอย่างน้อย 1");
    const s = upsertSetting(categoryId, patch);
    // BO ที่เปลี่ยน → ปรับแมตช์ที่ยังไม่เริ่มให้ตรง
    if (patch.best_of_by_round) {
      for (const m of matchesOf(categoryId)) {
        if (m.status === "scheduled" && m.game_scores.length === 0) {
          m.best_of = bestOfFor(m.round_name, m.stage, s);
        }
      }
    }
    return s;
  },

  async drawSeedOrder(categoryId) {
    categoryOf(categoryId);
    if (isLocked(categoryId)) throw new Error("สายถูกล็อกแล้ว จับสลากใหม่ไม่ได้");
    return upsertSetting(categoryId, { seeding: "random", seed_order: shuffle(teamsOf(categoryId).map((t) => t.id)) });
  },

  async generateBracket(categoryId) {
    const cat = categoryOf(categoryId);
    if (isLocked(categoryId)) throw new Error("สายถูกล็อก: มีแมตช์ที่เริ่มแข่งหรือมีผลแล้ว สร้างใหม่ไม่ได้");
    const setting = settingOf(categoryId);
    if (setting.single_entry === "cancel") throw new Error("ประเภทนี้ถูกยกเลิกแล้ว");
    const order = effectiveOrder(categoryId, setting);
    if (order.length < 2) throw new Error("ต้องมีผู้เข้าแข่งอย่างน้อย 2 ทีม/คน (ประเภทที่มีคนเดียวให้เลือกวิธีจัดการด้านล่าง)");
    const saved = upsertSetting(categoryId, { seed_order: order });
    const drafts = buildBracket(saved, order);
    removeMatches((m) => m.category_id === categoryId);
    const created = materialize(drafts, cat, "m");
    db.matches.push(...created);
    return created;
  },

  async generateKnockout(categoryId) {
    const cat = categoryOf(categoryId);
    const setting = settingOf(categoryId);
    if (setting.format !== "groups") throw new Error("รอบน็อกเอาต์จากกลุ่มใช้ได้เฉพาะรูปแบบแบ่งกลุ่ม");
    const groupMatches = matchesOf(categoryId).filter((m) => m.stage === "group");
    if (!groupMatches.length) throw new Error("ยังไม่ได้สร้างรอบแบ่งกลุ่ม");
    if (!groupMatches.every((m) => m.status === "certified")) throw new Error("รอบแบ่งกลุ่มยังไม่จบ — ต้องรับรองผลทุกแมตช์ก่อน");
    const ko = matchesOf(categoryId).filter((m) => m.stage !== "group");
    if (ko.some((m) => m.status !== "scheduled" || m.game_scores.length > 0)) throw new Error("รอบน็อกเอาต์เริ่มแข่งแล้ว สร้างใหม่ไม่ได้");

    const groups = splitGroups(setting.seed_order, setting.group_count);
    const ranked = groups.map((members, gi) =>
      computeStandings(members, groupMatches.filter((m) => m.group_name === GROUP_NAMES[gi]), setting.seed_order),
    );
    // อันดับ 1 ทุกกลุ่มก่อน แล้วอันดับ 2 … (ตัวสร้างสายจะไขว้กลุ่มให้เอง)
    const qualifiers: string[] = [];
    for (let r = 0; r < setting.advance_per_group; r++) for (const rows of ranked) if (rows[r]) qualifiers.push(rows[r].team_id);
    if (qualifiers.length < 2) throw new Error("ทีมเข้ารอบไม่ถึง 2 ทีม");

    removeMatches((m) => m.category_id === categoryId && m.stage !== "group");
    const created = materialize(buildKnockout(setting, qualifiers), cat, "k");
    db.matches.push(...created);
    return created;
  },

  async resolveSingleEntry(categoryId, resolution, mergeInto) {
    const cat = categoryOf(categoryId);
    if (resolution === "merge") {
      const target = must(db.categories.find((c) => c.id === mergeInto), "ประเภทปลายทาง");
      if (target.game_id !== cat.game_id) throw new Error("ยุบรวมได้เฉพาะประเภทของเกมเดียวกัน");
      if (isLocked(target.id)) throw new Error("ประเภทปลายทางเริ่มแข่งแล้ว ยุบรวมไม่ได้");
      for (const t of teamsOf(categoryId)) t.category_id = target.id;
      removeMatches((m) => m.category_id === categoryId);
      return upsertSetting(categoryId, { single_entry: "merge", merge_into_category_id: target.id });
    }
    if (resolution === "walkover" || resolution === "cancel") removeMatches((m) => m.category_id === categoryId);
    return upsertSetting(categoryId, { single_entry: resolution, merge_into_category_id: undefined });
  },

  // ---------- ทีม / นักกีฬา ----------

  async createTeam(categoryId, input) {
    const cat = categoryOf(categoryId);
    const name = input.name?.trim();
    if (!name) throw new Error("ต้องใส่ชื่อทีม/นักกีฬา");
    const team: Team = {
      id: newId("t"),
      category_id: cat.id,
      team_code: input.team_code?.trim() || undefined,
      name,
      short_name: input.short_name?.trim() || abbreviateOrg(name),
      logo_url: input.logo_url,
      is_checked_in: false,
    };
    db.teams.push(team);
    return team;
  },

  async updateTeam(teamId, patch) {
    const t = must(db.teams.find((x) => x.id === teamId), "ทีม/นักกีฬา");
    if (patch.category_id && patch.category_id !== t.category_id) {
      const from = categoryOf(t.category_id);
      const to = categoryOf(patch.category_id);
      if (from.game_id !== to.game_id) throw new Error("ย้ายได้เฉพาะประเภทของเกมเดียวกัน");
      if (db.matches.some((m) => m.team_a_id === teamId || m.team_b_id === teamId)) throw new Error("ทีมนี้อยู่ในสายแล้ว — ต้องสร้างสายใหม่ก่อนจึงย้ายได้");
      t.category_id = to.id;
    }
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new Error("ชื่อห้ามว่าง");
      t.name = name;
    }
    if (patch.short_name !== undefined) t.short_name = patch.short_name.trim() || abbreviateOrg(t.name);
    if (patch.logo_url !== undefined) t.logo_url = patch.logo_url || undefined;
    if (patch.photo_url !== undefined) t.photo_url = patch.photo_url || undefined;
    if (patch.team_code !== undefined) {
      t.team_code = patch.team_code.trim() || undefined;
      for (const p of db.players.filter((x) => x.team_id === t.id)) if (p.real_name) p.person_key = personKey(p.real_name, t.team_code ?? t.id);
    }
    return t;
  },

  async deleteTeam(teamId) {
    must(db.teams.find((x) => x.id === teamId), "ทีม/นักกีฬา");
    if (db.matches.some((m) => m.team_a_id === teamId || m.team_b_id === teamId)) throw new Error("ทีมนี้อยู่ในสายแล้ว ลบไม่ได้ (สร้างสายใหม่ก่อน)");
    db.players = db.players.filter((p) => p.team_id !== teamId);
    db.teams = db.teams.filter((t) => t.id !== teamId);
  },

  async createPlayer(teamId, input) {
    const t = must(db.teams.find((x) => x.id === teamId), "ทีม");
    const real = input.real_name?.trim() || undefined;
    const ign = input.in_game_name?.trim() ?? "";
    if (!real && !ign) throw new Error("ต้องใส่ชื่อจริงหรือชื่อในเกมอย่างน้อยหนึ่งอย่าง");
    const used = db.players.filter((p) => p.team_id === t.id).map((p) => p.order_in_team ?? 0);
    const order = input.order_in_team ?? (used.length ? Math.max(...used) + 1 : 1);
    const p: Player = {
      id: newId("p"),
      team_id: t.id,
      real_name: real,
      in_game_name: ign,
      is_captain: !!input.is_captain,
      order_in_team: order,
      position: input.position?.trim() || undefined,
      person_key: real ? personKey(real, t.team_code ?? t.id) : undefined,
    };
    if (p.is_captain) for (const x of db.players) if (x.team_id === t.id) x.is_captain = false;
    db.players.push(p);
    return p;
  },

  async updatePlayer(playerId, patch) {
    const p = must(db.players.find((x) => x.id === playerId), "นักกีฬา");
    if (patch.team_id && patch.team_id !== p.team_id) {
      must(db.teams.find((x) => x.id === patch.team_id), "ทีมปลายทาง");
      p.team_id = patch.team_id;
      p.is_captain = false;
    }
    if (patch.real_name !== undefined) p.real_name = patch.real_name.trim() || undefined;
    if (patch.in_game_name !== undefined) p.in_game_name = patch.in_game_name.trim();
    if (patch.position !== undefined) p.position = patch.position.trim() || undefined;
    if (patch.quote !== undefined) p.quote = patch.quote.trim() || undefined;
    if (patch.hide_real_name !== undefined) p.hide_real_name = patch.hide_real_name;
    if (patch.order_in_team !== undefined) p.order_in_team = patch.order_in_team;
    if (patch.is_captain) {
      for (const x of db.players) if (x.team_id === p.team_id) x.is_captain = false;
      p.is_captain = true;
    } else if (patch.is_captain === false) p.is_captain = false;
    if (!p.real_name && !p.in_game_name) throw new Error("ต้องมีชื่อจริงหรือชื่อในเกมอย่างน้อยหนึ่งอย่าง");
    const t = must(db.teams.find((x) => x.id === p.team_id), "ทีม");
    p.person_key = p.real_name ? personKey(p.real_name, t.team_code ?? t.id) : undefined;
    return p;
  },

  async deletePlayer(playerId) {
    must(db.players.find((x) => x.id === playerId), "นักกีฬา");
    db.players = db.players.filter((p) => p.id !== playerId);
  },

  async previewImport(text) {
    const roster = parseRoster(text);
    if (!roster.players.length) throw new Error("ไม่พบรายชื่อนักกีฬาในข้อความ (ต้องมีส่วน ## players)");
    // พรีวิวบน store จริงแบบไม่เขียน
    return mergeRoster(db, roster, false);
  },

  async applyImport(text) {
    const roster = parseRoster(text);
    if (!roster.players.length) throw new Error("ไม่พบรายชื่อนักกีฬาในข้อความ (ต้องมีส่วน ## players)");
    return mergeRoster(db, roster, true);
  },

  // ---------- ตาราง / สถานี ----------

  async updateMatchSchedule(matchId, patch) {
    const m = matchOf(matchId);
    if (patch.station_id !== undefined) {
      if (patch.station_id) {
        const st = must(db.stations.find((s) => s.id === patch.station_id), "สถานี");
        if (st.game_id !== gameOfMatch(m).id) throw new Error("สถานีต้องเป็นของเกมเดียวกัน");
        m.station_id = st.id;
      } else m.station_id = undefined;
    }
    if (patch.scheduled_time !== undefined) m.scheduled_time = patch.scheduled_time || undefined;
    if (patch.best_of !== undefined) {
      if (m.status !== "scheduled" || m.game_scores.length > 0) throw new Error("แมตช์เริ่มแล้ว เปลี่ยน BO ไม่ได้");
      if (patch.best_of < 1) throw new Error("BO ต้องอย่างน้อย 1");
      m.best_of = patch.best_of;
    }
    return touch(m);
  },

  async autoQueue(gameId) {
    const game = must(db.games.find((g) => g.id === gameId), "เกม");
    const catIds = new Set(db.categories.filter((c) => c.game_id === game.id).map((c) => c.id));
    const gameMatches = db.matches.filter((m) => catIds.has(m.category_id));
    const busy = new Set(gameMatches.filter((m) => m.station_id && (m.status === "ongoing" || m.status === "scheduled")).map((m) => m.station_id));
    const free = db.stations.filter((s) => s.game_id === game.id && !busy.has(s.id));
    const ready = gameMatches
      .filter((m) => m.status === "scheduled" && m.team_a_id && m.team_b_id && !m.station_id)
      .sort((a, b) => (a.round_no ?? 0) - (b.round_no ?? 0) || a.category_id.localeCompare(b.category_id) || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const assigned: Match[] = [];
    for (let i = 0; i < Math.min(free.length, ready.length); i++) {
      ready[i].station_id = free[i].id;
      if (!ready[i].scheduled_time) ready[i].scheduled_time = NOW();
      assigned.push(touch(ready[i]));
    }
    return assigned;
  },

  // ---------- สปอนเซอร์ ----------

  async createSponsor(input) {
    if (!input.name?.trim()) throw new Error("ต้องใส่ชื่อสปอนเซอร์");
    const s: Sponsor = { ...input, id: newId("sp"), name: input.name.trim() };
    db.sponsors.push(s);
    return s;
  },
  async updateSponsor(sponsorId, patch) {
    const s = must(db.sponsors.find((x) => x.id === sponsorId), "สปอนเซอร์");
    Object.assign(s, patch);
    if (!s.name.trim()) throw new Error("ชื่อห้ามว่าง");
    return s;
  },
  async deleteSponsor(sponsorId) {
    must(db.sponsors.find((x) => x.id === sponsorId), "สปอนเซอร์");
    db.sponsors = db.sponsors.filter((s) => s.id !== sponsorId);
  },

  // ---------- ตั้งค่างาน ----------

  async getEventConfig() { return db.eventConfig; },
  async saveEventConfig(patch) {
    if (patch.days) {
      const bad = patch.days.find((d) => d && !/^\d{4}-\d{2}-\d{2}$/.test(d));
      if (bad) throw new Error(`รูปแบบวันที่ผิด: ${bad}`);
      patch = { ...patch, days: patch.days.filter(Boolean) };
    }
    Object.assign(db.eventConfig, patch, { updated_at: NOW() });
    return db.eventConfig;
  },

  // ---------- รูปนักกีฬา ----------

  async getPhotos() { return db.photos; },

  async savePhoto(personKey, upload) {
    if (!personKey) throw new Error("ไม่มีกุญแจนักกีฬา");
    if (!upload.cutout.length || !upload.original.length) throw new Error("ไม่มีข้อมูลรูป");
    const id = photoIdFor(personKey);
    db.photoFiles.set(id, { original: upload.original, originalMime: upload.originalMime || "image/jpeg", cutout: upload.cutout });
    const v = Date.now().toString(36);
    const row: AthletePhoto = {
      id,
      person_key: personKey,
      original_url: `/api/photos/${id}/original?v=${v}`,
      cutout_url: `/api/photos/${id}/cutout?v=${v}`,
      consent: upload.consent,
      updated_at: NOW(),
    };
    const i = db.photos.findIndex((p) => p.id === id);
    if (i >= 0) db.photos[i] = row;
    else db.photos.push(row);
    return row;
  },

  async setPhotoConsent(photoId, consent) {
    const p = must(db.photos.find((x) => x.id === photoId), "รูป");
    p.consent = consent;
    p.updated_at = NOW();
    return p;
  },

  async deletePhoto(photoId) {
    db.photos = db.photos.filter((p) => p.id !== photoId);
    db.photoFiles.delete(photoId);
  },

  async getPhotoFile(photoId, kind) {
    const f = db.photoFiles.get(photoId);
    if (!f) return null;
    return kind === "original" ? { bytes: f.original, mime: f.originalMime } : { bytes: f.cutout, mime: "image/png" };
  },

  subscribe: subscribeDataChanges,
};
