import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TradePanel } from "../v2/trade-form";

export default function LoginPrompt() {
  return (
    <>
      <SignedOut>
        <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-4 py-24 text-center">
          <div className="rounded-full border border-border/60 bg-muted/40 p-3">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">
            Sign in to start trading
          </h2>
          <p className="mt-3 text-muted-foreground">
            Connect your account to allocate capital and let the engine execute
            signals on your behalf.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg">
              <Link href="/signin">Log in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <TradePanel />
      </SignedIn>
    </>
  );
}
