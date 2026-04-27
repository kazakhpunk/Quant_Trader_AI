"use client";

import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CopyLink({ isOpen }: { isOpen?: boolean }) {
  const pathname = usePathname();
  const [clicked, setClicked] = useState(false);
  const isCollapsed = isOpen === false;

  const base =
    process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://quant-trader-ai-v4.vercel.app";
  const link = base + pathname;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setClicked(true);
    setTimeout(() => setClicked(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={handleCopy}
            className={cn(
              "w-full gap-3 font-medium",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            {clicked ? (
              <>
                <Check className="h-4 w-4" />
                {!isCollapsed && <span>Copied</span>}
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                {!isCollapsed && <span>Share link</span>}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy current page URL</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
