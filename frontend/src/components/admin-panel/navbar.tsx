"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/admin-panel/user-nav";
import { SheetMenu } from "@/components/admin-panel/sheet-menu";
import Link from "next/link";
import { Button } from "../ui/button";
import { SignedOut } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface NavbarProps {
  title: string;
  hideTitleOnScroll?: boolean;
  /** When true, the right-side icon cluster (ModeToggle, Sign Up, UserNav)
   *  fades out once the user scrolls past the masthead. Used on dense pages
   *  like /analysis/ratings where page-level controls (Find ticker, How
   *  scores work) need the right edge to themselves. */
  hideIconsOnScroll?: boolean;
}

export function Navbar({ title, hideTitleOnScroll, hideIconsOnScroll }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const trackScroll = !!(hideTitleOnScroll || hideIconsOnScroll);

  useEffect(() => {
    if (!trackScroll) return;

    const updateScrolled = () => setIsScrolled(window.scrollY > 8);

    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });

    return () => window.removeEventListener("scroll", updateScrolled);
  }, [trackScroll]);

  const iconsHidden = !!(hideIconsOnScroll && isScrolled);

  return (
    <header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary">
      <div className="mx-4 sm:mx-8 flex h-14 items-center">
        <div className="flex items-center space-x-4 lg:space-x-0">
          <SheetMenu />
          <h1 className={`translate-y-0.5 font-bold transition-opacity ${hideTitleOnScroll && isScrolled ? "opacity-0" : "opacity-100"}`}>
            {title}
          </h1>
        </div>
        <div
          className={`flex flex-1 items-center space-x-2 justify-end transition-opacity duration-200 ${
            iconsHidden ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          aria-hidden={iconsHidden}
        >
          <ModeToggle />
          <SignedOut>
            <Link href="/signup">
              <Button variant="default" className="ml-4">
                Sign Up
              </Button>
            </Link>
          </SignedOut>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
