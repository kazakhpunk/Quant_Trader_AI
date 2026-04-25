import Statistics from "@/components/v4/statistics";
import { Reveal } from "./reveal";

export function About() {
  return (
    <section id="about" className="py-32">
      <div className="container max-w-4xl">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            About
          </p>
          <h2 className="mt-3 text-balance text-center text-3xl font-semibold tracking-tight md:text-5xl">
            Built for traders who want{" "}
            <span className="bg-gradient-to-b from-primary/60 to-primary bg-clip-text text-transparent">
              informed, emotion-free
            </span>{" "}
            decisions.
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mx-auto mt-8 max-w-2xl text-balance text-center text-lg text-muted-foreground md:text-xl">
            Quant Trader AI ingests fundamental, technical, volatility, and sentiment data,
            then surfaces real-time signals you can act on — with no learning curve.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-14">
            <Statistics />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
