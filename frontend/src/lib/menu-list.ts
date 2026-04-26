import {
  Tag,
  Users,
  Settings,
  Bookmark,
  SquarePen,
  LayoutGrid,
  LucideIcon,
  Brain,
  CandlestickChart,
  Activity,
} from "lucide-react";

import {
  BarChartIcon,
  BellIcon,
  HomeIcon,
  LineChartIcon,
  Package2Icon,
  SearchIcon,
  SendIcon,
  TrendingUpIcon,
  VariableIcon,
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
          label: "Trade",
          active: pathname.includes("/trade"),
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
            // {
            //   href: "/analysis",
            //   label: "Overview",
            //   icon: HomeIcon,
            //   active: pathname === "/analysis"
            // },
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
              active: pathname === "/analysis/new",
            },
            {
              href: "/analysis/fundamental",
              label: "Fundamental Analysis",
              icon: BarChartIcon,
              active: pathname === "/analysis/new",
            },
            {
              href: "/analysis/sentiment",
              label: "Sentiment Analysis",
              icon: SendIcon,
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
