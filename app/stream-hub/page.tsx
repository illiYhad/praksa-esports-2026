import { data } from "@/lib/data";
import { StreamHubClient } from "@/components/studio/StreamHubClient";

export const dynamic = "force-dynamic";

// K-S3 ยังไม่กั้นหน้านี้ด้วยบทบาท (รอระบบล็อกอิน) — ห้องคุมเป็นเฉพาะจอถ่ายทอด ไม่ส่งอะไรไปบอร์ดสถานี
export default async function StreamHubPage() {
  const channelKey = process.env.CHANNEL_KEY;
  if (!channelKey) {
    return <p className="text-live">ยังไม่ได้ตั้งค่า CHANNEL_KEY ใน .env.local (ดู .env.example)</p>;
  }
  const [games, categories, matches, teams] = await Promise.all([
    data.getGames(),
    data.getCategories(),
    data.getMatches(),
    data.getTeams(),
  ]);
  return <StreamHubClient channelKey={channelKey} games={games} categories={categories} matches={matches} teams={teams} />;
}
