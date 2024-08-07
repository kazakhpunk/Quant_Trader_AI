import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { TradePanel } from "../v2/trade-form";

export default function LoginPrompt() {
  return (
    <div className="mt-8 text-lg">
      <SignedOut>
        <div className="flex justify-center min-h-screen">
          {" "}
          Please&nbsp;
          <Link href="/signin">
            <span className="text-blue-500 underline">log in</span>
          </Link>
          &nbsp;or&nbsp;
          <Link href="/signup">
            <span className="text-blue-500 underline">sign up</span>
          </Link>
          &nbsp;to start trading!
        </div>
      </SignedOut>
      <SignedIn>
        <TradePanel />
      </SignedIn>
    </div>
  );
}
