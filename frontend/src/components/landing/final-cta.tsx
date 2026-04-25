import Link from "next/link";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { CursorGrid } from "./cursor-grid";
import { Reveal } from "./reveal";

export function FinalCTA() {
  return (
    <section className="sticky top-0 flex h-screen items-center justify-center overflow-hidden bg-background">
      <CursorGrid />
      <div className="container relative z-10 mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
            Start trading smarter today.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">
            Plug in your broker, let the engine watch the market, and act on signals you trust.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 flex justify-center">
            <Button size="lg" asChild>
              <Link href="/trade">
                Start Trading
                <ArrowRightIcon className="ml-2" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
