/**
 * v0 by Vercel.
 * @see https://v0.dev/t/6VfUZrvuS0R
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  BarChartIcon,
  CandlestickChart,
  LayoutGrid,
  SendIcon,
  TrendingUpIcon,
} from "lucide-react";

export default function Guide() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full">
          <GuideIcon className="ml-2 h-4 w-4 mr-4" /> How to Use
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-screen max-w-sm md:max-w-md lg:max-w-lg p-6 m-5">
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-lg font-medium">Getting Started</h3>
            <div className="grid grid-cols-[30px_1fr] items-start gap-4">
              <LayoutGrid className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Navigate the Dashboard</p>
                <p className="text-muted-foreground">
                  After first trade, you can access open stock positions.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-lg font-medium">Trading</h3>
            <div className="grid grid-cols-[30px_1fr] items-start gap-4">
              <CandlestickChart className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Make a Trade</p>
                <p className="text-muted-foreground">
                  Allocate sum and click trade to make transactions.
                </p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-lg font-medium">Analysis</h3>
            <div className="grid grid-cols-[30px_1fr] items-start gap-4">
              <TrendingUpIcon className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Technical Analysis</p>
                <p className="text-muted-foreground">
                  Analyzing past prices and volumes to predict future movements.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[30px_1fr] items-start gap-4">
              <BarChartIcon className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Fundamental Analysiss</p>
                <p className="text-muted-foreground">
                  Evaluating a company's financial health to determine intrinsic
                  value.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[30px_1fr] items-start gap-4">
              <SendIcon className="h-6 w-6 text-primary" />
              <div>
                <p className="font-medium">Sentiment Analysis</p>
                <p className="text-muted-foreground">
                  Assessing market mood through news and social media.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CirclePlusIcon(props: any) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
  );
}

function CompassIcon(props: any) {
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
      <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function FilePenIcon(props: any) {
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
      <path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v10" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z" />
    </svg>
  );
}

function ShareIcon(props: any) {
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
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function UsersIcon(props: any) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function GuideIcon(props: any) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
