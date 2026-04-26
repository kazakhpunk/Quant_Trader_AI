"use client";
import { VISIBLE_DIMENSIONS } from "@/lib/api/ratings";

const ITEMS = ["composite", ...VISIBLE_DIMENSIONS] as const;

export function StickySubnav() {
  return (
    <nav className="sticky top-0 z-10 -mx-4 mb-6 flex gap-4 overflow-x-auto border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      {ITEMS.map((id) => (
        <a key={id} href={`#${id}`} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
          {id}
        </a>
      ))}
    </nav>
  );
}
