import type { Category, Game, GameScore, Match, MatchAuditLog, Player, Sponsor, Station, Team } from "@/lib/types";

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

  // เขียน — ผิดกติกาให้ throw Error ข้อความไทย
  /** บันทึกสกอร์ระหว่างแข่ง → status=ongoing */
  saveProgress(matchId: string, gameScores: GameScore[]): Promise<Match>;
  /** บันทึกผลจบแมตช์ → status=ended + winner_id */
  saveResult(matchId: string, gameScores: GameScore[]): Promise<Match>;
  /** รับรองผล → status=certified + ผู้ชนะ/ผู้แพ้เลื่อนไปแมตช์ถัดไป */
  certifyMatch(matchId: string): Promise<Match>;
  /** ยกเลิกการรับรอง → status=ended + ถอยผู้เล่นออกจากแมตช์ถัดไป (ถ้ายังไม่เริ่ม) */
  uncertifyMatch(matchId: string): Promise<Match>;
  setCheckIn(teamId: string, checkedIn: boolean): Promise<Team>;

  /** ฟังการเปลี่ยนของข้อมูล (ไม่มีคำสั่งควบคุม) — mock: BroadcastChannel · K-S4: Supabase postgres_changes บน matches */
  subscribe(onChange: () => void): () => void;
}
