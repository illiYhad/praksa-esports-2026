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

export type TeamInput = Partial<Pick<Team, "name" | "short_name" | "logo_url" | "photo_url" | "team_code" | "category_id">>;
export type PlayerInput = Partial<
  Pick<Player, "real_name" | "in_game_name" | "is_captain" | "position" | "order_in_team" | "team_id" | "quote" | "hide_real_name">
>;
export type SchedulePatch = { station_id?: string | null; scheduled_time?: string | null; best_of?: number };
export type PhotoUpload = { original: Uint8Array; originalMime: string; cutout: Uint8Array; consent: boolean };
export type PhotoKind = "original" | "cutout";

export interface DataSource {
  // อ่าน
  getGames(): Promise<Game[]>;
  getCategories(gameId?: string): Promise<Category[]>;
  getTeams(gameId?: string): Promise<Team[]>;
  getPlayers(gameId?: string): Promise<Player[]>;
  getStations(gameId?: string): Promise<Station[]>;
  getMatches(gameId?: string): Promise<Match[]>;
  getSponsors(): Promise<Sponsor[]>;
  getAuditLogs(matchId: string): Promise<MatchAuditLog[]>;
  /** ตั้งค่ารูปแบบแข่งทุกประเภท (ประเภทที่ยังไม่ตั้ง = ค่าเริ่มต้น) */
  getCategorySettings(): Promise<CategorySetting[]>;
  getEventConfig(): Promise<EventConfig>;
  getPhotos(): Promise<AthletePhoto[]>;

  // ผลแมตช์ — ผิดกติกาให้ throw Error ข้อความไทย
  /** บันทึกสกอร์ระหว่างแข่ง → status=ongoing */
  saveProgress(matchId: string, gameScores: GameScore[]): Promise<Match>;
  /** บันทึกผลจบแมตช์ → status=ended + winner_id */
  saveResult(matchId: string, gameScores: GameScore[]): Promise<Match>;
  /** รับรองผล → status=certified + ผู้ชนะ/ผู้แพ้เลื่อนไปแมตช์ถัดไป */
  certifyMatch(matchId: string): Promise<Match>;
  /** ยกเลิกการรับรอง → status=ended + ถอยผู้เล่นออกจากแมตช์ถัดไป (ถ้ายังไม่เริ่ม) */
  uncertifyMatch(matchId: string): Promise<Match>;
  setCheckIn(teamId: string, checkedIn: boolean): Promise<Team>;

  // จัดสาย (แอดมิน)
  saveCategorySetting(categoryId: string, patch: Partial<Omit<CategorySetting, "category_id" | "updated_at">>): Promise<CategorySetting>;
  /** จับสลาก: สุ่มลำดับทีมทั้งประเภทลง seed_order */
  drawSeedOrder(categoryId: string): Promise<CategorySetting>;
  /** สร้าง/สร้างใหม่แมตช์ทั้งประเภทจาก setting + seed_order · throw ถ้าสายล็อก (มีแมตช์เริ่มแล้ว) */
  generateBracket(categoryId: string): Promise<Match[]>;
  /** แบ่งกลุ่ม → สร้างรอบน็อกเอาต์จากอันดับกลุ่ม (ต้องรับรองผลรอบกลุ่มครบ) */
  generateKnockout(categoryId: string): Promise<Match[]>;
  /** ประเภทที่มีผู้สมัครคนเดียว: ได้รางวัลโดยไม่มีคู่แข่ง / ยุบรวม / ยกเลิก */
  resolveSingleEntry(categoryId: string, resolution: SingleEntryResolution, mergeInto?: string): Promise<CategorySetting>;

  // ทีม / นักกีฬา (แอดมิน)
  createTeam(categoryId: string, input: TeamInput & { name: string }): Promise<Team>;
  updateTeam(teamId: string, patch: TeamInput): Promise<Team>;
  /** ลบไม่ได้ถ้าทีมอยู่ในแมตช์ */
  deleteTeam(teamId: string): Promise<void>;
  createPlayer(teamId: string, input: PlayerInput): Promise<Player>;
  updatePlayer(playerId: string, patch: PlayerInput): Promise<Player>;
  deletePlayer(playerId: string): Promise<void>;

  // นำเข้ารายชื่อ (ข้อความรูปแบบไฟล์ ROSTER) — ซ้ำไม่สร้างซ้ำ
  previewImport(text: string): Promise<ImportPreview>;
  applyImport(text: string): Promise<ImportPreview>;

  // ตาราง / สถานี
  updateMatchSchedule(matchId: string, patch: SchedulePatch): Promise<Match>;
  /** จัดคิวอัตโนมัติ: แมตช์ที่พร้อมเล่น (ครบสองฝั่ง ยังไม่มีสถานี) เรียงตามรอบ → สถานีว่างของเกมนั้น */
  autoQueue(gameId: string): Promise<Match[]>;

  // สปอนเซอร์
  createSponsor(input: Omit<Sponsor, "id">): Promise<Sponsor>;
  updateSponsor(sponsorId: string, patch: Partial<Omit<Sponsor, "id">>): Promise<Sponsor>;
  deleteSponsor(sponsorId: string): Promise<void>;

  // ตั้งค่างาน
  saveEventConfig(patch: Partial<Omit<EventConfig, "updated_at">>): Promise<EventConfig>;

  // รูปนักกีฬา (ผูกกับ person_key ใช้ได้ทุกประเภท)
  savePhoto(personKey: string, upload: PhotoUpload): Promise<AthletePhoto>;
  setPhotoConsent(photoId: string, consent: boolean): Promise<AthletePhoto>;
  deletePhoto(photoId: string): Promise<void>;
  /** ไฟล์รูป (mock เก็บในหน่วยความจำ) — Supabase อาจคืน redirect ไป Storage แทน */
  getPhotoFile(photoId: string, kind: PhotoKind): Promise<{ bytes: Uint8Array; mime: string } | { redirect: string } | null>;

  /** ฟังการเปลี่ยนของข้อมูล (ไม่มีคำสั่งควบคุม) — mock: BroadcastChannel · Supabase: postgres_changes */
  subscribe(onChange: () => void): () => void;
}
