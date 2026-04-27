"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, ArrowRight, X } from "lucide-react";
import {
  RatingRow,
  VISIBLE_DIMENSIONS,
  COMPOSITE_DIMENSIONS,
  Dimension,
} from "@/lib/api/ratings";
import { cn } from "@/lib/utils";

const COMPOSITE_SET = new Set<Dimension>(COMPOSITE_DIMENSIONS);

type Section = "composite" | Dimension;

type Occurrence = {
  section: Section;
  label: string;
  score: number;
  informational: boolean;
};

type Hit = {
  ticker: string;
  composite: number;
  occurrences: Occurrence[];
};

type PendingJump = {
  ticker: string;
  section: Section;
};

function buildHits(rows: RatingRow[], q: string): Hit[] {
  const norm = q.trim().toUpperCase();
  if (!norm) return [];
  const matches = rows.filter((r) => r.ticker.toUpperCase().includes(norm));
  return matches.slice(0, 8).map((r) => ({
    ticker: r.ticker,
    composite: r.composite,
    occurrences: [
      {
        section: "composite" as const,
        label: "Composite",
        score: r.composite,
        informational: false,
      },
      ...VISIBLE_DIMENSIONS.map((d) => ({
        section: d,
        label: d.charAt(0).toUpperCase() + d.slice(1),
        score: Math.round(r.scores[d]),
        informational: !COMPOSITE_SET.has(d),
      })),
    ],
  }));
}

const scoreColor = (n: number) =>
  n >= 75 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-rose-600";

export function TickerSearch({ rows }: { rows: RatingRow[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingJumpRef = useRef<PendingJump | null>(null);

  const hits = useMemo(() => buildHits(rows, q), [rows, q]);
  const flatOptions = useMemo(
    () => hits.flatMap((h) => h.occurrences.map((occ) => ({ hit: h, occ }))),
    [hits],
  );

  useEffect(() => {
    setActive(0);
  }, [q]);

  // ⌘K / Ctrl-K toggles the popover from anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const scrollToTicker = ({ ticker, section }: PendingJump) => {
    // Compute an absolute scroll position and drive the document scroll
    // directly. scrollIntoView() is unreliable across the sticky subnav +
    // overflow-hidden table wrapper combo — it sometimes lands at the
    // section header or no-ops entirely.
    const STICKY_OFFSET = 96; // sticky subnav (~56px) + page padding
    const row = document.getElementById(`row-${section}-${ticker}`);
    const fallback = document.getElementById(section);
    const target = row ?? fallback;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const docTop = window.scrollY + rect.top;
    // Center the row in the visible region below the sticky nav. If the
    // target is the section header (no row found), park it just below the
    // sticky nav instead of centering.
    const top = row
      ? docTop - (window.innerHeight - rect.height) / 2
      : docTop - STICKY_OFFSET;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    window.dispatchEvent(
      new CustomEvent("ratings:highlight", {
        detail: { ticker, section },
      }),
    );
  };

  const jump = (ticker: string, section: Section) => {
    pendingJumpRef.current = { ticker, section };
    setOpen(false);
    setQ("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (!flatOptions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % flatOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + flatOptions.length) % flatOptions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = flatOptions[active];
      if (o) jump(o.hit.ticker, o.occ.section);
    }
  };

  // Running counter so each occurrence button knows its flat-list index for
  // keyboard-navigation highlighting.
  let runningIdx = 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Find ticker"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[11px] font-medium uppercase tracking-wider text-foreground shadow-sm transition hover:bg-muted/40"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Find ticker</span>
          <kbd className="ml-1 hidden rounded border border-border/60 bg-muted/40 px-1 font-mono text-[9px] tracking-wider text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        onCloseAutoFocus={(e) => {
          const pendingJump = pendingJumpRef.current;
          if (!pendingJump) return;
          pendingJumpRef.current = null;
          e.preventDefault();
          requestAnimationFrame(() => scrollToTicker(pendingJump));
        }}
        className="w-[22rem] overflow-hidden rounded-xl border-border/60 bg-background p-0 shadow-xl"
      >
        {/* INPUT — masthead row */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type ticker symbol…"
            className="flex-1 bg-transparent font-mono text-sm tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {q ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              esc
            </span>
          )}
        </div>

        {/* RESULTS */}
        <div className="max-h-[24rem] overflow-y-auto">
          {!q.trim() ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
              Start typing to find a ticker
            </p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
              No match in current ratings
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {hits.map((h) => (
                <li key={h.ticker} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-sm font-semibold tracking-wider text-foreground">
                      {h.ticker}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-[10px] uppercase tabular-nums tracking-wider",
                        scoreColor(h.composite),
                      )}
                    >
                      composite {h.composite}
                    </span>
                  </div>
                  <ul className="mt-1.5 grid grid-cols-2 gap-1">
                    {h.occurrences.map((o) => {
                      const idx = runningIdx++;
                      const isActive = idx === active;
                      return (
                        <li key={o.section}>
                          <button
                            type="button"
                            onMouseEnter={() => setActive(idx)}
                            onClick={() => jump(h.ticker, o.section)}
                            className={cn(
                              "group flex w-full items-center justify-between rounded-md border border-transparent px-2 py-1.5 text-left transition",
                              isActive
                                ? "border-border/70 bg-muted/60"
                                : "hover:border-border/60 hover:bg-muted/40",
                            )}
                          >
                            <span className="flex items-center gap-1">
                              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                                {o.label}
                              </span>
                              {o.informational && (
                                <span
                                  aria-label="Informational dimension, not in composite"
                                  className="font-mono text-[10px] text-muted-foreground/60"
                                >
                                  †
                                </span>
                              )}
                            </span>
                            <span
                              className={cn(
                                "flex items-center font-mono text-[11px] tabular-nums",
                                o.informational
                                  ? "text-muted-foreground"
                                  : scoreColor(o.score),
                              )}
                            >
                              {o.score}
                              <ArrowRight className="ml-1 h-3 w-3 -translate-x-0.5 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-60" />
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* HINT FOOTER */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
          <span>↑↓ navigate</span>
          <span>↵ jump · esc close</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
