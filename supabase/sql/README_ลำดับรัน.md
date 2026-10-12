# ลำดับรัน SQL · โปรเจกต์ Supabase `praksa-esports-2026`

> ⛔ โคลท์เขียนไฟล์ให้เท่านั้น **ไม่ได้รัน** · พี่หยัดรันเองใน Supabase → SQL Editor
> SQL Editor แสดงผลเฉพาะ query สุดท้าย → ถ้าอยากเห็นผลทุกบรรทัด ให้รันทีละไฟล์ (หรือทีละบล็อก) และดูแท็บ Table Editor ประกอบ

| ลำดับ | ไฟล์ | เนื้อหา | ที่มา | สถานะ |
|---|---|---|---|---|
| 1 | `001_schema_v1.sql` | ENUM · ตารางหลัก 9 ตาราง | SCHEMA v1 พี่ศิลา บล็อก 1–6 ตามตัวอักษร | ✅ พี่ศิลาส่งแล้ว |
| 2 | `002_block9_columns.sql` | คอลัมน์เพิ่ม (games.code/team_size · teams.short_name/logo_url · matches.next_match_slot/loser_next_*/game_scores + FK) | QA บล็อก 9 | ⏳ รอพี่ศิลายืนยัน |
| 3 | `003_rls_by_role.sql` | ฟังก์ชัน `current_staff_role()` + RLS ตามบทบาท | QA บล็อก 7 ฉบับแก้ | ⏳ รอพี่ศิลายืนยัน |
| 4 | `004_realtime.sql` | เพิ่ม matches/stations/teams/sponsors เข้า publication | QA บล็อก 8 ฉบับแก้ | ⏳ รอพี่ศิลายืนยัน |
| 5 | `005_block10_profiles_storage_DRAFT.sql` | categories.code · teams.team_code/photo_url · players.order_in_team/position/quote/hide_real_name/person_key · matches.stage/round_no/group_name/sort_order · ตาราง `athlete_photos` · bucket `athlete-photos` + policy | โคลท์ร่างจากที่โค้ด K-S4 ใช้ (ซอง 004) | 📝 DRAFT รอพี่ศิลา |
| 6 | `006_event_config.sql` | ตาราง `category_settings` (รูปแบบแข่งต่อประเภท) · `event_config` (วันแข่ง/ประกาศ/ธีม) | โคลท์ร่าง | 📝 DRAFT รอพี่ศิลา |

## หลังรันครบ
1. **Authentication → Providers → Email:** ปิด "Allow new users to sign up" (บัญชีสตาฟพี่หยัดสร้างเองใน Authentication → Users)
2. สร้างบัญชีสตาฟ แล้วเพิ่มแถวใน `staff_profiles` (`id` = uuid ของ user · `email` · `role` = `admin` / `result_staff` / `stream_operator`)
3. ใส่ค่าใน `.env.local` ของเว็บ (ชื่อตัวแปรดู `.env.example`): `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `CHANNEL_KEY` · `SUPABASE_SERVICE_ROLE_KEY` (ใช้เฉพาะเซ็น URL รูปใน bucket private) → เว็บจะสลับจาก mock เป็น Supabase อัตโนมัติ
4. นำเข้ารายชื่อ: ล็อกอิน admin → `/admin/import` วางข้อความไฟล์ ROSTER (ต้องสร้าง `games` 3 แถวก่อน: ดู `007_seed_games.sql`)
5. ตรวจว่าตาราง `matches` อยู่ใน Realtime: Database → Replication → `supabase_realtime`

## หมายเหตุความปลอดภัย (จาก QA ส่วนที่ 3)
* ช่อง Broadcast เปิดสาธารณะ — โค้ดใช้ชื่อช่องที่มี `CHANNEL_KEY` (รหัสลับต่องาน) · Private Channel ไว้รอบ 2
* `updated_at` ไม่มี trigger — โค้ดเขียนค่าเองตอนแก้ผล
* ห้ามเก็บ เลขบัตร · วันเกิด · เบอร์ · โรงเรียน ของนักกีฬา (ผู้เยาว์)
