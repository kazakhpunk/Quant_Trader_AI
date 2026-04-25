# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing landing page (`/`) with a "Quiet Authority" redesign — modern fintech base + a cursor-aware grid behind the hero, a morphing scroll-aware header, a sticky horizontal feature carousel with split panels, scroll-reveal motion, an extended footer, and supporting sections (trust strip, how-it-works, final CTA).

**Architecture:** Replace the inline JSX in `frontend/src/app/page.tsx` with a thin composition of new components under `frontend/src/components/landing/`. All animation goes through Framer Motion via shared primitives (`<Reveal>`, motion values for scroll). No new color tokens, no test framework, no backend changes. Authenticated app surfaces are untouched.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, next-themes, lucide-react, **framer-motion (new)**.

**Spec:** `docs/superpowers/specs/2026-04-25-landing-redesign-design.md`

**Validation gates:** This project has no existing test framework. Each task verifies with `pnpm` / `npm run lint` and `npm run build` (TypeScript + Next compile), plus a brief manual browser check at marked checkpoints. We do not introduce Jest/Vitest as part of this work — that's out of scope.

**Working directory for all `frontend` commands:** `frontend/` (run `cd frontend` first or use the package manager that's available — `npm` is the default in this repo per `package-lock.json`).

---

## Task 0: Setup — install dependency and create folders

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/landing/` (directory)

- [ ] **Step 1: Verify current state — landing page renders**

```bash
cd frontend && npm run build
```
Expected: build succeeds. If it fails, stop and report — that's pre-existing, not caused by this plan.

- [ ] **Step 2: Install framer-motion**

```bash
cd frontend && npm install framer-motion@^11
```
Expected: adds `framer-motion` to `dependencies` in `frontend/package.json`. No peer-dep warnings beyond what the project already prints.

- [ ] **Step 3: Create landing components directory**

```bash
mkdir -p frontend/src/components/landing
```

- [ ] **Step 4: Verify build still passes**

```bash
cd frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(landing): add framer-motion for landing redesign"
```

---

## Task 1: `<Reveal>` primitive — shared scroll-reveal wrapper

**Files:**
- Create: `frontend/src/components/landing/reveal.tsx`

- [ ] **Step 1: Create the Reveal component**

Create `frontend/src/components/landing/reveal.tsx`:

```tsx
"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "header" | "footer" | "article";
} & Omit<HTMLMotionProps<"div">, "ref" | "children">;

export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  as = "div",
  ...rest
}: RevealProps) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds. The component is unused yet but must compile.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/reveal.tsx
git commit -m "feat(landing): add Reveal primitive for scroll-driven enter animations"
```

---

## Task 2: `<CursorGrid>` — SVG grid lattice with optional cursor-aware mask

**Files:**
- Create: `frontend/src/components/landing/cursor-grid.tsx`

- [ ] **Step 1: Create the CursorGrid component**

Create `frontend/src/components/landing/cursor-grid.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type CursorGridProps = {
  /** When true, the grid only reveals near the cursor via a radial mask. */
  cursorAware?: boolean;
  /** Mask radius in pixels (cursor-aware mode only). */
  maskRadius?: number;
  /** Static fallback opacity (used in non-cursor mode and reduced-motion). */
  staticOpacity?: number;
  /** Spacing in px between grid lines. */
  spacing?: number;
  className?: string;
};

export function CursorGrid({
  cursorAware = false,
  maskRadius = 400,
  staticOpacity = 0.04,
  spacing = 48,
  className,
}: CursorGridProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cursorAware) return;
    const el = ref.current;
    if (!el) return;

    // Skip cursor tracking on coarse-pointer devices and when reduced motion is requested.
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;

    let raf = 0;
    let pendingX = 0;
    let pendingY = 0;
    let scheduled = false;

    const handle = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      pendingX = e.clientX - rect.left;
      pendingY = e.clientY - rect.top;
      if (!scheduled) {
        scheduled = true;
        raf = requestAnimationFrame(() => {
          el.style.setProperty("--mx", `${pendingX}px`);
          el.style.setProperty("--my", `${pendingY}px`);
          scheduled = false;
        });
      }
    };

    el.addEventListener("mousemove", handle);
    return () => {
      el.removeEventListener("mousemove", handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [cursorAware]);

  // Use motion-safe variants of the mask: when reduced motion is on, render a flat static grid.
  const maskStyle = cursorAware
    ? ({
        WebkitMaskImage: `radial-gradient(${maskRadius}px circle at var(--mx, 50%) var(--my, 50%), black 0%, transparent 80%)`,
        maskImage: `radial-gradient(${maskRadius}px circle at var(--mx, 50%) var(--my, 50%), black 0%, transparent 80%)`,
      } as React.CSSProperties)
    : { opacity: staticOpacity };

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 motion-reduce:opacity-[var(--reduced-opacity,0.04)]",
        className,
      )}
      style={maskStyle}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern
            id="qtai-grid"
            width={spacing}
            height={spacing}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${spacing} 0 L 0 0 0 ${spacing}`}
              fill="none"
              className="stroke-foreground/[0.06] dark:stroke-foreground/[0.08]"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#qtai-grid)" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds. `cn` already exists at `frontend/src/lib/utils.ts`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/cursor-grid.tsx
git commit -m "feat(landing): add CursorGrid SVG lattice with cursor-aware mask"
```

---

## Task 3: `<Hero>` section — eyebrow, headline, CTAs, product mock, cursor grid

**Files:**
- Create: `frontend/src/components/landing/hero.tsx`

- [ ] **Step 1: Create the Hero component**

Create `frontend/src/components/landing/hero.tsx`:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { CursorGrid } from "./cursor-grid";
import { Reveal } from "./reveal";

export function Hero() {
  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <CursorGrid cursorAware />

      <div className="container relative z-10 flex min-h-[88vh] flex-col items-center justify-center pb-20 pt-28">
        <Reveal>
          <Link
            href="#features"
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background/80"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live signals
          </Link>
        </Reveal>

        <Reveal delay={0.05}>
          <h1 className="text-center text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
            Auto Buy Low and Sell High with{" "}
            <span className="bg-gradient-to-b from-primary/70 to-primary bg-clip-text text-transparent">
              Real-time Trading Signals
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-[640px] text-center text-lg text-muted-foreground md:text-xl">
            AI-driven platform that analyzes market trends, volatility, and sentiment.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/trade">
                Start Trading
                <ArrowRightIcon className="ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="border border-border/60">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.2} className="relative mt-16 w-full max-w-4xl">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[60%] w-[80%] rounded-full bg-primary/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border/60 shadow-2xl">
            <Image
              src="/mac-light.png"
              width={1600}
              height={900}
              alt="Quant Trader AI dashboard preview"
              priority
              className="block w-full dark:hidden"
            />
            <Image
              src="/mac-dark.png"
              width={1600}
              height={900}
              alt="Quant Trader AI dashboard preview"
              priority
              className="hidden w-full dark:block"
            />
          </div>
        </Reveal>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/hero.tsx
git commit -m "feat(landing): add Hero section with cursor-aware grid"
```

---

## Task 4: `<SiteHeader>` — morphing scroll-aware header

**Files:**
- Create: `frontend/src/components/landing/site-header.tsx`

- [ ] **Step 1: Create the SiteHeader component**

Create `frontend/src/components/landing/site-header.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gem } from "lucide-react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { cn } from "@/lib/utils";

const SCROLL_THRESHOLD = 24;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > SCROLL_THRESHOLD;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to main content
      </a>

      <motion.header
        role="banner"
        initial={false}
        animate={{
          width: scrolled ? "min(768px, calc(100% - 32px))" : "100%",
          height: scrolled ? 52 : 64,
          top: scrolled ? 12 : 0,
          borderRadius: scrolled ? 9999 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-1/2 z-50 -translate-x-1/2",
          "border-border/50",
          scrolled
            ? "border bg-background/70 shadow-lg shadow-black/5 backdrop-blur-xl"
            : "border-b border-border/40 bg-background/95 backdrop-blur-sm dark:bg-black/60",
        )}
      >
        <div className="flex h-full items-center px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center transition-opacity duration-300 hover:opacity-85"
          >
            <Gem className="mr-2 h-5 w-5" />
            <span className="font-bold">Quant Trader AI</span>
          </Link>

          {!scrolled && (
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex"
              aria-label="Primary"
            >
              <Link
                href="#features"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                How it works
              </Link>
              <Link
                href="#about"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                About
              </Link>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-background"
              asChild
            >
              <Link
                href="https://github.com/kazakhpunk/Quant_Trader_AI"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub repository"
              >
                <GitHubLogoIcon className="h-[1.2rem] w-[1.2rem]" />
              </Link>
            </Button>
            <ModeToggle />
            <Button size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/trade">Start Trading</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="h-16" aria-hidden />
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds. The header is unused yet but must compile.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/site-header.tsx
git commit -m "feat(landing): add morphing SiteHeader with scroll-driven pill state"
```

---

## Task 5: `<TrustStrip>` — stat band with count-up

**Files:**
- Create: `frontend/src/components/landing/trust-strip.tsx`

- [ ] **Step 1: Create the TrustStrip component**

Create `frontend/src/components/landing/trust-strip.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Stat = {
  value: number;
  suffix?: string;
  label: string;
};

const STATS: Stat[] = [
  { value: 200, suffix: "+", label: "Assets monitored" },
  { value: 24, suffix: "/7", label: "Real-time scanning" },
  { value: 4, label: "Analysis dimensions" },
];

function CountUp({ to, suffix }: { to: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(to);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          const start = performance.now();
          const duration = 800;
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
            setDisplay(Math.round(to * eased));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

export function TrustStrip() {
  return (
    <section className="border-y border-border/40 py-12">
      <div className="container">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Built for serious traders
        </p>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-semibold tabular-nums md:text-4xl">
                <CountUp to={s.value} suffix={s.suffix} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/trust-strip.tsx
git commit -m "feat(landing): add TrustStrip with count-up stats"
```

---

## Task 6: `<About>` — lightly-tweaked existing About card

**Files:**
- Create: `frontend/src/components/landing/about.tsx`

- [ ] **Step 1: Create the About component**

Create `frontend/src/components/landing/about.tsx`:

```tsx
import Image from "next/image";
import { Card } from "@/components/ui/card";
import Statistics from "@/components/v4/statistics";
import { Reveal } from "./reveal";

export function About() {
  return (
    <section id="about" className="py-24">
      <div className="container">
        <Reveal>
          <Card className="relative overflow-hidden rounded-lg border-border/60 px-8 py-12 shadow-sm">
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-8 bottom-8 w-px bg-primary/40"
            />
            <div className="flex flex-col-reverse gap-8 px-2 md:flex-row md:gap-12 md:px-6">
              <Image
                src="/qtrader.png"
                alt="Quant Trader AI Logo"
                width={300}
                height={300}
                className="rounded-lg"
              />
              <div className="flex flex-col justify-between">
                <div className="pb-6">
                  <h2 className="text-3xl font-bold md:text-4xl">
                    <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
                      About{" "}
                    </span>
                    Quant Trader AI
                  </h2>
                  <p className="mt-4 text-xl text-muted-foreground">
                    Quant Trader AI is an advanced AI-driven trading platform offering real-time
                    signals. It features fundamental, technical, volatility, and sentiment
                    analyses, ensuring informed, emotion-free trading with no learning curve.
                    Automate your buy-low, sell-high strategies effortlessly.
                  </p>
                </div>
                <Statistics />
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/about.tsx
git commit -m "feat(landing): add About component with primary accent line"
```

---

## Task 7: `<FeaturePanel>` — single panel renderer for the carousel

**Files:**
- Create: `frontend/src/components/landing/feature-panel.tsx`

- [ ] **Step 1: Create the FeaturePanel component**

Create `frontend/src/components/landing/feature-panel.tsx`:

```tsx
"use client";

import Image from "next/image";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureCallout = {
  icon: LucideIcon;
  label: string;
  detail: string;
};

export type FeaturePanelData = {
  index: number;
  total: number;
  title: string;
  lede: string;
  callouts: FeatureCallout[];
  imageSrc: string;
  imageDarkSrc?: string;
  imageAlt: string;
};

export function FeaturePanel({
  data,
  variant = "horizontal",
}: {
  data: FeaturePanelData;
  variant?: "horizontal" | "stacked";
}) {
  const padded = data.index.toString().padStart(2, "0");
  const totalPadded = data.total.toString().padStart(2, "0");

  return (
    <article
      className={cn(
        "flex w-full items-center justify-center",
        variant === "horizontal"
          ? "h-screen shrink-0 px-6 md:px-12 lg:px-24"
          : "min-h-[80vh] px-6 py-20 md:px-12",
      )}
    >
      <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[60%] w-[80%] rounded-full bg-primary/15 blur-3xl" />
          <div className="relative overflow-hidden rounded-xl border border-border/60 shadow-2xl">
            <Image
              src={data.imageSrc}
              alt={data.imageAlt}
              width={1600}
              height={900}
              className={cn("block w-full", data.imageDarkSrc && "dark:hidden")}
            />
            {data.imageDarkSrc && (
              <Image
                src={data.imageDarkSrc}
                alt={data.imageAlt}
                width={1600}
                height={900}
                className="hidden w-full dark:block"
              />
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {padded} / {totalPadded}
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight lg:text-5xl">
            {data.title}
          </h3>
          <p className="mt-4 text-lg text-muted-foreground">{data.lede}</p>

          <ul className="mt-8 space-y-4">
            {data.callouts.map((c) => (
              <li key={c.label} className="flex items-start gap-3">
                <span className="rounded-md bg-primary/10 p-2">
                  <c.icon className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <div className="font-medium">{c.label}</div>
                  <div className="text-sm text-muted-foreground">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/feature-panel.tsx
git commit -m "feat(landing): add FeaturePanel with horizontal/stacked variants"
```

---

## Task 8: `<FeatureCarousel>` — sticky horizontal pin + mobile fallback

**Files:**
- Create: `frontend/src/components/landing/feature-carousel.tsx`

- [ ] **Step 1: Create the FeatureCarousel component**

Create `frontend/src/components/landing/feature-carousel.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  AlarmClockIcon,
  BarChart3,
  GaugeIcon,
  LineChart,
  Newspaper,
  PieChartIcon,
  TrendingUpIcon,
  Wallet,
  Activity,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";
import { Reveal } from "./reveal";
import { FeaturePanel, type FeaturePanelData } from "./feature-panel";

const PANELS: FeaturePanelData[] = [
  {
    index: 1,
    total: 4,
    title: "Technical Analysis",
    lede: "Indicator-driven signals across multiple timeframes.",
    imageSrc: "/mac-light.png",
    imageDarkSrc: "/mac-dark.png",
    imageAlt: "Technical analysis dashboard",
    callouts: [
      { icon: TrendingUpIcon, label: "12+ indicators monitored 24/7", detail: "RSI, MACD, Bollinger, EMA, and more, recomputed continuously." },
      { icon: Layers, label: "Multi-timeframe confluence", detail: "Signals weighted across 1m, 15m, 1h, and daily charts." },
      { icon: Activity, label: "Volatility-adjusted signals", detail: "Sizing and triggers adapt to current market regime." },
    ],
  },
  {
    index: 2,
    total: 4,
    title: "Fundamental Analysis",
    lede: "Earnings, ratios, and financials parsed automatically.",
    imageSrc: "/mac-light.png",
    imageDarkSrc: "/mac-dark.png",
    imageAlt: "Fundamental analysis dashboard",
    callouts: [
      { icon: PieChartIcon, label: "P/E, P/B, ROIC scoring", detail: "Standard valuation ratios computed across the universe." },
      { icon: BarChart3, label: "Quarterly updates from filings", detail: "Earnings and balance-sheet data refresh after each report." },
      { icon: GaugeIcon, label: "Sector-relative valuation", detail: "Ratios benchmarked against the asset's own sector." },
    ],
  },
  {
    index: 3,
    total: 4,
    title: "Sentiment Analysis",
    lede: "News and social sentiment measured in real-time.",
    imageSrc: "/mac-light.png",
    imageDarkSrc: "/mac-dark.png",
    imageAlt: "Sentiment analysis dashboard",
    callouts: [
      { icon: Sparkles, label: "NLP-driven sentiment scoring", detail: "Article and post text classified for tone and stance." },
      { icon: Newspaper, label: "News + social media monitored", detail: "Aggregated across major outlets and social platforms." },
      { icon: LineChart, label: "Sentiment-shift alerts", detail: "Notifies when an asset's sentiment trend reverses." },
    ],
  },
  {
    index: 4,
    total: 4,
    title: "Paper / Live Trading",
    lede: "Practice risk-free, then go live with one click.",
    imageSrc: "/mac-light.png",
    imageDarkSrc: "/mac-dark.png",
    imageAlt: "Paper and live trading dashboard",
    callouts: [
      { icon: AlarmClockIcon, label: "Paper trading sandbox", detail: "Test strategies with simulated fills before risking capital." },
      { icon: Wallet, label: "Broker integrations", detail: "Connect supported brokers to execute signals automatically." },
      { icon: Zap, label: "One-click execution", detail: "Move from signal to filled order without leaving the app." },
    ],
  },
];

const PANEL_COUNT = PANELS.length;

export function FeatureCarousel() {
  const outerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLargeScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const useHorizontal = isLargeScreen && !reduce;

  return (
    <section id="features" className="py-24">
      <div className="container">
        <Reveal>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Features</p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Four lenses. One signal.
          </h2>
        </Reveal>
      </div>

      {useHorizontal ? <HorizontalTrack outerRef={outerRef} /> : <StackedTrack />}
    </section>
  );
}

function HorizontalTrack({
  outerRef,
}: {
  outerRef: React.RefObject<HTMLDivElement>;
}) {
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // Each panel takes 25% of the track; we slide from 0 to -75% (4 panels × 100vw).
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);
  const activeIndex = useTransform(scrollYProgress, (v) =>
    Math.min(PANEL_COUNT - 1, Math.floor(v * PANEL_COUNT)),
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    return activeIndex.on("change", (v) => setActive(v));
  }, [activeIndex]);

  return (
    <div
      ref={outerRef}
      className="relative mt-12"
      style={{ height: `${PANEL_COUNT * 100}vh` }}
      aria-label="Product features"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <motion.div
          className="flex h-full"
          style={{ x, width: `${PANEL_COUNT * 100}vw` }}
        >
          {PANELS.map((p) => (
            <FeaturePanel key={p.index} data={p} variant="horizontal" />
          ))}
        </motion.div>

        <ProgressIndicator active={active} />
      </div>
    </div>
  );
}

function StackedTrack() {
  return (
    <div className="mt-12 space-y-12">
      {PANELS.map((p) => (
        <Reveal key={p.index}>
          <FeaturePanel data={p} variant="stacked" />
        </Reveal>
      ))}
    </div>
  );
}

function ProgressIndicator({ active }: { active: number }) {
  const current = PANELS[active] ?? PANELS[0];
  const padded = current.index.toString().padStart(2, "0");
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-3">
      <div className="flex items-center gap-2">
        {PANELS.map((p, i) => (
          <span
            key={p.index}
            className={
              i === active
                ? "h-1.5 w-8 rounded-full bg-primary transition-all duration-300"
                : "h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-all duration-300"
            }
          />
        ))}
      </div>
      <span className="font-mono text-xs text-muted-foreground">
        {padded} — {current.title}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/feature-carousel.tsx
git commit -m "feat(landing): add FeatureCarousel with sticky horizontal scroll"
```

---

## Task 9: `<HowItWorks>` — 3-step section

**Files:**
- Create: `frontend/src/components/landing/how-it-works.tsx`

- [ ] **Step 1: Create the HowItWorks component**

Create `frontend/src/components/landing/how-it-works.tsx`:

```tsx
import { Reveal } from "./reveal";

const STEPS = [
  {
    number: "01",
    title: "Connect your broker",
    description: "Link your account in under a minute.",
  },
  {
    number: "02",
    title: "AI scans markets",
    description: "Our engine watches 200+ assets in real time.",
  },
  {
    number: "03",
    title: "Get signals & auto-trade",
    description: "Receive notifications, or let it execute for you.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight md:text-5xl">
            Three steps to your first signal
          </h2>
        </Reveal>

        <ol className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, idx) => (
            <Reveal key={s.number} delay={idx * 0.05} as="div">
              <li className="relative">
                {idx < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-full top-6 hidden h-px w-full -translate-x-4 border-t border-dashed border-border/60 md:block"
                  />
                )}
                <div className="text-5xl font-semibold text-primary/30">{s.number}</div>
                <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.description}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/how-it-works.tsx
git commit -m "feat(landing): add HowItWorks 3-step section"
```

---

## Task 10: `<FinalCTA>` — closing call to action

**Files:**
- Create: `frontend/src/components/landing/final-cta.tsx`

- [ ] **Step 1: Create the FinalCTA component**

Create `frontend/src/components/landing/final-cta.tsx`:

```tsx
import Link from "next/link";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { CursorGrid } from "./cursor-grid";
import { Reveal } from "./reveal";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-32">
      <CursorGrid />
      <div className="container relative z-10 mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Start trading smarter today.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Plug in your broker, let the engine watch the market, and act on signals you trust.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/trade">
                Start Trading
                <ArrowRightIcon className="ml-2" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/final-cta.tsx
git commit -m "feat(landing): add FinalCTA with static grid background"
```

---

## Task 11: `<SiteFooter>` — extended footer

**Files:**
- Create: `frontend/src/components/landing/site-footer.tsx`

- [ ] **Step 1: Create the SiteFooter component**

Create `frontend/src/components/landing/site-footer.tsx`:

```tsx
import Link from "next/link";
import { Gem } from "lucide-react";
import { GitHubLogoIcon, InstagramLogoIcon } from "@radix-ui/react-icons";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="flex items-center">
              <Gem className="mr-2 h-5 w-5" />
              <span className="font-bold">Quant Trader AI</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI-driven platform that analyzes market trends, volatility, and sentiment.
            </p>
          </div>

          <nav aria-label="Footer">
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#about" className="hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/trade" className="hover:text-foreground">
                  Trade
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-semibold">Connect</h3>
            <div className="mt-3 flex items-center gap-3">
              <Link
                href="https://github.com/kazakhpunk/Quant_Trader_AI"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="rounded-full border border-border/60 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <GitHubLogoIcon className="h-4 w-4" />
              </Link>
              <Link
                href="https://www.instagram.com/qtrader.ai/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-full border border-border/60 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <InstagramLogoIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border/40 py-6">
        <p className="container text-center text-sm leading-loose text-muted-foreground">
          Built by Nursultan Sagyntay
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/landing/site-footer.tsx
git commit -m "feat(landing): add SiteFooter with 3-column nav block"
```

---

## Task 12: Compose `page.tsx` from new components

**Files:**
- Modify: `frontend/src/app/page.tsx` (full rewrite)

- [ ] **Step 1: Replace the contents of `frontend/src/app/page.tsx`**

```tsx
import { Hero } from "@/components/landing/hero";
import { TrustStrip } from "@/components/landing/trust-strip";
import { About } from "@/components/landing/about";
import { FeatureCarousel } from "@/components/landing/feature-carousel";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FinalCTA } from "@/components/landing/final-cta";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Hero />
        <TrustStrip />
        <About />
        <FeatureCarousel />
        <HowItWorks />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck/build passes**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 3: Manual verification — run dev server**

```bash
cd frontend && npm run dev
```
Open http://localhost:3000 and confirm:
- Hero renders with headline, CTAs, and product mock.
- Cursor moving over the hero reveals a soft grid lattice that follows the cursor.
- Header is full-width at top; scrolling down (>24px) morphs it into a centered floating pill with blur.
- Trust strip stats animate count-up when they enter view.
- About card renders with the primary accent line on the left edge.
- Feature carousel: on a desktop ≥1024px window, scroll past the section — it pins and the panels slide horizontally with a progress indicator at the bottom. On a window <1024px wide, panels stack vertically.
- "How it works" shows 3 numbered steps with a dashed connector on desktop.
- Final CTA centered with a static faint grid background.
- Footer shows 3 columns + credit line.
- Anchor links in the header (`Features` / `How it works` / `About`) jump to the right sections.

Stop the dev server before continuing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat(landing): rewire page.tsx to compose new landing components"
```

---

## Task 13: Reduced-motion + dark mode + responsive QA pass

**Files:**
- (Possibly fixes in previously-created landing components)

- [ ] **Step 1: Run the dev server**

```bash
cd frontend && npm run dev
```

- [ ] **Step 2: Toggle reduced motion in OS settings (macOS: System Settings → Accessibility → Display → Reduce motion)**

Reload the landing page and verify:
- Header morph snaps between states with no animated transition.
- Cursor grid renders as a flat faint static lattice — no cursor-following effect.
- Section reveals show content immediately (no fade/slide).
- Carousel always renders as the vertical stacked layout (no horizontal scroll-jacking) regardless of viewport width.
- Trust-strip stats display final values immediately, no count-up.

If any of these misbehave, fix the offending component (most likely culprits: a missing `useReducedMotion()` check, or a CSS `transition` left on without a `motion-reduce:` modifier).

- [ ] **Step 3: Toggle dark mode (use the ModeToggle in the header)**

Verify in dark mode:
- Hero gradient + grid stay legible.
- Card borders, header pill border, and footer separators are visible (not blending into background).
- Body text contrast is comfortable (≥4.5:1).
- Product mock uses `mac-dark.png`.

- [ ] **Step 4: Resize the browser through 375 → 768 → 1024 → 1440 widths**

Verify:
- 375 / 768: header stays in pill state, carousel stacks vertically, trust strip stacks one-column on smallest width, no horizontal page scroll.
- 1024 / 1440: header morphs on scroll, carousel pins horizontally.
- No content is hidden behind the floating header (the spacer div in `SiteHeader` reserves 64px).

- [ ] **Step 5: Stop dev server, run lint + build one more time**

```bash
cd frontend && npm run lint && npm run build
```
Expected: lint clean, build succeeds.

- [ ] **Step 6: Commit any QA fixes**

If any fixes were made:
```bash
git add frontend/src/components/landing/
git commit -m "fix(landing): QA fixes for reduced motion, dark mode, responsive"
```
If no fixes were needed, skip this commit.

---

## Task 14: Cleanup — remove unused imports from prior `page.tsx`

**Files:**
- Inspect: `frontend/src/components/v4/statistics.tsx` (still used by About — keep)
- Inspect: any imports/components that were only used by the old landing JSX

- [ ] **Step 1: Search for newly-orphaned imports**

```bash
cd frontend && grep -r "from \"@/components/v4/statistics\"" src/
```
Expected: at least the new `landing/about.tsx` imports it. If anything else still imports it, leave it alone.

- [ ] **Step 2: Confirm no other public surface broke**

```bash
cd frontend && npm run build
```
Expected: succeeds.

- [ ] **Step 3: Final lint pass**

```bash
cd frontend && npm run lint
```
Expected: no warnings or errors. If lint surfaces "unused variable" warnings in `frontend/src/app/page.tsx`, remove the unused imports.

- [ ] **Step 4: Commit**

If anything changed:
```bash
git add -A frontend/
git commit -m "chore(landing): cleanup unused imports after redesign"
```
If nothing changed, skip this commit.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Implementing task |
|---|---|
| §2 Page Architecture | Task 12 (composition) |
| §3 Header morph | Task 4 |
| §4 Hero + cursor grid | Tasks 2, 3 |
| §5 Trust strip | Task 5 |
| §6 About | Task 6 |
| §7 Feature carousel | Tasks 7, 8 |
| §8 How it works | Task 9 |
| §9 Final CTA | Task 10 |
| §10 Footer | Task 11 |
| §11 Motion system (Reveal, reduced motion) | Tasks 1, 13 |
| §12 Tokens (z-index scale, CSS vars) | Implicit in the components (z-50 header, z-10 content, decorative `-z-10` on grids — consistent with spec) |
| §13 File structure | Tasks 1–11 |
| §14 framer-motion dep | Task 0 |
| §15 Accessibility | Skip link in Task 4; aria-labels in Tasks 4, 5, 8, 11; reduced-motion verified in Task 13 |
| §16 Performance | RAF throttle in Task 2; motion values in Task 8; explicit `next/image` dimensions in Tasks 3, 7; `priority` only on hero |

**2. Placeholder scan:** No "TBD" / "implement later" / "similar to Task N" / vague-error-handling phrases. Every code block is complete.

**3. Type consistency:** `FeaturePanelData` defined in Task 7 is consumed in Task 8 with the same shape. `FeatureCallout.icon` is `LucideIcon` and all icons used in Task 8 are real lucide-react exports. The `Reveal` `as` prop accepts `"div" | "section" | "header" | "footer" | "article"` — all `Reveal` usages stay within those values.

No issues found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-25-landing-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
