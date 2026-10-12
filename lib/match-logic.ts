import type { GameScore } from "@/lib/types";

// กติกาผลแมตช์ — ใช้ร่วมกันทั้ง mock และ Supabase (K-S4) เพื่อให้ผลตรงกัน

/** จำนวนเกมที่ต้องชนะเพื่อปิดซีรีส์ */
export const winsNeeded = (bestOf: number) => Math.ceil(bestOf / 2);

/** eFootball BO1: ใช้ประตูเป็นสกอร์ซีรีส์ตรง ๆ */
export const usesGoalsDirect = (gameCode: string, bestOf: number) => gameCode === "efootball" && bestOf === 1;

export function seriesFromGames(games: GameScore[], goalsDirect: boolean): { a: number; b: number } {
  if (goalsDirect) return { a: games[0]?.a ?? 0, b: games[0]?.b ?? 0 };
  return {
    a: games.filter((g) => g.a > g.b).length,
    b: games.filter((g) => g.b > g.a).length,
  };
}

/** ตรวจสกอร์ระหว่างแข่ง (ยังไม่ต้องจบซีรีส์) — คืนข้อความไทยถ้าผิด */
export function checkProgress(games: GameScore[], bestOf: number, goalsDirect: boolean): string | null {
  if (games.some((g) => !Number.isInteger(g.a) || !Number.isInteger(g.b) || g.a < 0 || g.b < 0)) return "สกอร์ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป";
  if (games.length > bestOf) return `เกินจำนวนเกมของ BO${bestOf}`;
  if (goalsDirect) return null;
  const s = seriesFromGames(games, false);
  const need = winsNeeded(bestOf);
  if (s.a > need || s.b > need) return `ซีรีส์ BO${bestOf} ชนะได้สูงสุด ${need} เกม`;
  return null;
}

/** ตรวจว่าซีรีส์จบสมบูรณ์ ไม่เสมอ — คืนข้อความไทยถ้ายังไม่ได้ */
export function checkFinished(games: GameScore[], bestOf: number, goalsDirect: boolean): string | null {
  const bad = checkProgress(games, bestOf, goalsDirect);
  if (bad) return bad;
  if (games.some((g) => g.a === g.b)) return "มีเกมที่เสมอกัน — แข่งแบบแพ้คัดออก ต้องมีผู้ชนะทุกเกม";
  const s = seriesFromGames(games, goalsDirect);
  if (goalsDirect) return s.a === s.b ? "ซีรีส์เสมอกันไม่ได้" : null;
  if (Math.max(s.a, s.b) < winsNeeded(bestOf)) return `ยังไม่จบซีรีส์ BO${bestOf} (ต้องชนะ ${winsNeeded(bestOf)} เกม)`;
  return null;
}
