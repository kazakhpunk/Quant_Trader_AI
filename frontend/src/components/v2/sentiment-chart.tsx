"use client"

import React, { useEffect, useState } from "react"
import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Combobox } from "./combobox"

const chartConfig = {
  score: {
    label: "Sentiment Score",
  },
} satisfies ChartConfig

export function SentimentChart() {
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL")
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async (ticker: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`http://localhost:8000/api/v1/analyzeSentiment/${ticker}`)
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`)
      }
      const data = await response.json()
      // Sort data by score in descending order
      const sortedData = data.sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      setChartData(sortedData)
    } catch (error: any) {
      setError(`Failed to fetch data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedTicker);
  }, [selectedTicker]);

  if (loading) return <div className="mt-5">Loading...</div>
  if (error) return <div className="mt-5">{error}</div>

  return (
    <Card className="mt-5">
      <CardHeader className="flex items-center gap-5 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
            <CardTitle>Sentiment Analysis - {selectedTicker}</CardTitle>
            <CardDescription>Sentiment scores of recent news articles</CardDescription>
        </div>
        <Combobox onSelectTicker={setSelectedTicker}/>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart layout="vertical" data={chartData} height={400} width={600}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="title" type="category" width={150} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <Bar dataKey="score">
              <LabelList dataKey="score" position="right" />
              {chartData.map((item) => (
                <Cell
                  key={item.title}
                  fill={
                    item.score > 0
                      ? "hsl(var(--chart-1))"
                      : "hsl(var(--chart-2))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Sentiment Analysis for {selectedTicker} <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing sentiment scores of recent news articles
        </div>
      </CardFooter>
    </Card>
  )
}