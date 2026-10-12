// ตัดฉากกรีนสกรีนในเบราว์เซอร์ (pure · ทำงานบน ImageData)
export type ChromaOptions = {
  /** สีฉากหลัง (องศา 0–360) ค่าตั้งต้น 120 = เขียว */
  hue: number;
  /** ความแรง = ช่วงองศาที่ถือว่าเป็นฉาก (0–90) */
  tolerance: number;
  /** ขอบนุ่ม = ช่วงองศาที่ค่อย ๆ จาง (0–60) */
  softness: number;
  /** ความอิ่มสีขั้นต่ำที่นับเป็นฉาก (0–1) กันเงา/เทา/ผิวหลุด */
  minSaturation: number;
  /** ความสว่างขั้นต่ำ (0–1) */
  minValue: number;
  /** ลดสีเขียวที่สะท้อนบนขอบตัว */
  spill: boolean;
};

export const DEFAULT_CHROMA: ChromaOptions = { hue: 120, tolerance: 28, softness: 18, minSaturation: 0.3, minValue: 0.2, spill: true };

function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

/** คืน ImageData ใหม่ที่ฉากหลังโปร่งใส */
export function chromaKey(src: ImageData, o: ChromaOptions): ImageData {
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const [h, s, v] = hsv(r, g, b);
    if (s < o.minSaturation || v < o.minValue) continue;
    let dist = Math.abs(h - o.hue);
    if (dist > 180) dist = 360 - dist;
    let alpha = 1;
    if (dist <= o.tolerance) alpha = 0;
    else if (dist <= o.tolerance + o.softness) alpha = (dist - o.tolerance) / o.softness;
    // ค่อย ๆ จางตามความอิ่มสี (ขอบผม/ขอบตัวที่สีจางกว่าฉาก)
    const satFade = Math.min(1, (s - o.minSaturation) / 0.25);
    alpha = 1 - (1 - alpha) * satFade;
    if (alpha < 1) {
      d[i + 3] = Math.round(d[i + 3] * alpha);
      if (o.spill) {
        // ตัดเขียวที่เกินค่าเฉลี่ยของแดง/น้ำเงิน
        const cap = Math.max(r, b);
        if (g > cap) d[i + 1] = cap;
      }
    } else if (o.spill && dist <= o.tolerance + o.softness * 2) {
      const cap = Math.max(r, b);
      if (g > cap) d[i + 1] = Math.round((g + cap) / 2);
    }
  }
  return out;
}

/** ย่อรูปให้ด้านยาวไม่เกิน max (คืน canvas ใหม่) */
export function fitCanvas(img: CanvasImageSource & { width: number; height: number }, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}
