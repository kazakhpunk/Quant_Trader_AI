"use client";

import { SetStateAction, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { useUser } from "@clerk/nextjs";

export function TradePanel() {
  const [showPanel, setPanel] = useState(true);
  const [allocation, setAllocation] = useState(50);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useUser();

  const handlePurchase = async () => {
    if (!user) {
      console.error('User not logged in');
      return;
    }

    setLoading(true);
    try {
      const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress;

      const tradeResponse = await fetch(`https://quanttraderai-production.up.railway.app/api/v1/trade/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: allocation, email })
      });

      const responseData = await tradeResponse.json();

      if (tradeResponse.status === 200) {
        setSuccessMessage(`Successfully purchased stocks with $${allocation.toFixed(2)} allocation!`);
        setTimeout(() => {
          setPanel(false);
          setSuccessMessage("");
        }, 3000); // Hide panel and clear message after 3 seconds
      } else {
        setErrorMessage(responseData.error || "Error occurred during purchase. Please try again.");
      }
    } catch (error) {
      console.error('Error during purchase:', error);
      setErrorMessage("Error occurred during purchase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!showPanel) return null;

  const handleDeposit = () => {
    window.open("https://app.alpaca.markets/brokerage/banking?transfer=deposit", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex justify-center items-center w-full mt-20">
      <Card className="w-full max-w-2xl mt-2 ml-6">
        <CardHeader className="grid gap-2">
          <CardTitle>Purchase Stocks</CardTitle>
          <CardDescription>
            Use the slider to select the amount you want to allocate for your stock purchase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
          {successMessage && (
              <Alert variant="default">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            {errorMessage && (
              <Alert variant="default">
                <div className="flex items-start justify-between">
                  <div className="p-1">
                    <AlertTitle className="text-lg">Error</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </div>
                  <div className="text-md mt-2">
                    <Button
                      onClick={handleDeposit}>
                      Deposit Funds
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
            <Slider 
              value={[allocation]} 
              onValueChange={(value: SetStateAction<number>[]) => setAllocation(value[0])}  
              min={0} 
              max={100} 
              step={1} 
              className="w-full" 
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Allocation Amount</span>
              <span className="font-medium">${allocation.toFixed(2)}</span>
            </div>
            <Button className="w-full" onClick={handlePurchase} disabled={loading}>
              {loading ? 'Processing...' : 'Purchase'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
