import { mockSource } from "./mock";
import type { DataSource } from "./source";

// ตอนนี้ = mock · เปลี่ยนเป็น Supabase ทีหลังโดยไม่แก้หน้า
export const data: DataSource = mockSource;
export type { DataSource };
