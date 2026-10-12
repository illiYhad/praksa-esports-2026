# กระสาเกมส์ 2569 · อีสปอร์ต — web

Next.js (App Router) + TypeScript + Tailwind v4. ชั้นข้อมูลเป็น interface (`lib/data/source.ts`) · ตอนนี้ใช้ mock ในหน่วยความจำ (`lib/data/mock.ts`) seed จาก `data/roster.seed.txt` (รายชื่อจริง อยู่นอก git — ไม่มีไฟล์จะใช้ seed ทดสอบ · บังคับใช้ seed ทดสอบด้วย `PRAKSA_SEED=test`)

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
