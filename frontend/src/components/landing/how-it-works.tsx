import { Reveal } from "./reveal";

const STEPS = [
  {
    number: "01",
    title: "Connect your broker",
    description: "Link your account in under a minute.",
  },
  {
    number: "02",
    title: "AI scans markets",
    description: "Our engine watches 200+ assets in real time.",
  },
  {
    number: "03",
    title: "Get signals & auto-trade",
    description: "Receive notifications, or let it execute for you.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="container">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold tracking-tight md:text-5xl">
            Three steps to your first signal
          </h2>
        </Reveal>

        <div className="relative mt-16">
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px border-t border-dashed border-border/60 md:block"
          />
          <ol className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, idx) => (
              <Reveal
                key={s.number}
                delay={idx * 0.05}
                as="li"
                className="relative"
              >
                <div className="inline-flex items-center justify-center rounded-md bg-background pr-3 text-5xl font-semibold leading-none text-primary/30">
                  {s.number}
                </div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.description}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
