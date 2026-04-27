"use client";

import { CircularProgress } from "@mui/material";
import { cn } from "@/lib/utils";

type LoaderProps = {
  /** "block" centers in a tall area (default 50vh); "inline" sits in flow at the parent's size. */
  variant?: "block" | "inline";
  /** Spinner diameter in px (default: 36 for block, 18 for inline). */
  size?: number;
  /** Optional caption shown below the spinner. */
  message?: string;
  /** Override the height of the centered area for `variant="block"`. */
  height?: string;
  className?: string;
};

export function Loader({
  variant = "block",
  size,
  message,
  height = "50vh",
  className,
}: LoaderProps) {
  const px = size ?? (variant === "inline" ? 18 : 36);

  if (variant === "inline") {
    return (
      <span className={cn("inline-flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <CircularProgress size={px} thickness={4} />
        {message && <span>{message}</span>}
      </span>
    );
  }

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      style={{ minHeight: height }}
    >
      <CircularProgress size={px} thickness={4} />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
