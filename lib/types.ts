// ชนิดข้อมูลตาม SCHEMA_v1 ของพี่ศิลา (+ คอลัมน์ที่อลิสขอเพิ่มใน QA บล็อก 9 — รอพี่ศิลายืนยัน)
export type Game = {
  id: string;
  name: string;
  code: string;
  format: "team" | "solo";
  team_size: number;
};

export type Category = { id: string; game_id: string; name: string };

export type Station = { id: string; game_id: string; name: string };

// เกมเดี่ยว = ทีม 1 คน
export type Team = {
  id: string;
  category_id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  is_checked_in: boolean;
};

export type Player = {
  id: string;
  team_id: string;
  real_name?: string;
  in_game_name: string;
  is_captain: boolean;
};

export type MatchStatus = "scheduled" | "ongoing" | "ended" | "certified";

export type GameScore = { a: number; b: number };

export type Match = {
  id: string;
  category_id: string;
  station_id?: string;
  round_name: string;
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

export type StaffRole = "admin" | "result_staff" | "stream_operator";

export type Scene = "STARTING" | "LIVE" | "BREAK" | "RESULT" | "BRACKET" | "SPONSOR";
