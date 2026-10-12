import Link from "next/link";
import { data } from "@/lib/data";
import { AdminNav } from "@/components/admin/AdminNav";
import { formatLabel, singleEntryLabel } from "@/lib/view";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const [games, categories, teams, matches, settings] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getTeams(),
    data.getMatches(),
    data.getCategorySettings(),
  ]);
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ประเภท / จัดสาย</h1>
      {games.map((g) => (
        <section key={g.id}>
          <h2 className="mb-1 font-bold text-accent-2">{g.name}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="py-1 text-left">ประเภท</th>
                  <th className="text-center">ทีม</th>
                  <th className="text-left">รูปแบบ</th>
                  <th className="text-center">แมตช์</th>
                  <th className="text-left">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {categories.filter((c) => c.game_id === g.id).map((c) => {
                  const n = teams.filter((t) => t.category_id === c.id).length;
                  const ms = matches.filter((m) => m.category_id === c.id);
                  const s = settings.find((x) => x.category_id === c.id);
                  const locked = ms.some((m) => m.status !== "scheduled" || m.game_scores.length > 0);
                  let status = ms.length ? (locked ? "🔒 ล็อก (เริ่มแข่งแล้ว)" : "จัดสายแล้ว") : "ยังไม่จัดสาย";
                  if (s && s.single_entry !== "pending") status = singleEntryLabel[s.single_entry];
                  return (
                    <tr key={c.id} className="border-t border-white/5">
                      <td className="py-1 pr-2">
                        <Link href={`/admin/categories/${c.id}`} className="text-accent">{c.name}</Link>
                      </td>
                      <td className="text-center">{n}</td>
                      <td>{s ? formatLabel[s.format] : "-"}</td>
                      <td className="text-center">{ms.length}</td>
                      <td>
                        {status}
                        {n === 1 && s?.single_entry === "pending" && (
                          <span className="ml-2 rounded bg-amber-500/20 px-1 text-xs text-amber-300">⚠ ผู้สมัคร 1 คน — เลือกวิธีจัดการ</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
