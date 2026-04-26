"use client";

import { Direction } from "@/lib/api/ratings";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";

const OPTIONS: { value: Direction; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "long",  label: "Long ideas",  Icon: ArrowUp },
  { value: "short", label: "Short ideas", Icon: ArrowDown },
];

export function DirectionToggle({
  value,
  onChange,
}: {
  value: Direction;
  onChange: (next: Direction) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Rating direction"
      className="inline-flex items-center rounded-md border border-border/70 bg-muted/30 p-0.5"
    >
      {OPTIONS.map(({ value: v, label, Icon }) => {
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
