"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Gauge,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

const PILLARS = [
  {
    n: "01",
    kicker: "Dashboard",
    title: "Read the picks at a glance",
    body:
      "Every ticker carries a composite score (0–100) made of five equally-weighted dimensions: technical, fundamental, sentiment, price-action, volatility. Hover the score to see the breakdown.",
    bullets: [
      { k: "Click", v: "any row → opens the order drawer for that ticker" },
      { k: "Open", v: "View full ratings → 5 dimension tables stacked" },
    ],
    icon: Gauge,
  },
  {
    n: "02",
    kicker: "Trade engine",
    title: "Let the engine deploy capital — on your terms",
    body:
      "A guided 4-step flow: Configure → Preview → Execute → Result. Nothing fires until you confirm. Caps protect your account; bracket orders attach stop-loss + take-profit per position.",
    bullets: [
      { k: "Step 1", v: "set amount, max position size %, max positions, stop/target %" },
      { k: "Step 2", v: "preview the exact orders the engine will place" },
      { k: "Step 3", v: "place — paper or live, your choice" },
    ],
    icon: Sparkles,
  },
  {
    n: "03",
    kicker: "Single-name orders",
    title: "Trade a specific stock yourself",
    body:
      "From any chart or dashboard row, the order drawer slides in. Switch shares ↔ dollars, market or limit, day or GTC, paper or live. Optional risk controls attach a bracket.",
    bullets: [
      { k: "Risk", v: "stop-loss % and take-profit % collapse open in the drawer" },
      { k: "Paper", v: "toggle persists across sessions in localStorage" },
    ],
    icon: Target,
  },
];

const SIGNALS = [
  { icon: LineChart, label: "Technical", note: "RSI · trend · momentum" },
  { icon: ShieldCheck, label: "Fundamental", note: "P/E · margin · growth" },
  { icon: Sparkles, label: "Sentiment", note: "news + social pulse" },
];

export default function Guide({ isOpen }: { isOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const isCollapsed = isOpen === false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider disableHoverableContent>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full gap-3 font-medium",
                  isCollapsed ? "justify-center" : "justify-start"
                )}
              >
                <BookOpen className="h-4 w-4" />
                {!isCollapsed && (
                  <>
                    <span>How to use</span>
                    <span className="ml-auto font-mono text-[10px] tracking-widest text-muted-foreground">
                      v1
                    </span>
                  </>
                )}
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          {isCollapsed && <TooltipContent side="right">How to use</TooltipContent>}
        </Tooltip>
      </TooltipProvider>

      <DialogContent
        className="max-w-3xl overflow-hidden border-border/60 p-0 sm:rounded-xl"
      >
        <DialogTitle className="sr-only">How to use Quant Trader AI</DialogTitle>

        {/* HEADER — masthead style */}
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
          <div className="relative flex items-baseline justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Field guide · §00
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })}
            </p>
          </div>
          <h2 className="relative mt-3 text-3xl font-semibold tracking-tight md:text-[2.5rem] md:leading-[1.05]">
            How to use the platform.
          </h2>
          <p className="relative mt-2 max-w-xl text-sm text-muted-foreground">
            A 60-second tour of the three things that matter:
            <span className="ml-1 text-foreground">picks, the engine, and orders.</span>
          </p>

          {/* signal strip */}
          <div className="relative mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-border/40 pt-4">
            {SIGNALS.map(({ icon: Icon, label, note }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-foreground">
                  {label}
                </span>
                <span className="text-[11px] text-muted-foreground">{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BODY — pillars */}
        <div className="max-h-[60vh] overflow-y-auto px-8 py-7">
          <ol className="space-y-7">
            {PILLARS.map((p) => (
              <li
                key={p.n}
                className="group relative grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-l border-border/50 pl-6 transition-colors hover:border-foreground/40"
              >
                {/* ghost numeral */}
                <span
                  className="font-mono text-3xl font-light leading-none text-muted-foreground/40 tabular-nums transition-colors group-hover:text-foreground/60 md:text-4xl"
                  aria-hidden
                >
                  {p.n}
                </span>

                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {p.kicker}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {p.body}
                  </p>

                  <ul className="mt-3 space-y-1.5">
                    {p.bullets.map((b) => (
                      <li
                        key={b.k}
                        className="flex items-baseline gap-3 text-sm"
                      >
                        <span className="w-14 shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                          {b.k}
                        </span>
                        <span className="text-foreground/85">{b.v}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* trailing icon as a quiet anchor */}
                <p.icon
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-1 h-5 w-5 text-muted-foreground/30 transition-colors group-hover:text-foreground/60"
                />
              </li>
            ))}
          </ol>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-4 border-t border-border/60 bg-muted/20 px-8 py-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Tip · keep paper-trading on until you trust the picks
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
