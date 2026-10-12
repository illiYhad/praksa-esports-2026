// ตัวช่วยสำหรับ server action: แปลง Error ข้อความไทยจาก DataSource เป็นผลลัพธ์ที่หน้าเว็บแสดงได้
export type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}
