import { redirect } from "next/navigation";
import { data } from "@/lib/data";
import { getStaff, mockBlocked, BLOCKED_MESSAGE } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { StreamHubClient } from "@/components/studio/StreamHubClient";

export const dynamic = "force-dynamic";

// ห้องคุม = admin / stream_operator เท่านั้น · ส่ง CHANNEL_KEY ให้ client เฉพาะเมื่อผ่านล็อกอินแล้ว (proxy.ts กั้นอีกชั้น)
export default async function StreamHubPage() {
  if (mockBlocked) return <p className="text-live">{BLOCKED_MESSAGE}</p>;
  if (hasSupabaseEnv) {
    const staff = await getStaff();
    if (!staff) redirect("/login?next=/stream-hub");
    if (staff.role !== "admin" && staff.role !== "stream_operator") redirect("/login?denied=/stream-hub");
  }
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
