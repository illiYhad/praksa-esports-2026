import { data } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (kind !== "original" && kind !== "cutout") return new Response("not found", { status: 404 });
  const f = await data.getPhotoFile(id, kind);
  if (!f) return new Response("not found", { status: 404 });
  if ("redirect" in f) return Response.redirect(f.redirect, 302);
  const ab = f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength) as ArrayBuffer;
  // URL มี ?v= เปลี่ยนทุกครั้งที่บันทึกใหม่ จึง cache ยาวได้
  return new Response(ab, { headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=31536000, immutable" } });
}
