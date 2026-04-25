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
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60 opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
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
          <Image
            src="/phone-light.png"
            width={180}
            height={390}
            alt="Quant Trader AI mobile preview"
            className="absolute -bottom-4 -right-8 hidden rounded-xl border border-border/60 shadow-lg lg:block dark:hidden"
          />
          <Image
            src="/phone-dark.png"
            width={180}
            height={390}
            alt="Quant Trader AI mobile preview"
            className="absolute -bottom-4 -right-8 hidden rounded-xl border border-border/60 shadow-lg dark:lg:block"
          />
        </Reveal>
      </div>
    </section>
  );
}
