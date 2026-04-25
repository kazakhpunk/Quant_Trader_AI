import Image from "next/image";
import { Card } from "@/components/ui/card";
import Statistics from "@/components/v4/statistics";
import { Reveal } from "./reveal";

export function About() {
  return (
    <section id="about" className="py-24">
      <div className="container">
        <Reveal>
          <Card className="relative overflow-hidden rounded-lg border-border/60 px-8 py-12 shadow-sm">
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-8 bottom-8 w-px bg-primary/40"
            />
            <div className="flex flex-col-reverse gap-8 px-2 md:flex-row md:gap-12 md:px-6">
              <Image
                src="/qtrader.png"
                alt="Quant Trader AI Logo"
                width={300}
                height={300}
                className="rounded-lg"
              />
              <div className="flex flex-col justify-between">
                <div className="pb-6">
                  <h2 className="text-3xl font-bold md:text-4xl">
                    <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
                      About{" "}
                    </span>
                    Quant Trader AI
                  </h2>
                  <p className="mt-4 text-xl text-muted-foreground">
                    Quant Trader AI is an advanced AI-driven trading platform offering real-time
                    signals. It features fundamental, technical, volatility, and sentiment
                    analyses, ensuring informed, emotion-free trading with no learning curve.
                    Automate your buy-low, sell-high strategies effortlessly.
                  </p>
                </div>
                <Statistics />
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
