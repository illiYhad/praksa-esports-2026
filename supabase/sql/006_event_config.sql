-- 006_event_config.sql
-- ตารางตั้งค่ารูปแบบแข่งต่อประเภท (เฟส B) + ตั้งค่างาน (เฟส C) — โค้ด K-S4 ใช้
-- ⛔ โคลท์เขียนให้เท่านั้น ไม่ได้รัน · รันหลัง 005 (ใช้ current_staff_role จาก 003)

-- ตั้งค่ารูปแบบแข่งต่อประเภท (1 แถวต่อประเภท)
CREATE TABLE category_settings (
    category_id UUID PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
    format TEXT NOT NULL DEFAULT 'single' CHECK (format IN ('single','double','round_robin','groups')),
    third_place BOOLEAN NOT NULL DEFAULT FALSE,
    group_count INTEGER NOT NULL DEFAULT 2 CHECK (group_count >= 1),
    advance_per_group INTEGER NOT NULL DEFAULT 2 CHECK (advance_per_group >= 1),
    best_of_by_round JSONB NOT NULL DEFAULT '{}'::jsonb,        -- { "<round_name>": 3, "group": 1 }
    seeding TEXT NOT NULL DEFAULT 'random' CHECK (seeding IN ('random','manual')),
    seed_order JSONB NOT NULL DEFAULT '[]'::jsonb,              -- [team_id, ...] ลำดับที่ใช้วางสาย
    single_entry TEXT NOT NULL DEFAULT 'pending' CHECK (single_entry IN ('pending','walkover','merge','cancel')),
    merge_into_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE category_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON category_settings FOR SELECT USING (true);
CREATE POLICY admin_write ON category_settings FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');

-- ตั้งค่างาน (แถวเดียว id = 1): วันแข่ง 1–4 · ประกาศหน้าแรก · โลโก้/สีงาน
CREATE TABLE event_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    days JSONB NOT NULL DEFAULT '[]'::jsonb,                    -- ["2026-10-19", "2026-10-20", ...]
    announcement TEXT NOT NULL DEFAULT '',
    logo_url TEXT,
    theme JSONB,                                                -- { "accent": "#...", "accent2": "#...", "bg": "#..." }
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE event_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_read ON event_config FOR SELECT USING (true);
CREATE POLICY admin_write ON event_config FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');

-- วันแข่ง 1–4 (พี่หยัดยืนยัน 2026-10-12 14:46): จันทร์ 19 · อังคาร 20 · พุธ 21 · พฤหัส 22 ต.ค. 2569
INSERT INTO event_config (id, days) VALUES (1, '["2026-10-19","2026-10-20","2026-10-21","2026-10-22"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- (ไม่บังคับ) ให้หน้าแอดมินรับการเปลี่ยนแปลงสด
-- ALTER PUBLICATION supabase_realtime ADD TABLE category_settings, event_config, athlete_photos;
