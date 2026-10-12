import { data } from "@/lib/data";

export default async function CheckinPage() {
  const [games, participants] = await Promise.all([data.getGames(), data.getParticipants()]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">เช็กอิน</h1>
      {games.map((g) => (
        <section key={g.id}>
          <h2 className="font-bold text-accent-2">{g.name}</h2>
          <ul className="text-sm">
            {participants.filter((p) => p.game_id === g.id).map((p) => (
              <li key={p.id}>{p.checked_in ? "✅" : "⬜"} {p.name}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
