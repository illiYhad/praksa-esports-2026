import Link from "next/link";
import { data } from "@/lib/data";

export default async function AdminPage() {
  const [games, participants, matches, sponsors] = await Promise.all([
    data.getGames(),
    data.getParticipants(),
    data.getMatches(),
    data.getSponsors(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">จัดการ</h1>
      <Link href="/admin/result" className="text-accent">กรอกผล →</Link>
      <ul className="space-y-1 text-sm">
        {games.map((g) => (
          <li key={g.id}>
            {g.name} ({g.format}, {g.team_size}) — ผู้เข้าแข่ง {participants.filter((p) => p.game_id === g.id).length} · แมตช์{" "}
            {matches.filter((m) => m.game_id === g.id).length}
          </li>
        ))}
      </ul>
      <h2 className="font-bold text-accent-2">สปอนเซอร์</h2>
      <ul className="text-sm">
        {sponsors.map((s) => (
          <li key={s.id}>{s.name} · {s.tier} · {s.slots.join(", ")}</li>
        ))}
      </ul>
    </div>
  );
}
