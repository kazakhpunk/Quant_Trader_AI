"use client";
import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { getRatings, RatingRow, VISIBLE_DIMENSIONS, Direction } from "@/lib/api/ratings";
import { CompositeTable } from "./composite-table";
import { DimensionTable } from "./dimension-table";
import { StickySubnav } from "./sticky-subnav";
import { MethodologyDialog } from "./methodology-dialog";
import { DirectionToggle } from "./direction-toggle";
import { OrderDrawer } from "@/components/v4/order-drawer/order-drawer";

// Map the row's directional scores into the legacy `composite`/`scores` fields
// so children (CompositeTable, DimensionTable, etc.) stay direction-agnostic.
function projectRows(rows: RatingRow[], direction: Direction): RatingRow[] {
  return rows
    .map((r) => ({
      ...r,
      composite: direction === "long" ? r.compositeLong : r.compositeShort,
      scores:    direction === "long" ? r.scoresLong    : r.scoresShort,
    }))
    .sort((a, b) => b.composite - a.composite);
}

export function RatingsPage() {
  const [rows, setRows] = useState<RatingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("long");

  useEffect(() => {
    let alive = true;
    getRatings()
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  const projected = useMemo(
    () => (rows ? projectRows(rows, direction) : null),
    [rows, direction]
  );

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-sm text-rose-600">Failed to load ratings: {error}</p>
        <button className="mt-4 text-sm underline" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  }
  if (!projected) {
    return <div className="flex h-[50vh] items-center justify-center"><CircularProgress /></div>;
  }
  if (projected.length === 0) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">No ratings yet</h2>
        <p className="mt-3 text-muted-foreground">
          Run the analysis service to populate ratings.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 pb-3">
        <DirectionToggle value={direction} onChange={setDirection} />
        <MethodologyDialog />
      </div>
      <StickySubnav />
      <div className="space-y-12">
        <section id="composite" className="scroll-mt-20 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Composite · {direction === "long" ? "long" : "short"}
          </h2>
          <CompositeTable rows={projected} direction={direction} />
        </section>
        {VISIBLE_DIMENSIONS.map((d) => (
          <DimensionTable key={d} dimension={d} rows={projected} />
        ))}
      </div>
      <OrderDrawer />
    </div>
  );
}
