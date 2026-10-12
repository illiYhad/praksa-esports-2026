-- 001_schema_v1.sql
-- SCHEMA v1 ของพี่ศิลา (SCHEMA_v1_Sila_2026-10-12.md) บล็อก 1–6 ตามตัวอักษร
-- ⛔ โคลท์เขียนไฟล์นี้ให้เท่านั้น ไม่ได้รัน — พี่หยัดรันเองใน Supabase SQL Editor ทีละบล็อก
-- (บล็อก 7 RLS และบล็อก 8 Realtime ต้นฉบับ "ห้ามรัน" → ใช้ 003 และ 004 ฉบับแก้แทน)

-- บล็อก 1 — ENUM
CREATE TYPE match_status AS ENUM ('scheduled', 'ongoing', 'ended', 'certified');
CREATE TYPE staff_role AS ENUM ('admin', 'result_staff', 'stream_operator');
CREATE TYPE sponsor_level AS ENUM ('main', 'co', 'support');
CREATE TYPE sponsor_position AS ENUM ('bottom_ticker', 'corner', 'stinger', 'full_screen');
CREATE TYPE game_format AS ENUM ('team', 'solo');

-- บล็อก 2 — staff_profiles
CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role staff_role NOT NULL DEFAULT 'result_staff',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- บล็อก 3 — games · categories · stations
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    format game_format NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- บล็อก 4 — teams · players (เกมเดี่ยว = ทีม 1 คน)
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    real_name TEXT,
    in_game_name TEXT NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- บล็อก 5 — matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
    round_name TEXT NOT NULL,
    best_of INTEGER DEFAULT 1,
    status match_status DEFAULT 'scheduled',
    scheduled_time TIMESTAMPTZ,
    team_a_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team_b_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    team_a_score INTEGER DEFAULT 0,
    team_b_score INTEGER DEFAULT 0,
    winner_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    next_match_id UUID,
    reported_by UUID REFERENCES staff_profiles(id),
    certified_by UUID REFERENCES staff_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- บล็อก 6 — match_audit_logs · sponsors
CREATE TABLE match_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff_profiles(id),
    action_details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    level sponsor_level NOT NULL,
    position sponsor_position NOT NULL,
    sequence INTEGER DEFAULT 0,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
