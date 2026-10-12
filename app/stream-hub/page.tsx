import { data } from "@/lib/data";
import { StreamHubClient } from "@/components/studio/StreamHubClient";

export const dynamic = "force-dynamic";

// K-S3 จะกั้นหน้านี้ด้วยบทบาท stream_operator — ตอนนี้ยังไม่มีล็อกอิน
export default async function StreamHubPage() {
  const channelKey = process.env.CHANNEL_KEY;
  if (!channelKey) {
    return <p className="text-live">ยังไม่ได้ตั้งค่า CHANNEL_KEY ใน .env.local (ดู .env.example)</p>;
  }
  const [games, matches, participants] = await Promise.all([data.getGames(), data.getMatches(), data.getParticipants()]);
  return <StreamHubClient channelKey={channelKey} games={games} matches={matches} participants={participants} />;
}
