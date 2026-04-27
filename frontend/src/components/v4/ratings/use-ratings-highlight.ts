"use client";
import { useEffect, useState } from "react";
import { Dimension } from "@/lib/api/ratings";

type Section = "composite" | Dimension;

/** Listen for `ratings:highlight` events emitted by TickerSearch and expose
 *  the ticker that should briefly pulse inside this section. The pulse class
 *  is auto-cleared after the animation duration so the row returns to its
 *  resting state. */
export function useRatingsHighlight(section: Section): string | null {
  const [ticker, setTicker] = useState<string | null>(null);

  useEffect(() => {
    const onJump = (e: Event) => {
      const ce = e as CustomEvent<{ ticker: string; section: Section }>;
      if (ce.detail.section !== section) return;
      setTicker(ce.detail.ticker);
    };
    window.addEventListener("ratings:highlight", onJump);
    return () => window.removeEventListener("ratings:highlight", onJump);
  }, [section]);

  useEffect(() => {
    if (!ticker) return;
    const t = setTimeout(() => setTicker(null), 1700);
    return () => clearTimeout(t);
  }, [ticker]);

  return ticker;
}
