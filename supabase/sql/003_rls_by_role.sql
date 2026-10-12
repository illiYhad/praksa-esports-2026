-- 003_rls_by_role.sql
-- QA_SCHEMA_v1_2026-10-12.md ส่วนที่ 2 "บล็อก 7 ฉบับแก้ — RLS ตามบทบาท" ตามตัวอักษร
-- ⛔ เขียนให้เท่านั้น ไม่ได้รัน · รันหลัง 001 และ 002

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS staff_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT role FROM public.staff_profiles WHERE id = auth.uid() $$;

REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- อ่านได้ทุกคน (หน้าเว็บสาธารณะ)
CREATE POLICY public_read ON games FOR SELECT USING (true);
CREATE POLICY public_read ON categories FOR SELECT USING (true);
CREATE POLICY public_read ON stations FOR SELECT USING (true);
CREATE POLICY public_read ON teams FOR SELECT USING (true);
CREATE POLICY public_read ON players FOR SELECT USING (true);
CREATE POLICY public_read ON matches FOR SELECT USING (true);
CREATE POLICY public_read ON sponsors FOR SELECT USING (true);

-- สตาฟอ่านโปรไฟล์ตัวเอง · แอดมินอ่านได้ทุกคน · ไม่มีใครเขียนผ่านเว็บ (พี่หยัดเพิ่มสตาฟเอง)
CREATE POLICY staff_read_self ON staff_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_staff_role() = 'admin');

-- แอดมินจัดการข้อมูลหลักทั้งหมด
CREATE POLICY admin_write ON games FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');
CREATE POLICY admin_write ON categories FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');
CREATE POLICY admin_write ON stations FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');
CREATE POLICY admin_write ON teams FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');
CREATE POLICY admin_write ON players FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');
CREATE POLICY admin_write ON sponsors FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');
CREATE POLICY admin_write ON matches FOR ALL TO authenticated
  USING (public.current_staff_role() = 'admin') WITH CHECK (public.current_staff_role() = 'admin');

-- คนกรอกผล: แก้ผลแมตช์ + เช็กอินทีมได้ (แก้อย่างเดียว ลบ/สร้างไม่ได้)
CREATE POLICY result_update ON matches FOR UPDATE TO authenticated
  USING (public.current_staff_role() = 'result_staff') WITH CHECK (public.current_staff_role() = 'result_staff');
CREATE POLICY result_checkin ON teams FOR UPDATE TO authenticated
  USING (public.current_staff_role() = 'result_staff') WITH CHECK (public.current_staff_role() = 'result_staff');

-- ประวัติแก้ผล: สตาฟเขียนได้เฉพาะในชื่อตัวเอง · แอดมินอ่าน
CREATE POLICY staff_insert ON match_audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.current_staff_role() IS NOT NULL AND staff_id = auth.uid());
CREATE POLICY admin_read ON match_audit_logs FOR SELECT TO authenticated
  USING (public.current_staff_role() = 'admin');
