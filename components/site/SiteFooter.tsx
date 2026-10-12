import { EVENT } from "@/lib/event";
import { BRAND, KrasaMark, Seal } from "@/components/brand/Brand";

/** ท้ายเว็บทุกหน้า: นก 32 · ตรา 48 + จัดโดย · ระบบโดย */
export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-white/10 px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 text-xs text-muted">
        <KrasaMark variant="white" size={32} />
        <div className="flex items-center gap-2">
          <Seal size={48} />
          <span>จัดโดย {BRAND.organizer}</span>
        </div>
        <span className="w-full text-center text-[11px] sm:w-auto">ระบบโดย {EVENT.provider}</span>
      </div>
    </footer>
  );
}
