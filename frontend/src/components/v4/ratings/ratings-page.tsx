"use client";
import { useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import { getRatings, RatingRow, DIMENSIONS } from "@/lib/api/ratings";
import { CompositeTable } from "./composite-table";
import { DimensionTable } from "./dimension-table";
import { StickySubnav } from "./sticky-subnav";
import { OrderDrawer } from "@/components/v4/order-drawer/order-drawer";

export function RatingsPage() {
  const [rows, setRows] = useState<RatingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getRatings()
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

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
  if (!rows) {
    return <div className="flex h-[50vh] items-center justify-center"><CircularProgress /></div>;
  }
  if (rows.length === 0) {
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
      <StickySubnav />
      <div className="space-y-12">
        <section id="composite" className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Composite</h2>
          <CompositeTable rows={rows} />
        </section>
        {DIMENSIONS.map((d) => (
          <DimensionTable key={d} dimension={d} rows={rows} />
        ))}
      </div>
      <OrderDrawer />
    </div>
  );
}
