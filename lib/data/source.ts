import type {
  Category,
  CategorySetting,
  Game,
  GameScore,
  Match,
  MatchAuditLog,
  Player,
  SingleEntryResolution,
  Sponsor,
  Station,
  Team,
} from "@/lib/types";

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

  /** ฟังการเปลี่ยนของข้อมูล (ไม่มีคำสั่งควบคุม) — mock: BroadcastChannel · Supabase: postgres_changes */
  subscribe(onChange: () => void): () => void;
}
