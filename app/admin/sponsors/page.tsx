import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { SponsorsClient } from "@/components/admin/SponsorsClient";

export const dynamic = "force-dynamic";

export default async function SponsorsPage() {
  const sponsors = await data.getSponsors();
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">สปอนเซอร์</h1>
      <SponsorsClient sponsors={sponsors} />
    </div>
  );
}
