import React from "react";
import { PrintToolbar } from "@/components/print/PrintToolbar";

// หน้าพิมพ์ทั้งหมด: กระดาษขาว ตัวหนังสือดำ ซ่อนหัว/ท้ายเว็บ · เฟส F จะกั้นเฉพาะ admin
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        body > header, body > footer { display: none !important; }
        main { max-width: none !important; padding: 0 !important; margin: 0 !important; }
        body { background: #e5e7eb; }
        @page { size: A4; margin: 12mm; }
        @media print { body { background: #fff; } .sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; } .page-break { break-after: page; } }
      `}</style>
      <PrintToolbar />
      <div className="print-root text-black">{children}</div>
    </>
  );
}
