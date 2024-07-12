"use client"
import * as React from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Line, LineChart } from "recharts"
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
import { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent' 

const chartConfig = {
    rsi14: {
      label: "rsi14",
      color: "hsl(var(--chart-4))",
    },
    sma20: {
      label: "sma20",
      color: "hsl(var(--chart-2))",
    },
    ema20: {
      label: "ema20",
      color: "hsl(var(--chart-2))",
    },
    sma50: {
        label: "sma50",
        color: "hsl(var(--chart-1))",
      },
    ema50: {
        label: "ema50",
        color: "hsl(var(--chart-1))",
      },
  } satisfies ChartConfig

export default function TechnicalCharts() {
    const [timeRange, setTimeRange] = React.useState("30d")
    const [selectedTicker, setSelectedTicker] = React.useState<string>("AAPL")
    const [smaData, setSmaData] = React.useState<any[]>([])
    const [emaData, setEmaData] = React.useState<any[]>([])
    const [rsiData, setRsiData] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const fetchSMAData = async (ticker: string, timeRange: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`https://quanttraderai-production.up.railway.app/api/v1/getIntervalSMAData?ticker=${ticker}&scale=${timeRange}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`)
        }
        const result = await response.json();
        console.log(result.smaData);
        setSmaData(result.smaData);
      } catch (error) {
        console.error("Error fetching SMA data:", error)
        setError("Failed to fetch data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    const fetchEMAData = async (ticker: string, timeRange: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`https://quanttraderai-production.up.railway.app/api/v1/getIntervalEMAData?ticker=${ticker}&scale=${timeRange}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`)
        }
        const result = await response.json()
        console.log(result.emaData);
        setEmaData(result.emaData)
      } catch (error) {
        console.error("Error fetching EMA data:", error)
        setError("Failed to fetch data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    const fetchRSIData = async (ticker: string, timeRange: string) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`https://quanttraderai-production.up.railway.app/api/v1/getIntervalRSIData?ticker=${ticker}&scale=${timeRange}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`)
        }
        const result = await response.json()
        console.log(result.rsiData);
        setRsiData(result.rsiData)
      } catch (error) {
        console.error("Error fetching RSI data:", error)
        setError("Failed to fetch data. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    React.useEffect(() => {
      fetchSMAData(selectedTicker, timeRange);
      fetchEMAData(selectedTicker, timeRange);
      fetchRSIData(selectedTicker, timeRange);
    }, [selectedTicker, timeRange])

      const getDomain = (data: any[], keys: string[]) => {
        if (!data.length) return [0, 100]; // Default range if no data
        
        const allValues = data.flatMap(item => 
          keys.map(key => item[key]).filter(val => val !== null && val !== undefined)
        );
        
        if (allValues.length === 0) return [0, 100]; // Default range if no valid values
        
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const buffer = (max - min) * 0.1; // 10% padding
        
        return [
          roundDownToNearestFive(min - buffer), 
          roundUpToNearestFive(max + buffer)
        ];
      };
      
      const roundDownToNearestFive = (num: number) => Math.floor(num / 5) * 5;
      const roundUpToNearestFive = (num: number) => Math.ceil(num / 5) * 5;
      
      const smaDomain = getDomain(smaData, ['sma20', 'sma50']);
      const emaDomain = getDomain(emaData, ['ema20', 'ema50']);
      const rsiDomain = getDomain(rsiData, ['rsi14']);

    console.log('SMA Domain:', smaDomain);
    console.log('EMA Domain:', emaDomain);
    console.log('RSI Domain:', rsiDomain);

    const getDescription = (timeRange: any) => {
      switch (timeRange) {
        case "3mo":
          return "Showing Technical Indicators for the last 3 months";
        case "30d":
          return "Showing Technical Indicators for the last 30 days";
        case "7d":
          return "Showing Technical Indicators for the last 7 days";
        default:
          return "Showing Technical Indicators";
      }
    }

    const latestPrice = smaData.length > 0 ? smaData[smaData.length - 1].close : null;

    return (
      <div>
        <Card className="mt-5">
          <CardHeader className="flex items-center gap-5 space-y-0 border-b py-5 sm:flex-row">
            <div className="grid flex-1 gap-1 text-center sm:text-left">
              <CardTitle className="text-2xl">{selectedTicker} {latestPrice ? `$${latestPrice.toFixed(2)}` : ""}</CardTitle>
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
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6 space-y-6">
            <ResponsiveContainer width="100%" height={200}>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[200px] w-full"
              >
                <AreaChart data={smaData}>
                  <defs>
                    <linearGradient id="fillSMA" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-sma20)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-sma20)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillSMA50" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-sma50)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-sma50)"
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
                    domain={smaDomain}
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
                    dataKey="sma20"
                    fill="url(#fillSMA)"
                    type="linear"
                    fillOpacity={0.4}
                    stroke="var(--color-sma20)"
                    stackId="a"
                  />
                  <Area
                    dataKey="sma50"
                    fill="url(#fillSMA50)"
                    type="linear"
                    fillOpacity={0.4}
                    stroke="var(--color-sma50)"
                    stackId="b"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[200px] w-full"
              >
                <AreaChart data={emaData}>
                  <defs>
                    <linearGradient id="fillEMA" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-ema20)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-ema20)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                    <linearGradient id="fillEMA50" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-ema50)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-ema50)"
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
                    domain={emaDomain}
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
                    dataKey="ema20"
                    fill="url(#fillEMA)"
                    type="linear"
                    fillOpacity={0.4}
                    stroke="var(--color-ema20)"
                    stackId="a"
                  />
                  <Area
                    dataKey="ema50"
                    fill="url(#fillEMA50)"
                    type="linear"
                    fillOpacity={0.4}
                    stroke="var(--color-ema50)"
                    stackId="b"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[200px] w-full"
              >
                <AreaChart data={rsiData}>
                <defs>
                    <linearGradient id="fillRSI14" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-rsi14)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-rsi14)"
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
                    domain={rsiDomain}
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
                    dataKey="rsi14"
                    fill="url(#fillRSI14)"
                    type="linear"
                    fillOpacity={0.4}
                    stroke="var(--color-rsi14)"
                    stackId="a"
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    )
}
