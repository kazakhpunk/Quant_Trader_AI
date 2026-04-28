"use client";
import { ReactNode } from "react";
import { VISIBLE_DIMENSIONS } from "@/lib/api/ratings";

const ITEMS = ["composite", ...VISIBLE_DIMENSIONS] as const;

// The page already passes `hideTitleOnScroll` to the global navbar, so the
// navbar's left side (title) is empty when this subnav is in view. We share
// the same 56px row with the navbar by:
//   1. Pinning at top-0 with z-20 (above navbar's z-10 background).
//   2. Dropping our own background so the navbar's bg-background/95 fills
//      the bar and you can still see the navbar's icons through us.
//   3. Marking the wrapper pointer-events-none so empty padding doesn't
//      block clicks targeted at navbar icons that sit visually beneath us.
//   4. Re-enabling pointer-events on each interactive child.
//   5. Reserving a fixed right gutter (≈160px) so our content never extends
//      under the navbar's ModeToggle / SignUp / UserNav cluster.
const NAVBAR_ICON_RESERVE = "w-28 md:w-40";

export function StickySubnav({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <nav
      aria-label="Ratings sections"
      className="pointer-events-none sticky top-0 z-20 -mx-4 mt-2 mb-2 flex h-14 items-center gap-4 px-4 md:-mx-8 md:px-8"
    >
      {left && <div className="pointer-events-auto shrink-0">{left}</div>}
      <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
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
      {right && <div className="pointer-events-auto shrink-0">{right}</div>}
    </nav>
  );
}
