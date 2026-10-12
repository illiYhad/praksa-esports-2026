import React from "react";
import Link from "next/link";
import type { Player } from "@/lib/types";
import { athleteName, secondaryName } from "@/lib/people";
import { Avatar } from "./Avatar";

export function AthleteCard({ player, photo, team, category, position }: { player: Player; photo?: string; team?: string; category?: string; position?: string }) {
  const name = athleteName(player);
  const sub = secondaryName(player);
  return (
    <Link href={`/athletes/${player.id}`} className="flex flex-col gap-2 rounded-xl bg-surface p-3 hover:ring-1 hover:ring-accent">
      <Avatar src={photo} name={player.real_name ?? name} size="fill" className="aspect-[4/5] w-full" mark={18} />
      <div className="min-w-0">
        <div className="truncate text-lg font-black">{name}{player.is_captain && <span className="ml-1 rounded bg-accent px-1 text-[10px] text-black align-middle">C</span>}</div>
        {sub && <div className="truncate text-xs text-muted">{sub}</div>}
        <div className="truncate text-xs text-muted">{[team, category].filter(Boolean).join(" · ")}</div>
        {position && <div className="truncate text-xs text-accent-2">{position}</div>}
      </div>
    </Link>
  );
}
