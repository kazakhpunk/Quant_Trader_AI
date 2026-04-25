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
  imageSrc?: string;
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
    <section
      className={cn(
        "flex w-full items-center justify-center",
        variant === "horizontal"
          ? "h-full shrink-0 px-6 md:px-12 lg:px-24"
          : "min-h-[80vh] px-6 py-20 md:px-12",
      )}
    >
      <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto h-[60%] w-[80%] rounded-full bg-primary/15 blur-3xl" />
          <div className="relative overflow-hidden rounded-xl border border-border/60 shadow-2xl">
            {data.imageSrc ? (
              <>
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
              </>
            ) : (
              <FeatureSkeleton title={data.title} />
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {padded} / {totalPadded}
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight lg:text-5xl">
            {data.title}
          </h2>
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
    </section>
  );
}

function FeatureSkeleton({ title }: { title: string }) {
  return (
    <div
      role="img"
      aria-label={`${title} preview — coming soon`}
      className="relative aspect-[16/9] w-full overflow-hidden bg-muted"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/40 to-muted" />
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent motion-reduce:animate-none" />
      <div className="relative flex h-full flex-col gap-4 p-8">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <div className="ml-auto h-3 w-32 rounded bg-foreground/10" />
        </div>
        <div className="grid flex-1 grid-cols-3 gap-4">
          <div className="space-y-3">
            <div className="h-3 w-2/3 rounded bg-foreground/15" />
            <div className="h-2 w-full rounded bg-foreground/10" />
            <div className="h-2 w-5/6 rounded bg-foreground/10" />
            <div className="mt-4 h-16 rounded bg-foreground/[0.07]" />
          </div>
          <div className="col-span-2 space-y-3">
            <div className="flex items-end gap-2">
              <div className="h-3 w-1/3 rounded bg-foreground/15" />
              <div className="ml-auto h-2 w-16 rounded bg-foreground/10" />
            </div>
            <div className="h-32 rounded bg-foreground/[0.07]" />
            <div className="grid grid-cols-3 gap-2">
              <div className="h-8 rounded bg-foreground/[0.07]" />
              <div className="h-8 rounded bg-foreground/[0.07]" />
              <div className="h-8 rounded bg-foreground/[0.07]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
