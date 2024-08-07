/**
 * v0 by Vercel.
 * @see https://v0.dev/t/FF95m9DDDH8
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import path from "path";
import { useState } from "react";

export default function CopyLink() {
  const pathname = usePathname();
  const [clicked, setClicked] = useState(false);

  const getApiUrl = () => {
    return process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://quant-trader-ai-v4.vercel.app/";
  };

  const base = getApiUrl();
  const link = base + pathname;

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setClicked(true);
    setTimeout(() => {
      setClicked(false);
    }, 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full my-4"
          >
            {!clicked && (
              <>
                <ClipboardIcon className="ml-2 h-4 w-4 mr-4" /> Share Link
              </>
            )}
            {clicked && (
              <>
                <CheckmarkIcon className="ml-2 h-4 w-4 mr-4" /> Copied
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy to Clipboard</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ClipboardIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  );
}

function CheckmarkIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
