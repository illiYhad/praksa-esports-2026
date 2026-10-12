// ฝั่งเบราว์เซอร์เท่านั้น — แจ้ง "ข้อมูลเปลี่ยน ให้โหลดใหม่" (ไม่มีคำสั่งควบคุม จึงไม่ต้องใช้รหัสลับ)
const NAME = "praksa-data";

export function subscribeDataChanges(onChange: () => void): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const bc = new BroadcastChannel(NAME);
  bc.onmessage = () => onChange();
  return () => bc.close();
}

/** mock เท่านั้น: เบราว์เซอร์ของสตาฟเรียกหลังบันทึกสำเร็จ เพื่อให้แท็บอื่นในเครื่องเดียวกันรีเฟรช */
export function notifyDataChanged() {
  if (typeof BroadcastChannel === "undefined") return;
  const bc = new BroadcastChannel(NAME);
  bc.postMessage("changed");
  bc.close();
}
