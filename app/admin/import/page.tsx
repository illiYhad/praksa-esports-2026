import { AdminNav } from "@/components/admin/AdminNav";
import { ImportClient } from "@/components/admin/ImportClient";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">นำเข้ารายชื่อ</h1>
      <ImportClient />
    </div>
  );
}
