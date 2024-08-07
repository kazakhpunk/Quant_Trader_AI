import Link from "next/link";
import Image from "next/image";
import {
  AlarmClockIcon,
  BarChartIcon,
  Gem,
  PieChartIcon,
  TrendingUpIcon,
} from "lucide-react";
import { ArrowRightIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { Card } from "@/components/ui/card";
import Statistics from "@/components/v4/statistics";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="z-[50] sticky top-0 w-full bg-background/95 border-b backdrop-blur-sm dark:bg-black/[0.6] border-border/40">
        <div className="container h-14 flex items-center">
          <Link
            href="/"
            className="flex justify-start items-center hover:opacity-85 transition-opacity duration-300"
          >
            <Gem className="w-6 h-6 mr-3" />
            <span className="font-bold">Quant Trader AI</span>
            <span className="sr-only">Quant Trader AI</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-8 h-8 bg-background"
              asChild
            >
              <Link href="https://github.com/kazakhpunk/Quant_Trader_AI">
                <GitHubLogoIcon className="h-[1.2rem] w-[1.2rem]" />
              </Link>
            </Button>
            <ModeToggle />
          </nav>
        </div>
      </header>
      <main className="min-h-[calc(100vh-57px-97px)] flex-1">
        <div className="container relative pb-10">
          <section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-14 md:py-14 md:pb-8 lg:py-24 lg:pb-6">
            <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
              Auto Buy Low and Sell High with
            </h1>
            <h1 className="text-center text-3xl font-bold leading-tight tracking-tighter md:text-5xl lg:leading-[1.1]">
              Real-time Trading Signals
            </h1>
            <span className="max-w-[750px] text-center text-lg font-light text-foreground mt-2">
              AI-driven platform that analyzes market trends, volatility, and
              sentiment.
            </span>
            <div className="flex w-full items-center justify-center space-x-4 py-4 md:pb-6">
              <Button variant="default" asChild>
                <Link href="/trade">
                  Start Trading
                  <ArrowRightIcon className="ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link
                  href="https://www.instagram.com/qtrader.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Follow us on Instagram
                </Link>
              </Button>
            </div>
          </section>
          <div className="flex justify-center relative mt-8">
            <Image
              src="/mac-light.png"
              width={800}
              height={450}
              alt="demo"
              priority
              className="border rounded-xl shadow-lg dark:hidden w-full max-w-[800px]"
            />
            <Image
              src="/mac-dark.png"
              width={800}
              height={450}
              alt="demo-dark"
              priority
              className="border border-zinc-600 rounded-xl shadow-lg hidden dark:block dark:shadow-gray-500/5 w-full max-w-[800px]"
            />
            <div className="aspect-[800/450] max-w-[800px] absolute inset-0 mx-auto">
              <Image
                src="/phone-light.png"
                width={180}
                height={390}
                alt="demo-mobile"
                className="border rounded-xl hidden lg:block dark:hidden absolute -bottom-4 -right-8 shadow-lg"
              />
              <Image
                src="/phone-dark.png"
                width={180}
                height={390}
                alt="demo-mobile"
                className="border border-zinc-600 rounded-xl absolute -bottom-4 -right-8 hidden dark:lg:block shadow-lg"
              />
            </div>
          </div>
        </div>

        <section id="about" className="py-12 sm:py-24 mx-8 sm:mx-32 my-24">
          <Card className="border rounded-lg px-8 py-12 shadow-lg">
            <div className="px-6 flex flex-col-reverse md:flex-row gap-8 md:gap-12">
              <Image
                src="/qtrader.png"
                alt="Quant Trader AI Logo"
                width={300}
                height={300}
                className="rounded-lg"
              />
              <div className="bg-green-0 flex flex-col justify-between">
                <div className="pb-6">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                      About{" "}
                    </span>
                    Quant Trader AI
                  </h2>
                  <p className="text-xl text-muted-foreground mt-4">
                    Quant Trader AI is an advanced AI-driven trading platform
                    offering real-time signals. It features fundamental,
                    technical, volatility, and sentiment analyses, ensuring
                    informed, emotion-free trading with no learning curve.
                    Automate your buy-low, sell-high strategies effortlessly.
                  </p>
                </div>
                <Statistics />
              </div>
            </div>
          </Card>
        </section>

        <section className="py-24 sm:py-32 sm:mx-28 mx-8 my-8">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold ">
              How It{" "}
              <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                Works{" "}
              </span>
              Step-by-Step Guide
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-4 md:px-6 py-12">
            <Card className="bg-background p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-primary rounded-md p-3 flex items-center justify-center">
                  <TrendingUpIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Technical Analysis</h3>
              </div>
              <p className="text-muted-foreground mt-4">
                Leverage advanced technical indicators to identify trading
                opportunities.
              </p>
            </Card>
            <Card className="bg-background p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-primary rounded-md p-3 flex items-center justify-center">
                  <PieChartIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Fundamental Analysis</h3>
              </div>
              <p className="text-muted-foreground mt-4">
                Gain deep insights into financial statements to make informed
                trading decisions.
              </p>
            </Card>
            <Card className="bg-background p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-primary rounded-md p-3 flex items-center justify-center">
                  <PieChartIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Sentiment Analysis</h3>
              </div>
              <p className="text-muted-foreground mt-4">
                Analyze market sentiment through news and social media to
                predict market movements.
              </p>
            </Card>
            <Card className="bg-background p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-primary rounded-md p-3 flex items-center justify-center">
                  <AlarmClockIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Paper/Live Trading</h3>
              </div>
              <p className="text-muted-foreground mt-4">
                Practice trading with paper trading or execute real trades with
                live trading.
              </p>
            </Card>
          </div>
        </section>
      </main>
      <footer className="py-6 md:py-0 border-t border-border/40">
        <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
            Built by Nursultan Sagyntay
          </p>
        </div>
      </footer>
    </div>
  );
}
