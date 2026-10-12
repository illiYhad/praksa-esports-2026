import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { EventSettingsClient } from "@/components/admin/EventSettingsClient";
import { EVENT } from "@/lib/event";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await data.getEventConfig();
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ตั้งค่างาน</h1>
      <div className="rounded bg-surface/60 p-3 text-sm text-muted">
        <div>{EVENT.titleLine1}</div>
        <div className="font-bold text-text">{EVENT.titleLine2}</div>
        <div>จัดโดย {EVENT.organizer} · ระบบโดย {EVENT.provider} · ชื่อสั้น: {EVENT.shortTitle}</div>
        <div className="text-xs">(ชื่องานกำหนดใน lib/event.ts — แก้ที่โค้ด)</div>
      </div>
      <EventSettingsClient config={config} />
    </div>
  );
}
