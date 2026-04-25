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
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main id="main" className="flex-1">
          <Hero />
          <TrustStrip />
          <About />
          <FeatureCarousel />
          <HowItWorks />
          <FinalCTA />
        </main>
        <SiteFooter />
      </div>
    </MotionProvider>
  );
}
