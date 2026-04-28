import {
  LayoutGrid,
  LucideIcon,
  Brain,
  CandlestickChart,
  Activity,
  Landmark,
  Newspaper,
} from "lucide-react";

import {
  BarChartIcon,
  LineChartIcon,
  TrendingUpIcon,
} from "@/components/admin-panel/icons";

type Submenu = {
  href: string;
  label: string;
  active: boolean;
  icon?: any;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
  submenus: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function getMenuList(pathname: string): Group[] {
  return [
    {
      groupLabel: "",
      menus: [
        {
          href: "/dashboard",
          label: "Dashboard",
          active: pathname.includes("/dashboard"),
          icon: LayoutGrid,
          submenus: [],
        },
        {
          href: "/trade",
          label: "Equity Trade",
          active: pathname === "/trade" || pathname.startsWith("/trade/"),
          icon: CandlestickChart,
          submenus: [],
        },
        {
          href: "/rv-trade",
          label: "RV Trade",
          active: pathname.startsWith("/rv-trade"),
          icon: Activity,
          submenus: [
            { href: "/rv-trade",          label: "Universe",  active: pathname === "/rv-trade" },
            { href: "/rv-trade/pairs",    label: "Pairs",     active: pathname === "/rv-trade/pairs" },
            { href: "/rv-trade/signals",  label: "Signals",   active: pathname === "/rv-trade/signals" },
            { href: "/rv-trade/backtest", label: "Backtest",  active: pathname.startsWith("/rv-trade/backtest") },
          ],
        },
      ],
    },
    {
      groupLabel: "Advanced tools",
      menus: [
        {
          href: "",
          label: "Analysis",
          active: pathname.includes("/analysis"),
          icon: Brain,
          submenus: [
            {
              href: "/analysis/ratings",
              label: "Ratings",
              icon: BarChartIcon,
              active: pathname === "/analysis/ratings",
            },
            {
              href: "/analysis/price",
              label: "Price Changes",
              icon: LineChartIcon,
              active: pathname === "/analysis/price",
            },
            {
              href: "/analysis/technical",
              label: "Technical Analysis",
              icon: TrendingUpIcon,
              active: pathname === "/analysis/technical",
            },
            {
              href: "/analysis/fundamental",
              label: "Fundamental Analysis",
              icon: Landmark,
              active: pathname === "/analysis/fundamental",
            },
            {
              href: "/analysis/sentiment",
              label: "Sentiment Analysis",
              icon: Newspaper,
              active: pathname === "/analysis/sentiment",
            },
            // {
            //   href: "/analysis/volatility",
            //   label: "Volatility Analysis",
            //   icon: VariableIcon,
            //   active: pathname === "/analysis/volatility"
            // }
          ],
        },
      ],
    },
    // {
    //   groupLabel: "Settings",
    //   menus: [
    //     {
    //       href: "/account",
    //       label: "Account",
    //       active: pathname.includes("/account"),
    //       icon: Settings,
    //       submenus: [],
    //     },
    //   ],
    // },
  ];
}
