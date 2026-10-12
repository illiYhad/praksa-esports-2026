// ชนิดข้อมูลตาม SCHEMA_v1 ของพี่ศิลา (+ คอลัมน์ที่อลิสขอเพิ่มใน QA บล็อก 9 — รอพี่ศิลายืนยัน)
export type Game = {
  id: string;
  name: string;
  code: string;
  format: "team" | "solo";
  team_size: number;
};

export type Category = { id: string; game_id: string; code: string; name: string };

export type Station = { id: string; game_id: string; name: string };

// เกมเดี่ยว = ทีม 1 คน
export type Team = {
  id: string;
  category_id: string;
  /** รหัส อปท. (T01…) — ทีม อปท. เดียวกันในหลายประเภทใช้รหัสเดียวกัน · (คอลัมน์ขอเพิ่ม บล็อก 10) */
  team_code?: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  /** รูปทีม (บล็อก 10) */
  photo_url?: string;
  is_checked_in: boolean;
};

export type Player = {
  id: string;
  team_id: string;
  real_name?: string;
  in_game_name: string;
  is_captain: boolean;
  order_in_team?: number;
  /** ตำแหน่ง: ROV = เลน · SF6 = ตัวละครหลัก · eFootball = ทีมที่ใช้ (บล็อก 10) */
  position?: string;
  /** คำพูดประจำตัว (บล็อก 10) */
  quote?: string;
  /** ซ่อนชื่อจริงบนหน้าสาธารณะ — แสดงชื่อในเกมหรืออักษรย่อแทน (บล็อก 10) */
  hide_real_name?: boolean;
  /** คนเดียวกันข้ามประเภท = ชื่อจริง + team_code · ใช้ผูกรูปถ่าย (บล็อก 10) */
  person_key?: string;
};

/** รูปนักกีฬา 1 แถวต่อคน (ตาราง athlete_photos · บล็อก 10) — URL ชี้ไป /api/photos/… (mock) หรือ Storage (Supabase) */
export type AthletePhoto = {
  id: string;
  person_key: string;
  original_url: string;
  cutout_url: string;
  /** ได้รับความยินยอมให้ใช้รูป (เยาวชน = ผู้ปกครอง) — false = ไม่แสดงบนหน้าสาธารณะ */
  consent: boolean;
  updated_at: string;
};

/** ตั้งค่างาน (ตาราง event_config แถวเดียว · ขอเพิ่ม บล็อก 10) */
export type EventConfig = {
  /** วันแข่ง 1–4 (YYYY-MM-DD) */
  days: string[];
  /** ข้อความประกาศหน้าแรก (ว่าง = ไม่แสดง) */
  announcement: string;
  logo_url?: string;
  theme?: { accent?: string; accent2?: string; bg?: string };
  updated_at: string;
};

/** ผลพรีวิว/นำเข้ารายชื่อจากข้อความรูปแบบ ROSTER */
export type ImportPreview = {
  newCategories: string[];
  unknownGames: string[];
  newTeams: number;
  existingTeams: number;
  newPlayers: number;
  existingPlayers: number;
  errors: string[];
};

export type MatchStatus = "scheduled" | "ongoing" | "ended" | "certified";

export type GameScore = { a: number; b: number };

/** ส่วนของสาย: winners = สายบน/น็อกเอาต์ · losers = สายล่าง (double) · final = Grand Final (double) · third = ชิงอันดับ 3 · group = แบ่งกลุ่ม/พบกันหมด */
export type MatchStage = "winners" | "losers" | "final" | "third" | "group";

export type Match = {
  id: string;
  category_id: string;
  station_id?: string;
  round_name: string;
  /** (คอลัมน์ขอเพิ่ม บล็อก 10) โครงสร้างสาย */
  stage?: MatchStage;
  round_no?: number;
  group_name?: string;
  sort_order?: number;
  best_of: number;
  status: MatchStatus;
  scheduled_time?: string;
  team_a_id?: string;
  team_b_id?: string;
  team_a_score: number;
  team_b_score: number;
  winner_id?: string;
  next_match_id?: string;
  next_match_slot?: "a" | "b";
  loser_next_match_id?: string;
  loser_next_match_slot?: "a" | "b";
  game_scores: GameScore[];
  reported_by?: string;
  certified_by?: string;
  updated_at: string;
};

export type MatchAuditLog = {
  id: string;
  match_id: string;
  staff_id?: string;
  action_details: string;
  created_at: string;
};

export type SponsorLevel = "main" | "co" | "support";
export type SponsorPosition = "bottom_ticker" | "corner" | "stinger" | "full_screen";

export type Sponsor = {
  id: string;
  name: string;
  level: SponsorLevel;
  position: SponsorPosition;
  sequence: number;
  logo_url: string;
  is_active: boolean;
};

export type BracketFormat = "single" | "double" | "round_robin" | "groups";
export type SeedingMode = "random" | "manual";
export type SingleEntryResolution = "pending" | "walkover" | "merge" | "cancel";

/** ตั้งค่ารูปแบบแข่งต่อประเภท (ตาราง category_settings · ขอเพิ่ม บล็อก 10) */
export type CategorySetting = {
  category_id: string;
  format: BracketFormat;
  third_place: boolean;
  group_count: number;
  advance_per_group: number;
  /** BO ต่อรอบ key = round_name · key พิเศษ "group" = รอบแบ่งกลุ่ม/พบกันหมด */
  best_of_by_round: Record<string, number>;
  seeding: SeedingMode;
  /** ลำดับทีม (id) ที่ใช้วางสาย — จากจับสลากหรือเรียงเอง */
  seed_order: string[];
  single_entry: SingleEntryResolution;
  merge_into_category_id?: string;
  updated_at: string;
};

export type StaffRole = "admin" | "result_staff" | "stream_operator";

export type Scene = "STARTING" | "LIVE" | "BREAK" | "RESULT" | "BRACKET" | "SPONSOR";
