import Link from "next/link";
import { notFound } from "next/navigation";
import { data } from "@/lib/data";
import { DrawReveal } from "@/components/admin/DrawReveal";

export const dynamic = "force-dynamic";

export default async function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = (await data.getCategories()).find((c) => c.id === id);
  if (!category) notFound();
  const [teams, settings] = await Promise.all([data.getTeams(category.game_id), data.getCategorySettings()]);
  const setting = settings.find((s) => s.category_id === category.id);
  const names = (setting?.seed_order ?? []).map((tid) => teams.find((t) => t.id === tid)?.name).filter((x): x is string => !!x);
  if (!names.length) {
    return (
      <p className="text-sm">
        ยังไม่ได้จับสลากประเภทนี้ — <Link href={`/admin/categories/${category.id}`} className="text-accent">กลับไปจับสลาก</Link>
      </p>
    );
  }
  return <DrawReveal title={category.name} names={names} backHref={`/admin/categories/${category.id}`} />;
}
