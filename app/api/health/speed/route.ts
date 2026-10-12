// ตอบ payload ขนาด kb ที่ขอ (สูงสุด 512) ให้ NetworkStat วัด ping/ความเร็ว
export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const kb = Math.min(512, Math.max(0, Number(new URL(req.url).searchParams.get("kb")) || 0));
  return new Response(new Uint8Array(kb * 1024), {
    headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" },
  });
}
