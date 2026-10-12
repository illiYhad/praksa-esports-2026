import Link from "next/link";
import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [games, teams, matches, sponsors, categories] = await Promise.all([
    data.getGames(),
    data.getTeams(),
    data.getMatches(),
    data.getSponsors(),
    data.getCategories(),
  ]);
  const inGame = (categoryId: string, gameId: string) => categories.find((c) => c.id === categoryId)?.game_id === gameId;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">จัดการ</h1>
      <div className="flex gap-4 text-accent">
        <Link href="/admin/result">กรอกผล →</Link>
        <Link href="/checkin">เช็กอิน →</Link>
      </div>
      <ul className="space-y-1 text-sm">
        {games.map((g) => (
          <li key={g.id}>
            {g.name} ({g.format}, {g.team_size}) — ผู้เข้าแข่ง {teams.filter((t) => inGame(t.category_id, g.id)).length} · แมตช์{" "}
            {matches.filter((m) => inGame(m.category_id, g.id)).length}
          </li>
        ))}
      </ul>
      <h2 className="font-bold text-accent-2">สปอนเซอร์</h2>
      <ul className="text-sm">
        {sponsors.map((s) => (
          <li key={s.id}>{s.name} · {s.level} · {s.position} · ลำดับ {s.sequence}</li>
        ))}
      </ul>
    </div>
  );
}
