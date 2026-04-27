"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { BrandLogo } from "@/components/brand-logo";
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
          width: scrolled ? "min(960px, calc(100% - 32px))" : "100%",
          height: scrolled ? 56 : 64,
          top: scrolled ? 12 : 0,
          borderRadius: scrolled ? 9999 : 0,
        }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-1/2 z-50 -translate-x-1/2",
          "border-border/50",
          scrolled
            ? "border bg-background/95 shadow-lg shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
            : "border-b border-border/40 bg-background dark:bg-background",
        )}
      >
        <div className="flex h-full items-center px-4 md:px-6">
          <Link
            href="/"
            className="flex items-center transition-opacity duration-300 hover:opacity-85"
          >
            <BrandLogo className="mr-2 h-5 w-5" size={20} />
            <span className="font-bold">Quant Trader AI</span>
          </Link>

          {!scrolled && (
            <nav
              className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex"
              aria-label="Primary"
            >
              <Link
                href="#features"
                className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground/90"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground/90"
              >
                How it works
              </Link>
              <Link
                href="#about"
                className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground/90"
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
