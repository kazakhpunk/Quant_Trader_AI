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

export function Settings({
  isLiveTrading,
  setIsLiveTrading,
  isPaperTrading,
  setIsPaperTrading,
  isSentimentEnabled,
  setIsSentimentEnabled,
}: any) {
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
        </div>
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
