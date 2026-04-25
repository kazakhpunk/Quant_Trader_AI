"use client";

import { SetStateAction, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser } from "@clerk/nextjs";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { Settings } from "../v4/sheetMenu";
import { cn, getApiUrl } from "@/lib/utils";

const PRESETS = [10, 25, 50, 100];

export function TradePanel() {
  const [showPanel, setPanel] = useState(true);
  const [allocation, setAllocation] = useState(50);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLiveTrading, setIsLiveTrading] = useState(true);
  const [isPaperTrading, setIsPaperTrading] = useState(false);
  const [isSentimentEnabled, setIsSentimentEnabled] = useState(true);
  const { user } = useUser();

  const handlePurchase = async () => {
    if (!user) {
      console.error("User not logged in");
      return;
    }

    setLoading(true);
    try {
      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses[0]?.emailAddress;

      const tradeResponse = await fetch(`${getApiUrl()}/api/v1/trade/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: allocation,
          email,
          isLiveTrading,
          isSentimentEnabled,
        }),
      });

      const responseData = await tradeResponse.json();

      if (tradeResponse.status === 200) {
        setSuccessMessage(
          `Successfully purchased stocks with $${allocation.toFixed(
            2
          )} allocation!`
        );
        setErrorMessage("");
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      } else {
        setErrorMessage(
          responseData.error ||
            "Error occurred during purchase. Please try again."
        );
      }
    } catch (error) {
      console.error("Error during purchase:", error);
      setErrorMessage("Error occurred during purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) return null;

  const handleDeposit = () => {
    window.open(
      "https://app.alpaca.markets/brokerage/banking?transfer=deposit",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const dollars = Math.floor(allocation);
  const cents = Math.round((allocation - dollars) * 100)
    .toString()
    .padStart(2, "0");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
      {/* Section header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Allocate capital
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Purchase stocks
          </h1>
          <p className="mt-3 text-muted-foreground">
            Choose how much to allocate. Our engine distributes it across the
            signals firing right now.
          </p>
        </div>
        <Settings
          isLiveTrading={isLiveTrading}
          setIsLiveTrading={setIsLiveTrading}
          isPaperTrading={isPaperTrading}
          setIsPaperTrading={setIsPaperTrading}
          isSentimentEnabled={isSentimentEnabled}
          setIsSentimentEnabled={setIsSentimentEnabled}
        />
      </div>

      {/* Big amount display */}
      <div className="mt-12 border-y border-border/40 py-12">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
          Allocation amount
        </p>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-3xl font-medium text-muted-foreground md:text-4xl">
            $
          </span>
          <span className="text-7xl font-semibold tabular-nums tracking-tight md:text-8xl">
            {dollars}
          </span>
          <span className="text-3xl font-medium text-muted-foreground md:text-4xl">
            .{cents}
          </span>
        </div>
      </div>

      {/* Slider */}
      <div className="mt-10">
        <Slider
          value={[allocation]}
          onValueChange={(value: SetStateAction<number>[]) =>
            setAllocation(value[0])
          }
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="mt-3 flex justify-between font-mono text-xs text-muted-foreground">
          <span>$0</span>
          <span>$100</span>
        </div>

        {/* Preset chips */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {PRESETS.map((amt) => {
            const active = allocation === amt;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setAllocation(amt)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 motion-reduce:transition-none",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
                aria-pressed={active}
              >
                ${amt}
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {(successMessage || errorMessage) && (
        <div className="mt-8 space-y-3">
          {successMessage && (
            <Alert variant="default">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          {errorMessage && (
            <Alert variant="default">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <AlertTitle className="text-base">Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </div>
                <Button onClick={handleDeposit} variant="outline" size="sm">
                  Deposit Funds
                </Button>
              </div>
            </Alert>
          )}
        </div>
      )}

      {/* Purchase button */}
      <Button
        size="lg"
        className="mt-10 h-14 w-full text-base"
        onClick={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          "Processing…"
        ) : (
          <>
            Purchase ${allocation.toFixed(2)}
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        {isLiveTrading ? "Live trading mode" : "Paper trading mode"}
        {isSentimentEnabled ? " · Sentiment signals enabled" : ""}
      </p>
    </div>
  );
}
