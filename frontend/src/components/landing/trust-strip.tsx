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
