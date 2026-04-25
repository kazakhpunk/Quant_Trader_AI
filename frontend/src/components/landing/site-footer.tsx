import Link from "next/link";
import { Gem } from "lucide-react";
import { GitHubLogoIcon, InstagramLogoIcon } from "@radix-ui/react-icons";

export function SiteFooter() {
  return (
    <footer className="sticky bottom-0 z-0 flex min-h-[420px] flex-col justify-end border-t border-border/40 bg-muted/40">
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
