import { data } from "@/lib/data";
import { categoryOverlaps, waitingNotes } from "@/lib/data/queue";
import { AdminNav } from "@/components/admin/AdminNav";
import { ScheduleClient } from "@/components/admin/ScheduleClient";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const [games, categories, stations, matches, teams, players] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getStations(),
    data.getMatches(),
    data.getTeams(),
    data.getPlayers(),
  ]);
  // คำนวณฝั่ง server — ส่งไปหน้าเว็บแค่จำนวน/ป้ายแมตช์ ไม่ส่งรายชื่อนักกีฬา
  const q = { categories, teams, players, matches };
  return (
    <div className="space-y-4">
      <AdminNav />
      <h1 className="text-xl font-bold">ตาราง / สถานี</h1>
      <ScheduleClient games={games} categories={categories} stations={stations} matches={matches} teams={teams} overlaps={categoryOverlaps(q)} waitNotes={waitingNotes(q)} />
    </div>
  );
}
