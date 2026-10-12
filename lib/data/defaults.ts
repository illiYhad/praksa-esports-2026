import type {
  AthletePhoto,
  Category,
  CategorySetting,
  EventConfig,
  Game,
  Match,
  MatchAuditLog,
  Player,
  Sponsor,
  Station,
  Team,
} from "@/lib/types";
import { EVENT } from "@/lib/event";

export type PhotoFiles = { original: Uint8Array; originalMime: string; cutout: Uint8Array };

export type Store = {
  games: Game[];
  categories: Category[];
  teams: Team[];
  players: Player[];
  stations: Station[];
  matches: Match[];
  sponsors: Sponsor[];
  audit: MatchAuditLog[];
  settings: CategorySetting[];
  eventConfig: EventConfig;
  photos: AthletePhoto[];
  /** ไฟล์รูปในหน่วยความจำ (mock) key = photo id */
  photoFiles: Map<string, PhotoFiles>;
};

/** วันแข่ง 1–4 ตั้งต้นจาก lib/event.ts (แอดมินแก้ได้ในตั้งค่างาน) */
export function defaultEventConfig(): EventConfig {
  return { days: [...EVENT.days], announcement: "", updated_at: "" };
}

export const emptyStore = (): Store => ({
  games: [],
  categories: [],
  teams: [],
  players: [],
  stations: [],
  matches: [],
  sponsors: [],
  audit: [],
  settings: [],
  eventConfig: defaultEventConfig(),
  photos: [],
  photoFiles: new Map(),
});
