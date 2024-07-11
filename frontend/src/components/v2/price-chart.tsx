"use client"
import * as React from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from "./combobox"

const initialData: any[] = [];
const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  close: {
    label: "USD",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export default function PriceChart() {
    const [timeRange, setTimeRange] = React.useState("30d")
    const [chartData, setChartData] = React.useState(initialData)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const [selectedTicker, setSelectedTicker] = React.useState<string>("AAPL")
  
    const fetchChartData = async (ticker: string, timeRange: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`http://localhost:8000/api/v1/fetchIntervalHistoricalData?ticker=${ticker}&scale=${timeRange}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`)
        }
        const result = await response.json()
        setChartData(result.data)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to fetch data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }
  
    React.useEffect(() => {
      fetchChartData(selectedTicker, timeRange);
    }, [selectedTicker, timeRange])

    const roundDownToNearestTen = (num: number) => {
        return Math.floor(num / 10) * 10;
      }
    
      const roundUpToNearestTen = (num: number) => {
        return Math.ceil(num / 10) * 10;
      }
    
      const getDomain = (data: any[]) => {
        if (!data.length) return [0, 0];
        const prices = data.map(item => item.close);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const buffer = (max - min) * 0.1; // 10% padding
        return [roundDownToNearestTen(min - buffer), roundUpToNearestTen(max + buffer)];
      };
    
    const domain = getDomain(chartData);

    const getDescription = (timeRange: any) => {
        switch (timeRange) {
          case "3mo":
            return "Showing Price Changes for the last 3 months";
          case "30d":
            return "Showing Price Changes for the last 30 days";
          case "7d":
            return "Showing Price Changes for the last 7 days";
          default:
            return "Showing Price Changes";
        }
      }

    const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].close : null;

//   const filteredData = chartData.filter((item) => {
//     const date = new Date(item.date)
//     const now = new Date()
//     // let daysToSubtract = 90
//     fetchChartData("3mo");
//     if (timeRange === "30d") {
//     //   daysToSubtract = 30
//       fetchChartData("30d");
//     } else if (timeRange === "7d") {
//     //   daysToSubtract = 7
//       fetchChartData("7d");
//     }
//     // now.setDate(now.getDate() - daysToSubtract)
//     // return date >= now
//   })

  return (
    <Card className="mt-8">
      <CardHeader className="flex items-center gap-5 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>{selectedTicker} {latestPrice ? `$${latestPrice.toFixed(2)}` : ""}</CardTitle>
          <CardDescription>
            {getDescription(timeRange)}
          </CardDescription>
        </div>
        <Combobox onSelectTicker={setSelectedTicker}/>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Last 3 months"/>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="3mo" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ResponsiveContainer width="100%" height={250}>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-desktop)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-mobile)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false}/>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string | number | Date) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis 
                    domain={domain} 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    tickCount={3} 
                    allowDataOverflow={true}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value: string | number | Date) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="close"
              fill="url(#fillMobile)"
              type="linear"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            {/* <Area
              dataKey="desktop"
              fill="url(#fillDesktop)"
              type="linear"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            /> */}
            {/* <ChartLegend content={<ChartLegendContent />} /> */}
          </AreaChart>
        </ChartContainer>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
