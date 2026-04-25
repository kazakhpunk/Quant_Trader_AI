import { Hero } from "@/components/landing/hero";
import { TrustStrip } from "@/components/landing/trust-strip";
import { About } from "@/components/landing/about";
import { FeatureCarousel } from "@/components/landing/feature-carousel";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FinalCTA } from "@/components/landing/final-cta";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { MotionProvider } from "@/components/landing/motion-provider";

export default function HomePage() {
  return (
    <MotionProvider>
      {/* Main content card sits on z-10 with an opaque background and slides up,
          revealing the footer that's pinned to the viewport bottom behind it. */}
      <div className="relative z-10 bg-background">
        <SiteHeader />
        <main id="main">
          <Hero />
          <TrustStrip />
          <About />
          <FeatureCarousel />
          <HowItWorks />
          <FinalCTA />
        </main>
      </div>
      <SiteFooter />
    </MotionProvider>
  );
}
