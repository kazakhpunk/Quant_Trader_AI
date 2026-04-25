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

      {useHorizontal ? <HorizontalTrack /> : <StackedTrack />}
    </section>
  );
}

function HorizontalTrack() {
  const outerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: outerRef,
    offset: ["start start", "end end"],
  });

  // Each panel takes 25% of the track; we slide from 0 to -75% (4 panels × 100vw).
  const endX = `-${((PANEL_COUNT - 1) / PANEL_COUNT) * 100}%`;
  const x = useTransform(scrollYProgress, [0, 1], ["0%", endX]);
  // Active index is whichever panel is currently centered. Mapping is linear
  // 0→0%, 1/(N-1)→-1·step, …, 1→-(N-1)·step (where step = 100%/N), so panel k
  // is centered at scrollYProgress = k/(N-1). Round to track the nearest panel.
  const activeIndex = useTransform(scrollYProgress, (v) =>
    Math.min(PANEL_COUNT - 1, Math.max(0, Math.round(v * (PANEL_COUNT - 1)))),
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
                ? "h-1.5 w-8 rounded-full bg-primary transition-all duration-300 motion-reduce:transition-none"
                : "h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-all duration-300 motion-reduce:transition-none"
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
