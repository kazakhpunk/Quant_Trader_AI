"use client";
import { ReactNode } from "react";
import { VISIBLE_DIMENSIONS } from "@/lib/api/ratings";

const ITEMS = ["composite", ...VISIBLE_DIMENSIONS] as const;

export function StickySubnav({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <nav className="sticky top-0 z-30 -mx-4 mb-2 mt-2 flex h-14 items-center gap-4 px-4 md:-mx-8 md:px-8">
      {left && <div className="shrink-0">{left}</div>}
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
        {ITEMS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className="shrink-0 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition hover:text-foreground"
          >
            {id}
          </a>
        ))}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </nav>
  );
}
