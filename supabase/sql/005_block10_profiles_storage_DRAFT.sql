-- DRAFT รอพี่ศิลายืนยัน
-- 005_block10_profiles_storage_DRAFT.sql · บล็อก 10 (ซอง ALICH-PACKET-004)
-- คอลัมน์ที่โค้ด K-S4 ใช้แต่ Schema v1 + บล็อก 9 ยังไม่มี + ตารางรูปนักกีฬา + Storage bucket
-- ⛔ โคลท์เขียนให้เท่านั้น ไม่ได้รัน · รันหลัง 003

-- 10.1 ประเภท: รหัสสั้นที่ใช้ใน URL/นำเข้า (เช่น rov-m-u16)
ALTER TABLE categories
  ADD COLUMN code TEXT UNIQUE;

-- 10.2 ทีม: รหัส อปท. (ทีมเดียวกันในหลายประเภทใช้รหัสเดียวกัน) + รูปทีม
ALTER TABLE teams
  ADD COLUMN team_code TEXT,
  ADD COLUMN photo_url TEXT;
CREATE INDEX IF NOT EXISTS teams_team_code_idx ON teams (team_code);

-- 10.3 นักกีฬา: ลำดับในทีม · ตำแหน่ง · คำพูด · ซ่อนชื่อจริง · กุญแจคนเดียวกันข้ามประเภท (ชื่อจริง|team_code)
ALTER TABLE players
  ADD COLUMN order_in_team INTEGER,
  ADD COLUMN position TEXT,
  ADD COLUMN quote TEXT,
  ADD COLUMN hide_real_name BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN person_key TEXT;
CREATE INDEX IF NOT EXISTS players_person_key_idx ON players (person_key);

-- 10.4 แมตช์: โครงสร้างสาย (สายบน/สายล่าง/Grand Final/ชิงที่ 3/กลุ่ม) · เลขรอบ · ชื่อกลุ่ม · ลำดับแสดงผล
ALTER TABLE matches
  ADD COLUMN stage TEXT CHECK (stage IN ('winners','losers','final','third','group')),
  ADD COLUMN round_no INTEGER,
  ADD COLUMN group_name TEXT,
  ADD COLUMN sort_order INTEGER;

-- 10.5 รูปนักกีฬา 1 แถวต่อคน (person_key) — URL ชี้ไป Storage · consent = ความยินยอมให้ใช้รูป (เยาวชน = ผู้ปกครอง)
CREATE TABLE athlete_photos (
    id TEXT PRIMARY KEY,                 -- photoIdFor(person_key) จากโค้ด (djb2 hex) ใช้เป็นชื่อโฟลเดอร์ใน Storage
    person_key TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    cutout_url TEXT NOT NULL,
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by UUID REFERENCES staff_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE athlete_photos ENABLE ROW LEVEL SECURITY;
-- สาธารณะอ่านได้เฉพาะแถวที่ยินยอมแล้ว (ชั้น DB ไม่พึ่งโค้ดอย่างเดียว) · สตาฟถ่ายรูป (admin / result_staff) อ่าน/เขียนได้ทุกแถว
CREATE POLICY public_read_consented ON athlete_photos FOR SELECT USING (consent = true);
CREATE POLICY photo_staff_read ON athlete_photos FOR SELECT TO authenticated
  USING (public.current_staff_role() IN ('admin','result_staff'));
CREATE POLICY photo_staff_write ON athlete_photos FOR ALL TO authenticated
  USING (public.current_staff_role() IN ('admin','result_staff'))
  WITH CHECK (public.current_staff_role() IN ('admin','result_staff'));

-- 10.6 Storage bucket สำหรับรูป — **private** (ไม่เปิดอ่านสาธารณะ เพราะมีรูปที่ยังไม่ยินยอม)
-- เว็บเสิร์ฟผ่าน /api/photos/<id>/<kind> ซึ่งตรวจ consent/สิทธิ์ แล้ว redirect ไป signed URL (ฝั่ง server ใช้ SUPABASE_SERVICE_ROLE_KEY)
-- path = <photo id>/original.jpg และ <photo id>/cutout.png
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('athlete-photos', 'athlete-photos', false, 6291456, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY athlete_photos_staff_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'athlete-photos' AND public.current_staff_role() IN ('admin','result_staff'));
CREATE POLICY athlete_photos_staff_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'athlete-photos' AND public.current_staff_role() IN ('admin','result_staff'));
CREATE POLICY athlete_photos_staff_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'athlete-photos' AND public.current_staff_role() IN ('admin','result_staff'))
  WITH CHECK (bucket_id = 'athlete-photos' AND public.current_staff_role() IN ('admin','result_staff'));
CREATE POLICY athlete_photos_staff_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'athlete-photos' AND public.current_staff_role() IN ('admin','result_staff'));

-- 10.7 สตาฟถ่ายรูป (result_staff) ต้องแก้โปรไฟล์นักกีฬาเล็กน้อยได้ไหม (ชื่อในเกน/ตำแหน่ง)? — ยังไม่ให้ · ถ้าต้องการให้เพิ่ม policy นี้
-- CREATE POLICY result_update_players ON players FOR UPDATE TO authenticated
--   USING (public.current_staff_role() = 'result_staff') WITH CHECK (public.current_staff_role() = 'result_staff');
