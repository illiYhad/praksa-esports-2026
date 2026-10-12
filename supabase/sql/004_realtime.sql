-- 004_realtime.sql
-- QA_SCHEMA_v1_2026-10-12.md ส่วนที่ 2 "บล็อก 8 ฉบับแก้ — Realtime" ตามตัวอักษร
-- ⛔ เขียนให้เท่านั้น ไม่ได้รัน · (ไม่ DROP publication เดิมตามที่ QA แก้)

ALTER PUBLICATION supabase_realtime ADD TABLE matches, stations, teams, sponsors;
