import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export function Settings({
  isLiveTrading,
  setIsLiveTrading,
  isPaperTrading,
  setIsPaperTrading,
  isSentimentEnabled,
  setIsSentimentEnabled,
}: any) {
  const [high, setHigh] = useState(false);
  const [low, setLow] = useState(true);

  function handleLiveChange(checked: any) {
    setIsLiveTrading(checked);
    if (checked) {
      setIsPaperTrading(false);
    } else {
      setIsPaperTrading(true);
    }
  }

  function handlePaperChange(checked: any) {
    setIsPaperTrading(checked);
    if (checked) {
      setIsLiveTrading(false);
    } else {
      setIsLiveTrading(true);
    }
  }

  function handleHighChange(checked: any) {
    setHigh(checked);
    if (checked) {
      setLow(false);
    } else {
      setLow(true);
    }
  }

  function handleLowChange(checked: any) {
    setLow(checked);
    if (checked) {
      setHigh(false);
    } else {
      setHigh(true);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="m-6">
          Advanced Settings
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Settings</SheetTitle>
          <SheetDescription className="text-left">
            Make changes to set trading indicators. Highly recommended to always
            use at least Technical Analysis. Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <Separator className="mb-4 mt-6" />
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch
              id="live"
              checked={isLiveTrading}
              onCheckedChange={handleLiveChange}
            />
            <Label htmlFor="live">Live Trading</Label>
          </div>
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch
              id="paper"
              checked={isPaperTrading}
              onCheckedChange={handlePaperChange}
            />
            <Label htmlFor="paper">Paper Trading</Label>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch id="technical" defaultChecked disabled />
            <Label htmlFor="technical">Technical Analysis</Label>
          </div>
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch id="fundamental" defaultChecked disabled />
            <Label htmlFor="fundamental">Fundamental Analysis</Label>
          </div>
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch
              id="sentiment"
              checked={isSentimentEnabled}
              onCheckedChange={setIsSentimentEnabled}
            />
            <Label htmlFor="sentiment">Sentiment Analysis</Label>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch
              id="highRisk"
              checked={high}
              onCheckedChange={handleHighChange}
            />
            <Label htmlFor="sentiment">High Risk</Label>
          </div>
          <div className="flex items-center space-x-2 justify-between pr-6">
            <Switch
              id="lowRisk"
              checked={low}
              onCheckedChange={handleLowChange}
            />
            <Label htmlFor="sentiment">Low Risk</Label>
          </div>
        </div>
        <Separator className="my-4" />
        <SheetFooter>
          <SheetClose asChild>
            <Button type="submit" className="max-w-screen w-full mr-6 mt-4">
              Save changes
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
