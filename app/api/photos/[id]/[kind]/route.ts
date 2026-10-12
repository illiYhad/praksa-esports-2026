import { data } from "@/lib/data";
import { getStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";
const SAFE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// รูปที่ยังไม่ติ๊กยินยอม ดูได้เฉพาะสตาฟถ่ายรูป (admin / result_staff) — สาธารณะเห็นเฉพาะ consent = true
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (kind !== "original" && kind !== "cutout") return new Response("not found", { status: 404 });
  const photo = (await data.getPhotos()).find((p) => p.id === id);
  if (!photo) return new Response("not found", { status: 404 });
  if (!photo.consent) {
    const staff = await getStaff();
    if (!staff || (staff.role !== "admin" && staff.role !== "result_staff")) return new Response("not found", { status: 404 });
  }
  const f = await data.getPhotoFile(id, kind);
  if (!f) return new Response("not found", { status: 404 });
  if ("redirect" in f) return Response.redirect(f.redirect, 302);
  const ab = f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength) as ArrayBuffer;
  const mime = SAFE_MIME.has(f.mime) ? f.mime : "application/octet-stream";
  // URL มี ?v= เปลี่ยนทุกครั้งที่บันทึกใหม่ จึง cache ได้ (private เพราะขึ้นกับสิทธิ์)
  return new Response(ab, {
    headers: {
      "Content-Type": mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": photo.consent ? "public, max-age=31536000, immutable" : "private, no-store",
    },
  });
}
