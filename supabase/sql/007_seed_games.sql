-- 007_seed_games.sql
-- ข้อมูลตั้งต้น 3 เกม + สถานี (ROV 8 · SF6 1 · eFootball 4) — ต้องมีก่อนนำเข้ารายชื่อผ่าน /admin/import
-- ⛔ เขียนให้เท่านั้น ไม่ได้รัน · รันหลัง 002 (ต้องมี games.code / team_size)

INSERT INTO games (name, format, code, team_size) VALUES
  ('ROV', 'team', 'rov', 5),
  ('Street Fighter 6', 'solo', 'sf6', 1),
  ('eFootball Mobile', 'solo', 'efootball', 1)
ON CONFLICT (code) DO NOTHING;

INSERT INTO stations (game_id, name)
SELECT g.id, 'สถานี ' || n
FROM games g
JOIN LATERAL generate_series(1, CASE g.code WHEN 'rov' THEN 8 WHEN 'efootball' THEN 4 ELSE 1 END) AS n ON true
WHERE NOT EXISTS (SELECT 1 FROM stations s WHERE s.game_id = g.id);
