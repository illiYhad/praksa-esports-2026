# Praksa Esports 2026 — web

Next.js (App Router) + TypeScript + Tailwind v4. ตอนนี้ใช้ข้อมูลจำลอง (`lib/data/mock.ts`) — ยังไม่ต่อ Supabase

## รัน
```
npm install
cp .env.example .env.local   # ว่างไว้ได้ ระบบ realtime จะ no-op
npm run dev                  # http://localhost:3100
npm run build
```
พอร์ตใช้ **3100** (ห้ามใช้ 3000 · 3001 · 3999 · 60)

## หน้า
`/` · `/bracket/[game]` · `/display/[game]` · `/admin` · `/admin/result` · `/checkin` · `/stream-hub` · `/overlay/[game]/[matchId]`
รหัสเกมจำลอง: `rov` `sf6` `efootball`
