"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Info } from "lucide-react";

export type InfoSection = {
  n: string;            // numeral, e.g. "01"
  kicker: string;       // category label
  title: string;
  body: string;
  bullets?: { k: string; v: string }[];
  icon: React.ComponentType<{ className?: string }>;
};

export type InfoDialogProps = {
  trigger: string;        // e.g. "How pairs are picked"
  kicker: string;         // e.g. "Methodology · §PAIRS"
  title: string;          // e.g. "How pairs are picked."
  subtitle: string;
  formula?: { k: string; v: string }[];
  sections: InfoSection[];
  footerNote: string;
};

export function InfoDialog({
  trigger,
  kicker,
  title,
  subtitle,
  formula,
  sections,
  footerNote,
}: InfoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-[11px] font-medium uppercase tracking-wider text-foreground shadow-sm transition hover:bg-muted/40"
        >
          <Info className="h-3.5 w-3.5" />
          <span>{trigger}</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl overflow-hidden border-border/60 p-0 sm:rounded-xl">
        <DialogTitle className="sr-only">{trigger}</DialogTitle>

        {/* Masthead */}
        <div className="relative border-b border-border/60 bg-gradient-to-br from-muted/40 via-background to-background px-8 pt-8 pb-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <p className="relative font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {kicker}
          </p>
          <h2 className="relative mt-3 text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-[1.05]">
            {title}
          </h2>
          <p className="relative mt-2 max-w-xl text-sm text-muted-foreground">{subtitle}</p>

          {formula && formula.length > 0 && (
            <div className="relative mt-6 grid gap-2 border-t border-border/40 pt-4 font-mono text-[11px] text-muted-foreground sm:grid-cols-[auto_1fr] sm:gap-x-4">
              {formula.map((f) => (
                <div key={f.k} className="contents">
                  <span className="uppercase tracking-wider text-foreground">{f.k}</span>
                  <span>{f.v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="max-h-[60vh] overflow-y-auto px-8 py-7">
          <ol className="space-y-7">
            {sections.map((s) => (
              <li
                key={s.n}
                className="group relative grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-l border-border/50 pl-6 transition-colors hover:border-foreground/40"
              >
                <span
                  aria-hidden
                  className="font-mono text-3xl font-light leading-none text-muted-foreground/40 tabular-nums transition-colors group-hover:text-foreground/60 md:text-4xl"
                >
                  {s.n}
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {s.kicker}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  {s.bullets && s.bullets.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
                      {s.bullets.map((b) => (
                        <li key={b.k} className="flex items-baseline gap-3 text-sm">
                          <span className="w-28 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                            {b.k}
                          </span>
                          <span className="text-foreground/85">{b.v}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <s.icon
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-1 h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60"
                />
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/20 px-8 py-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {footerNote}
          </p>
          <Button onClick={() => setOpen(false)} className="gap-2">
            Got it
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
