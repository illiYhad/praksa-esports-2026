import type { Store } from "./defaults";
import { mergeRoster } from "./store";
import { abbreviateOrg, parseRoster, personKey } from "./roster-parse";
import { planQueue } from "./queue";
import type { PlayerInput, SchedulePatch, TeamInput } from "./source";
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
import type {
  AthletePhoto,
  Category,
  CategorySetting,
  EventConfig,
  Game,
  GameScore,
  ImportPreview,
  Match,
  MatchAuditLog,
  Player,
  SingleEntryResolution,
  Sponsor,
  Station,
  Team,
} from "@/lib/types";

// กติกาการเขียนทั้งหมดของระบบ ทำงานบน Store ในหน่วยความจำ + บันทึกว่าแถวไหนเปลี่ยน
// mock: Store = db จริง (เปลี่ยนในที่) · Supabase: โหลด Store → รัน → เขียนเฉพาะแถวที่เปลี่ยน

export type Ctx = {
  now: () => string;
  /** mock = id อ่านง่าย · Supabase = uuid */
  newId: (prefix: string) => string;
  /** ผู้ใช้ที่ล็อกอิน (reported_by / certified_by / audit.staff_id) */
  staffId?: string;
};

export type Changes = {
  games: Map<string, Game>;
  stations: Map<string, Station>;
  categories: Map<string, Category>;
  teams: Map<string, Team>;
  deleteTeams: Set<string>;
  players: Map<string, Player>;
  deletePlayers: Set<string>;
  matches: Map<string, Match>;
  deleteMatches: Set<string>;
  audit: MatchAuditLog[];
  settings: Map<string, CategorySetting>;
  sponsors: Map<string, Sponsor>;
  deleteSponsors: Set<string>;
  eventConfig?: EventConfig;
  photos: Map<string, AthletePhoto>;
  deletePhotos: Set<string>;
};

export const emptyChanges = (): Changes => ({
  games: new Map(), stations: new Map(), categories: new Map(),
  teams: new Map(), deleteTeams: new Set(),
  players: new Map(), deletePlayers: new Set(),
  matches: new Map(), deleteMatches: new Set(),
  audit: [],
  settings: new Map(),
  sponsors: new Map(), deleteSponsors: new Set(),
  photos: new Map(), deletePhotos: new Set(),
});

const must = <T,>(row: T | undefined, what: string): T => {
  if (!row) throw new Error(`ไม่พบ${what}`);
  return row;
};

export class Engine {
  readonly changes = emptyChanges();

  constructor(readonly s: Store, readonly ctx: Ctx) {}

  // ---------- helpers ----------
  private matchOf(id: string) { return must(this.s.matches.find((m) => m.id === id), "แมตช์"); }
  private categoryOf(id: string) { return must(this.s.categories.find((c) => c.id === id), "ประเภท"); }
  private gameOfMatch(m: Match) {
    const cat = this.categoryOf(m.category_id);
    return must(this.s.games.find((x) => x.id === cat.game_id), "เกม");
  }
  private teamName(id?: string) { return this.s.teams.find((t) => t.id === id)?.name ?? "-"; }
  private touch(m: Match) {
    m.updated_at = this.ctx.now();
    this.changes.matches.set(m.id, m);
    return m;
  }
  private touchTeam(t: Team) { this.changes.teams.set(t.id, t); return t; }
  private touchPlayer(p: Player) { this.changes.players.set(p.id, p); return p; }
  private log(m: Match, text: string) {
    const row: MatchAuditLog = { id: this.ctx.newId("audit"), match_id: m.id, staff_id: this.ctx.staffId, action_details: text, created_at: this.ctx.now() };
    this.s.audit.push(row);
    this.changes.audit.push(row);
  }
  private applyScores(m: Match, scores: GameScore[]) {
    const game = this.gameOfMatch(m);
    const direct = usesGoalsDirect(game.code, m.best_of);
    const sr = seriesFromGames(scores, direct);
    m.game_scores = scores.map((x) => ({ a: x.a, b: x.b }));
    m.team_a_score = sr.a;
    m.team_b_score = sr.b;
  }
  private guardEditable(m: Match) {
    if (m.status === "certified") throw new Error("แมตช์นี้รับรองผลแล้ว — ต้องกด “ยกเลิกการรับรอง” ก่อนจึงจะแก้ได้");
    if (!m.team_a_id || !m.team_b_id) throw new Error("ยังไม่มีผู้เข้าแข่งครบทั้งสองฝั่ง (รอผลแมตช์ก่อนหน้า)");
  }
  private placeInto(nextId: string | undefined, slot: "a" | "b" | undefined, teamId: string | undefined) {
    if (!nextId || !slot) return;
    const next = this.matchOf(nextId);
    next[slot === "b" ? "team_b_id" : "team_a_id"] = teamId;
    this.touch(next);
  }
  private blockedByNext(nextId: string | undefined) { return !!nextId && this.matchOf(nextId).status !== "scheduled"; }
  private settingOf(categoryId: string): CategorySetting {
    return this.s.settings.find((x) => x.category_id === categoryId) ?? DEFAULT_SETTING(categoryId);
  }
  private upsertSetting(categoryId: string, patch: Partial<CategorySetting>): CategorySetting {
    let st = this.s.settings.find((x) => x.category_id === categoryId);
    if (!st) {
      st = DEFAULT_SETTING(categoryId);
      this.s.settings.push(st);
    }
    Object.assign(st, patch, { category_id: categoryId, updated_at: this.ctx.now() });
    this.changes.settings.set(categoryId, st);
    return st;
  }
  private teamsOf(categoryId: string) { return this.s.teams.filter((t) => t.category_id === categoryId); }
  private matchesOf(categoryId: string) { return this.s.matches.filter((m) => m.category_id === categoryId); }
  /** สายล็อกเมื่อมีแมตช์ที่เริ่มแข่งหรือมีสกอร์แล้ว */
  isLocked(categoryId: string) { return this.matchesOf(categoryId).some((m) => m.status !== "scheduled" || m.game_scores.length > 0); }
  /** ลำดับทีมที่ใช้วางสาย: ของเดิมที่ยังอยู่ + ทีมที่ยังไม่มีในลำดับ (สุ่มถ้าโหมดสุ่ม) */
  private effectiveOrder(categoryId: string, setting: CategorySetting): string[] {
    const ids = this.teamsOf(categoryId).map((t) => t.id);
    const kept = setting.seed_order.filter((id) => ids.includes(id));
    const missing = ids.filter((id) => !kept.includes(id));
    return [...kept, ...(setting.seeding === "random" ? shuffle(missing) : missing)];
  }
  private materialize(drafts: MatchDraft[], cat: Category, prefix: string): Match[] {
    const ids = drafts.map(() => this.ctx.newId(`${cat.code}-${prefix}`));
    const id = (i: number) => ids[i];
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
      updated_at: this.ctx.now(),
    }));
  }
  private removeMatches(pred: (m: Match) => boolean) {
    const gone = new Set(this.s.matches.filter(pred).map((m) => m.id));
    this.s.matches = this.s.matches.filter((m) => !gone.has(m.id));
    this.s.audit = this.s.audit.filter((a) => !gone.has(a.match_id));
    for (const id of gone) {
      this.changes.deleteMatches.add(id);
      this.changes.matches.delete(id);
    }
  }
  private addMatches(rows: Match[]) {
    this.s.matches.push(...rows);
    for (const m of rows) this.changes.matches.set(m.id, m);
  }

  // ---------- ผลแมตช์ ----------

  saveProgress(matchId: string, scores: GameScore[]) {
    const m = this.matchOf(matchId);
    this.guardEditable(m);
    const game = this.gameOfMatch(m);
    const bad = checkProgress(scores, m.best_of, usesGoalsDirect(game.code, m.best_of));
    if (bad) throw new Error(bad);
    this.applyScores(m, scores);
    m.status = "ongoing";
    m.winner_id = undefined;
    this.log(m, `บันทึกสกอร์ระหว่างแข่ง ${this.teamName(m.team_a_id)} ${m.team_a_score}-${m.team_b_score} ${this.teamName(m.team_b_id)}`);
    return this.touch(m);
  }

  saveResult(matchId: string, scores: GameScore[]) {
    const m = this.matchOf(matchId);
    this.guardEditable(m);
    const game = this.gameOfMatch(m);
    const bad = checkFinished(scores, m.best_of, usesGoalsDirect(game.code, m.best_of));
    if (bad) throw new Error(bad);
    this.applyScores(m, scores);
    m.status = "ended";
    m.winner_id = m.team_a_score > m.team_b_score ? m.team_a_id : m.team_b_id;
    m.reported_by = this.ctx.staffId;
    this.log(m, `บันทึกผลจบแมตช์ ${this.teamName(m.team_a_id)} ${m.team_a_score}-${m.team_b_score} ${this.teamName(m.team_b_id)} · ผู้ชนะ ${this.teamName(m.winner_id)}`);
    return this.touch(m);
  }

  certifyMatch(matchId: string) {
    const m = this.matchOf(matchId);
    if (m.status !== "ended") throw new Error("รับรองได้เฉพาะแมตช์ที่บันทึกผลจบแล้ว");
    const loser = m.winner_id === m.team_a_id ? m.team_b_id : m.team_a_id;
    m.status = "certified";
    m.certified_by = this.ctx.staffId;
    this.placeInto(m.next_match_id, m.next_match_slot, m.winner_id);
    this.placeInto(m.loser_next_match_id, m.loser_next_match_slot, loser);
    this.log(m, `รับรองผล · ผู้ชนะ ${this.teamName(m.winner_id)} เลื่อนไปแมตช์ถัดไป`);
    return this.touch(m);
  }

  uncertifyMatch(matchId: string) {
    const m = this.matchOf(matchId);
    if (m.status !== "certified") throw new Error("แมตช์นี้ยังไม่ได้รับรอง");
    if (this.blockedByNext(m.next_match_id) || this.blockedByNext(m.loser_next_match_id)) {
      throw new Error("ยกเลิกไม่ได้: แมตช์ถัดไปเริ่มแข่งหรือจบแล้ว ต้องให้แอดมินจัดการ");
    }
    this.placeInto(m.next_match_id, m.next_match_slot, undefined);
    this.placeInto(m.loser_next_match_id, m.loser_next_match_slot, undefined);
    m.status = "ended";
    m.certified_by = undefined;
    this.log(m, "ยกเลิกการรับรองผล · ถอยผู้เล่นออกจากแมตช์ถัดไป");
    return this.touch(m);
  }

  setCheckIn(teamId: string, checkedIn: boolean) {
    const t = must(this.s.teams.find((x) => x.id === teamId), "ทีม/ผู้เล่น");
    t.is_checked_in = checkedIn;
    return this.touchTeam(t);
  }

  // ---------- จัดสาย ----------

  saveCategorySetting(categoryId: string, patch: Partial<Omit<CategorySetting, "category_id" | "updated_at">>) {
    this.categoryOf(categoryId);
    const locked = this.isLocked(categoryId);
    if (locked && (patch.format !== undefined || patch.seed_order !== undefined || patch.group_count !== undefined)) {
      throw new Error("สายถูกล็อกแล้ว (มีแมตช์เริ่มแข่ง) — เปลี่ยนรูปแบบ/ลำดับไม่ได้");
    }
    if (patch.group_count !== undefined && patch.group_count < 1) throw new Error("จำนวนกลุ่มต้องอย่างน้อย 1");
    if (patch.advance_per_group !== undefined && patch.advance_per_group < 1) throw new Error("จำนวนเข้ารอบต่อกลุ่มต้องอย่างน้อย 1");
    const st = this.upsertSetting(categoryId, patch);
    // BO ที่เปลี่ยน → ปรับแมตช์ที่ยังไม่เริ่มให้ตรง
    if (patch.best_of_by_round) {
      for (const m of this.matchesOf(categoryId)) {
        if (m.status === "scheduled" && m.game_scores.length === 0) {
          const bo = bestOfFor(m.round_name, m.stage, st);
          if (bo !== m.best_of) {
            m.best_of = bo;
            this.touch(m);
          }
        }
      }
    }
    return st;
  }

  drawSeedOrder(categoryId: string) {
    this.categoryOf(categoryId);
    if (this.isLocked(categoryId)) throw new Error("สายถูกล็อกแล้ว จับสลากใหม่ไม่ได้");
    return this.upsertSetting(categoryId, { seeding: "random", seed_order: shuffle(this.teamsOf(categoryId).map((t) => t.id)) });
  }

  generateBracket(categoryId: string) {
    const cat = this.categoryOf(categoryId);
    if (this.isLocked(categoryId)) throw new Error("สายถูกล็อก: มีแมตช์ที่เริ่มแข่งหรือมีผลแล้ว สร้างใหม่ไม่ได้");
    const setting = this.settingOf(categoryId);
    if (setting.single_entry === "cancel") throw new Error("ประเภทนี้ถูกยกเลิกแล้ว");
    const order = this.effectiveOrder(categoryId, setting);
    if (order.length < 2) throw new Error("ต้องมีผู้เข้าแข่งอย่างน้อย 2 ทีม/คน (ประเภทที่มีคนเดียวให้เลือกวิธีจัดการด้านล่าง)");
    const saved = this.upsertSetting(categoryId, { seed_order: order });
    const drafts = buildBracket(saved, order);
    this.removeMatches((m) => m.category_id === categoryId);
    const created = this.materialize(drafts, cat, "m");
    this.addMatches(created);
    return created;
  }

  generateKnockout(categoryId: string) {
    const cat = this.categoryOf(categoryId);
    const setting = this.settingOf(categoryId);
    if (setting.format !== "groups") throw new Error("รอบน็อกเอาต์จากกลุ่มใช้ได้เฉพาะรูปแบบแบ่งกลุ่ม");
    const groupMatches = this.matchesOf(categoryId).filter((m) => m.stage === "group");
    if (!groupMatches.length) throw new Error("ยังไม่ได้สร้างรอบแบ่งกลุ่ม");
    if (!groupMatches.every((m) => m.status === "certified")) throw new Error("รอบแบ่งกลุ่มยังไม่จบ — ต้องรับรองผลทุกแมตช์ก่อน");
    const ko = this.matchesOf(categoryId).filter((m) => m.stage !== "group");
    if (ko.some((m) => m.status !== "scheduled" || m.game_scores.length > 0)) throw new Error("รอบน็อกเอาต์เริ่มแข่งแล้ว สร้างใหม่ไม่ได้");

    const groups = splitGroups(setting.seed_order, setting.group_count);
    const ranked = groups.map((members, gi) =>
      computeStandings(members, groupMatches.filter((m) => m.group_name === GROUP_NAMES[gi]), setting.seed_order),
    );
    // อันดับ 1 ทุกกลุ่มก่อน แล้วอันดับ 2 … (ตัวสร้างสายจะไขว้กลุ่มให้เอง)
    const qualifiers: string[] = [];
    for (let r = 0; r < setting.advance_per_group; r++) for (const rows of ranked) if (rows[r]) qualifiers.push(rows[r].team_id);
    if (qualifiers.length < 2) throw new Error("ทีมเข้ารอบไม่ถึง 2 ทีม");

    this.removeMatches((m) => m.category_id === categoryId && m.stage !== "group");
    const created = this.materialize(buildKnockout(setting, qualifiers), cat, "k");
    this.addMatches(created);
    return created;
  }

  resolveSingleEntry(categoryId: string, resolution: SingleEntryResolution, mergeInto?: string) {
    const cat = this.categoryOf(categoryId);
    if (resolution === "merge") {
      const target = must(this.s.categories.find((c) => c.id === mergeInto), "ประเภทปลายทาง");
      if (target.game_id !== cat.game_id) throw new Error("ยุบรวมได้เฉพาะประเภทของเกมเดียวกัน");
      if (this.isLocked(target.id)) throw new Error("ประเภทปลายทางเริ่มแข่งแล้ว ยุบรวมไม่ได้");
      for (const t of this.teamsOf(categoryId)) {
        t.category_id = target.id;
        this.touchTeam(t);
      }
      this.removeMatches((m) => m.category_id === categoryId);
      return this.upsertSetting(categoryId, { single_entry: "merge", merge_into_category_id: target.id });
    }
    if (resolution === "walkover" || resolution === "cancel") this.removeMatches((m) => m.category_id === categoryId);
    return this.upsertSetting(categoryId, { single_entry: resolution, merge_into_category_id: undefined });
  }

  // ---------- ทีม / นักกีฬา ----------

  createTeam(categoryId: string, input: TeamInput & { name: string }) {
    const cat = this.categoryOf(categoryId);
    const name = input.name?.trim();
    if (!name) throw new Error("ต้องใส่ชื่อทีม/นักกีฬา");
    const team: Team = {
      id: this.ctx.newId("t"),
      category_id: cat.id,
      team_code: input.team_code?.trim() || undefined,
      name,
      short_name: input.short_name?.trim() || abbreviateOrg(name),
      logo_url: input.logo_url,
      is_checked_in: false,
    };
    this.s.teams.push(team);
    return this.touchTeam(team);
  }

  updateTeam(teamId: string, patch: TeamInput) {
    const t = must(this.s.teams.find((x) => x.id === teamId), "ทีม/นักกีฬา");
    if (patch.category_id && patch.category_id !== t.category_id) {
      const from = this.categoryOf(t.category_id);
      const to = this.categoryOf(patch.category_id);
      if (from.game_id !== to.game_id) throw new Error("ย้ายได้เฉพาะประเภทของเกมเดียวกัน");
      if (this.s.matches.some((m) => m.team_a_id === teamId || m.team_b_id === teamId)) throw new Error("ทีมนี้อยู่ในสายแล้ว — ต้องสร้างสายใหม่ก่อนจึงย้ายได้");
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
      for (const p of this.s.players.filter((x) => x.team_id === t.id)) {
        if (p.real_name) {
          p.person_key = personKey(p.real_name, t.team_code ?? t.id);
          this.touchPlayer(p);
        }
      }
    }
    return this.touchTeam(t);
  }

  deleteTeam(teamId: string) {
    must(this.s.teams.find((x) => x.id === teamId), "ทีม/นักกีฬา");
    if (this.s.matches.some((m) => m.team_a_id === teamId || m.team_b_id === teamId)) throw new Error("ทีมนี้อยู่ในสายแล้ว ลบไม่ได้ (สร้างสายใหม่ก่อน)");
    for (const p of this.s.players.filter((p) => p.team_id === teamId)) {
      this.changes.deletePlayers.add(p.id);
      this.changes.players.delete(p.id);
    }
    this.s.players = this.s.players.filter((p) => p.team_id !== teamId);
    this.s.teams = this.s.teams.filter((t) => t.id !== teamId);
    this.changes.deleteTeams.add(teamId);
    this.changes.teams.delete(teamId);
  }

  createPlayer(teamId: string, input: PlayerInput) {
    const t = must(this.s.teams.find((x) => x.id === teamId), "ทีม");
    const real = input.real_name?.trim() || undefined;
    const ign = input.in_game_name?.trim() ?? "";
    if (!real && !ign) throw new Error("ต้องใส่ชื่อจริงหรือชื่อในเกมอย่างน้อยหนึ่งอย่าง");
    const used = this.s.players.filter((p) => p.team_id === t.id).map((p) => p.order_in_team ?? 0);
    const order = input.order_in_team ?? (used.length ? Math.max(...used) + 1 : 1);
    const p: Player = {
      id: this.ctx.newId("p"),
      team_id: t.id,
      real_name: real,
      in_game_name: ign,
      is_captain: !!input.is_captain,
      order_in_team: order,
      position: input.position?.trim() || undefined,
      person_key: real ? personKey(real, t.team_code ?? t.id) : undefined,
    };
    if (p.is_captain) {
      for (const x of this.s.players) {
        if (x.team_id === t.id && x.is_captain) {
          x.is_captain = false;
          this.touchPlayer(x);
        }
      }
    }
    this.s.players.push(p);
    return this.touchPlayer(p);
  }

  updatePlayer(playerId: string, patch: PlayerInput) {
    const p = must(this.s.players.find((x) => x.id === playerId), "นักกีฬา");
    if (patch.team_id && patch.team_id !== p.team_id) {
      must(this.s.teams.find((x) => x.id === patch.team_id), "ทีมปลายทาง");
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
      for (const x of this.s.players) {
        if (x.team_id === p.team_id && x.is_captain && x.id !== p.id) {
          x.is_captain = false;
          this.touchPlayer(x);
        }
      }
      p.is_captain = true;
    } else if (patch.is_captain === false) p.is_captain = false;
    if (!p.real_name && !p.in_game_name) throw new Error("ต้องมีชื่อจริงหรือชื่อในเกมอย่างน้อยหนึ่งอย่าง");
    const t = must(this.s.teams.find((x) => x.id === p.team_id), "ทีม");
    p.person_key = p.real_name ? personKey(p.real_name, t.team_code ?? t.id) : undefined;
    return this.touchPlayer(p);
  }

  deletePlayer(playerId: string) {
    must(this.s.players.find((x) => x.id === playerId), "นักกีฬา");
    this.s.players = this.s.players.filter((p) => p.id !== playerId);
    this.changes.deletePlayers.add(playerId);
    this.changes.players.delete(playerId);
  }

  previewImport(text: string): ImportPreview {
    const roster = parseRoster(text);
    if (!roster.players.length) throw new Error("ไม่พบรายชื่อนักกีฬาในข้อความ (ต้องมีส่วน ## players)");
    return mergeRoster(this.s, roster, false);
  }

  applyImport(text: string): ImportPreview {
    const roster = parseRoster(text);
    if (!roster.players.length) throw new Error("ไม่พบรายชื่อนักกีฬาในข้อความ (ต้องมีส่วน ## players)");
    const before = {
      games: new Set(this.s.games.map((x) => x.id)),
      stations: new Set(this.s.stations.map((x) => x.id)),
      categories: new Set(this.s.categories.map((x) => x.id)),
      teams: new Set(this.s.teams.map((x) => x.id)),
      players: new Set(this.s.players.map((x) => x.id)),
    };
    const result = mergeRoster(this.s, roster, true, this.ctx.newId);
    for (const g of this.s.games) if (!before.games.has(g.id)) this.changes.games.set(g.id, g);
    for (const st of this.s.stations) if (!before.stations.has(st.id)) this.changes.stations.set(st.id, st);
    for (const c of this.s.categories) if (!before.categories.has(c.id)) this.changes.categories.set(c.id, c);
    for (const t of this.s.teams) if (!before.teams.has(t.id)) this.changes.teams.set(t.id, t);
    for (const p of this.s.players) if (!before.players.has(p.id)) this.changes.players.set(p.id, p);
    return result;
  }

  // ---------- ตาราง / สถานี ----------

  updateMatchSchedule(matchId: string, patch: SchedulePatch) {
    const m = this.matchOf(matchId);
    if (patch.station_id !== undefined) {
      if (patch.station_id) {
        const st = must(this.s.stations.find((x) => x.id === patch.station_id), "สถานี");
        if (st.game_id !== this.gameOfMatch(m).id) throw new Error("สถานีต้องเป็นของเกมเดียวกัน");
        m.station_id = st.id;
      } else m.station_id = undefined;
    }
    if (patch.scheduled_time !== undefined) m.scheduled_time = patch.scheduled_time || undefined;
    if (patch.best_of !== undefined) {
      if (m.status !== "scheduled" || m.game_scores.length > 0) throw new Error("แมตช์เริ่มแล้ว เปลี่ยน BO ไม่ได้");
      if (patch.best_of < 1) throw new Error("BO ต้องอย่างน้อย 1");
      m.best_of = patch.best_of;
    }
    return this.touch(m);
  }

  autoQueue(gameId: string) {
    const game = must(this.s.games.find((g) => g.id === gameId), "เกม");
    // ข้ามแมตช์ที่มีนักกีฬาซ้ำกับแมตช์ที่กำลังแข่ง/ลงสถานีแล้ว (lib/data/queue.ts)
    const { assigned } = planQueue(this.s, this.s.stations, game.id, this.ctx.now());
    return assigned.map((m) => this.touch(m));
  }

  // ---------- สปอนเซอร์ ----------

  createSponsor(input: Omit<Sponsor, "id">) {
    if (!input.name?.trim()) throw new Error("ต้องใส่ชื่อสปอนเซอร์");
    const sp: Sponsor = { ...input, id: this.ctx.newId("sp"), name: input.name.trim() };
    this.s.sponsors.push(sp);
    this.changes.sponsors.set(sp.id, sp);
    return sp;
  }
  updateSponsor(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>) {
    const sp = must(this.s.sponsors.find((x) => x.id === sponsorId), "สปอนเซอร์");
    Object.assign(sp, patch);
    if (!sp.name.trim()) throw new Error("ชื่อห้ามว่าง");
    this.changes.sponsors.set(sp.id, sp);
    return sp;
  }
  deleteSponsor(sponsorId: string) {
    must(this.s.sponsors.find((x) => x.id === sponsorId), "สปอนเซอร์");
    this.s.sponsors = this.s.sponsors.filter((x) => x.id !== sponsorId);
    this.changes.deleteSponsors.add(sponsorId);
    this.changes.sponsors.delete(sponsorId);
  }

  // ---------- ตั้งค่างาน ----------

  saveEventConfig(patch: Partial<Omit<EventConfig, "updated_at">>) {
    if (patch.days) {
      const bad = patch.days.find((d) => d && !/^\d{4}-\d{2}-\d{2}$/.test(d));
      if (bad) throw new Error(`รูปแบบวันที่ผิด: ${bad}`);
      patch = { ...patch, days: patch.days.filter(Boolean) };
    }
    Object.assign(this.s.eventConfig, patch, { updated_at: this.ctx.now() });
    this.changes.eventConfig = this.s.eventConfig;
    return this.s.eventConfig;
  }

  // ---------- รูปนักกีฬา (เฉพาะแถว — ไฟล์จัดการที่ชั้นเก็บข้อมูล) ----------

  savePhotoRow(personKeyValue: string, urls: { original_url: string; cutout_url: string }, consent: boolean) {
    if (!personKeyValue) throw new Error("ไม่มีกุญแจนักกีฬา");
    const id = photoIdFor(personKeyValue);
    const row: AthletePhoto = { id, person_key: personKeyValue, ...urls, consent, updated_at: this.ctx.now() };
    const i = this.s.photos.findIndex((p) => p.id === id);
    if (i >= 0) this.s.photos[i] = row;
    else this.s.photos.push(row);
    this.changes.photos.set(id, row);
    return row;
  }
  setPhotoConsent(photoId: string, consent: boolean) {
    const p = must(this.s.photos.find((x) => x.id === photoId), "รูป");
    p.consent = consent;
    p.updated_at = this.ctx.now();
    this.changes.photos.set(p.id, p);
    return p;
  }
  deletePhotoRow(photoId: string) {
    this.s.photos = this.s.photos.filter((p) => p.id !== photoId);
    this.changes.deletePhotos.add(photoId);
    this.changes.photos.delete(photoId);
  }
}
