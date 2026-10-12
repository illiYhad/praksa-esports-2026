-- 002_block9_columns.sql
-- QA_SCHEMA_v1_2026-10-12.md ส่วนที่ 2 บล็อก 9 — คอลัมน์ที่อลิสขอเพิ่ม (รอพี่ศิลายืนยัน) ตามตัวอักษร
-- ⛔ เขียนให้เท่านั้น ไม่ได้รัน

ALTER TABLE games
  ADD COLUMN code TEXT UNIQUE,
  ADD COLUMN team_size INTEGER NOT NULL DEFAULT 1;

ALTER TABLE teams
  ADD COLUMN short_name TEXT,
  ADD COLUMN logo_url TEXT;

ALTER TABLE matches
  ADD COLUMN next_match_slot TEXT CHECK (next_match_slot IN ('a','b')),
  ADD COLUMN loser_next_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  ADD COLUMN loser_next_match_slot TEXT CHECK (loser_next_match_slot IN ('a','b')),
  ADD COLUMN game_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD CONSTRAINT matches_next_match_fk FOREIGN KEY (next_match_id) REFERENCES matches(id) ON DELETE SET NULL;
