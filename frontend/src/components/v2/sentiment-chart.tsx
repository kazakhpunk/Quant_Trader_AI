"use client";

import React, { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Combobox } from "./combobox";
import { getApiUrl } from "@/lib/utils";
import { Button } from "../ui/button";
import Link from "next/link";

const chartConfig = {
  score: {
    label: "Sentiment Score",
  },
} satisfies ChartConfig;

const truncateText = (text: string, maxWords: number) => {
  const words = text.split(" ");
  if (words.length > maxWords) {
    return words.slice(0, maxWords).join(" ") + "...";
  }
  return text;
};

export function SentimentChart() {
  const [selectedTicker, setSelectedTicker] = useState<string>("AAPL");
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/analyzeSentiment/${ticker}`
      );
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const data = await response.json();
      // Sort data by score in descending order
      const sortedData = data.sort(
        (a: { score: number }, b: { score: number }) => b.score - a.score
      );
      setChartData(sortedData);
    } catch (error: any) {
      setError(`Failed to fetch data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedTicker);
  }, [selectedTicker]);

  if (loading) return <div className="mt-5">Loading...</div>;
  if (error) return <div className="mt-5">{error}</div>;

  const isMobile = window.innerWidth < 640;
  const wordLimit = isMobile ? 3 : 5;

  return (
    <Card className="mt-5">
      <CardHeader className="flex items-center gap-5 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Sentiment Analysis - {selectedTicker}</CardTitle>
          <CardDescription>
            Sentiment scores of recent news articles
          </CardDescription>
        </div>
        <Combobox onSelectTicker={setSelectedTicker} />
        <Button
          variant="outline"
          className="w-[160px] h-[36px] justify-center rounded-lg"
          asChild
        >
          <Link href="/trade">Buy Stock</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-full">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart layout="vertical" data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis
                dataKey="title"
                type="category"
                width={150}
                tickFormatter={(value) => truncateText(value, wordLimit)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
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
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Sentiment Analysis for {selectedTicker}{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing sentiment scores of recent news articles
        </div>
      </CardFooter>
    </Card>
  );
}
