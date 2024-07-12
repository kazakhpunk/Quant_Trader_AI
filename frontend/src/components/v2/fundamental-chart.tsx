"use client";

import * as React from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

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

// Normalization function
function normalizeData(data: any) {
    const keys = Object.keys(data);
    const values = Object.values(data).filter((val): val is number => typeof val === 'number');

    if (values.length === 0) {
        return keys.map(key => ({ key, value: 0 }));
    }

    const max = Math.max(...values);
    const min = Math.min(...values);

    const normalizedData = keys.map(key => ({
        key,
        value: typeof data[key] === 'number' ? ((data[key] - min) / (max - min)) * 100 : 0
    }));

    return normalizedData;
}

const chartConfig = {
    peRatio: {
        label: "P/E Ratio",
        color: "hsl(var(--chart-1))",
    },
    pegRatio: {
        label: "PEG Ratio",
        color: "hsl(var(--chart-2))",
    },
    dividendYield: {
        label: "Dividend Yield",
        color: "hsl(var(--chart-3))",
    },
    payoutRatio: {
        label: "Payout Ratio",
        color: "hsl(var(--chart-4))",
    },
    revenue: {
        label: "Revenue",
        color: "hsl(var(--chart-5))",
    },
    profitMargin: {
        label: "Profit Margin",
        color: "hsl(var(--chart-6))",
    },
    freeCashFlow: {
        label: "Free Cash Flow",
        color: "hsl(var(--chart-7))",
    },
} satisfies ChartConfig;

export function FundamentalChart({ ticker }: { ticker: string }) {
    const [chartData, setChartData] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedTicker, setSelectedTicker] = React.useState<string>("GOOGL");

    const fetchChartData = async (ticker: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`http://localhost:8000/api/v1/getFundamentalData/${ticker}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Fetched data:", data);

            const normalizedData = normalizeData({
                peRatio: data.financialData.currentPrice / data.defaultKeyStatistics.trailingEps,
                pegRatio: data.defaultKeyStatistics.pegRatio,
                dividendYield: data.summaryDetail.dividendYield,
                payoutRatio: data.summaryDetail.payoutRatio,
                revenue: data.financialData.totalRevenue,
                profitMargin: data.financialData.profitMargins,
                freeCashFlow: data.financialData.freeCashflow,
            });

            console.log("Normalized data:", normalizedData);
            setChartData(normalizedData);
        } catch (error) {
            console.error("Error fetching data:", error);
            setError("Failed to fetch data. Please try again later.");
        } finally {
            setLoading(false);
        }
    }

    React.useEffect(() => {
        fetchChartData(selectedTicker);
    }, [selectedTicker]);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>{error}</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fundamental Data - {ticker}</CardTitle>
                <CardDescription>Normalized fundamental indicators</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart
                        accessibilityLayer
                        data={chartData}
                        layout="vertical"
                        margin={{ left: 0 }}
                    >
                        <YAxis
                            dataKey="key"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label}
                        />
                        <XAxis dataKey="value" type="number" hide />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="value" layout="vertical" radius={5} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                    Showing normalized fundamental indicators
                </div>
            </CardFooter>
        </Card>
    );
}
