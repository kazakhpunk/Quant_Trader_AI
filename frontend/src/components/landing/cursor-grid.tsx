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
