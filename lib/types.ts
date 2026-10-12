// ชนิดข้อมูลชั่วคราว — จะเปลี่ยนตาม Schema ของพี่ศิลาภายหลัง
export type Game = {
  id: string;
  code: string;
  name: string;
  format: "team" | "solo";
  team_size: number;
};

export type Participant = {
  id: string;
  game_id: string;
  name: string;
  short_name?: string;
  logo_url?: string;
  members?: string[];
  checked_in: boolean;
};

export type Station = {
  id: string;
  game_id: string;
  label: string;
};

export type MatchStatus = "scheduled" | "live" | "finished" | "confirmed";

export type Match = {
  id: string;
  game_id: string;
  round_label: string;
  best_of: number;
  station_id?: string;
  scheduled_at?: string;
  status: MatchStatus;
  a_id?: string;
  b_id?: string;
  a_series: number;
  b_series: number;
  games: { a: number; b: number }[];
  next_match_id?: string;
  next_slot?: "a" | "b";
};

export type SponsorSlot = "bar" | "corner" | "stinger" | "fullscreen";

export type Sponsor = {
  id: string;
  name: string;
  logo_url: string;
  tier: "main" | "co" | "support";
  slots: SponsorSlot[];
};

export type StaffRole = "admin" | "result_staff" | "stream_operator";

export type Scene = "STARTING" | "LIVE" | "BREAK" | "RESULT" | "BRACKET" | "SPONSOR";
