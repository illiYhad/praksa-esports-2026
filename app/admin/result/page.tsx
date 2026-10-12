import { data } from "@/lib/data";
import { nameOf, statusLabel } from "@/lib/view";

export default async function ResultPage() {
  const [matches, participants, games] = await Promise.all([
    data.getMatches(),
    data.getParticipants(),
    data.getGames(),
  ]);
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">กรอกผล</h1>
      <p className="mb-3 text-sm text-muted">โครงเท่านั้น — ฟอร์มกรอกผลและปุ่มรับรองจะเพิ่มภายหลัง</p>
      <ul className="space-y-2">
        {matches.map((m) => (
          <li key={m.id} className="rounded bg-surface p-2 text-sm">
            [{games.find((g) => g.id === m.game_id)?.code}] {m.round_label}: {nameOf(participants, m.a_id)} {m.a_series}-
            {m.b_series} {nameOf(participants, m.b_id)} · {statusLabel[m.status]}
          </li>
        ))}
      </ul>
    </div>
  );
}
