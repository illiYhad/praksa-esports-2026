import { data } from "@/lib/data";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// รับรูปจากหน้าถ่ายรูป (data URL 2 รูป) — ใช้ route handler แทน server action เพราะไฟล์ใหญ่กว่า 1 MB ได้
// ตรวจบทบาท admin / result_staff ฝั่ง server (proxy.ts กั้นอีกชั้น)
type Body = { person_key?: string; original?: string; cutout?: string; consent?: boolean };

function parseDataUrl(s: string | undefined, what: string): { mime: string; bytes: Uint8Array } {
  const m = /^data:([^;,]+);base64,([\s\S]+)$/.exec(s ?? "");
  if (!m) throw new Error(`รูปแบบ${what}ไม่ถูกต้อง`);
  const bytes = new Uint8Array(Buffer.from(m[2], "base64"));
  if (bytes.length > 6_000_000) throw new Error(`${what}ใหญ่เกิน 6 MB`);
  return { mime: m[1], bytes };
}

export async function POST(req: Request) {
  try {
    await requireRole("admin", "result_staff");
    const body = (await req.json()) as Body;
    if (!body.person_key) throw new Error("ไม่ระบุนักกีฬา");
    const original = parseDataUrl(body.original, "รูปต้นฉบับ");
    const cutout = parseDataUrl(body.cutout, "รูปตัดพื้น");
    const photo = await data.savePhoto(body.person_key, {
      original: original.bytes,
      originalMime: original.mime,
      cutout: cutout.bytes,
      consent: !!body.consent,
    });
    return Response.json({ ok: true, photo });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "บันทึกรูปไม่สำเร็จ" }, { status: 400 });
  }
}
