"use client"

import * as React from "react";
import { Combobox } from "./combobox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

interface IndicatorCardProps {
  title: string;
  value: number;
}

const formatValue = (title: string, value: number) => {
    switch (title) {
      case 'PE Ratio':
      case 'PEG Ratio':
        return value.toFixed(2);
      case 'Dividend Yield':
      case 'Payout Ratio':
      case 'Profit Margin':
        return (value * 100).toFixed(2) + '%';
      case 'Revenue':
      case 'Free Cash Flow':
        return `$${value.toLocaleString()}`;
      default:
        return value;
    }
  };
  
  const IndicatorCard: React.FC<IndicatorCardProps> = ({ title, value }) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{formatValue(title, value)}</p>
        </CardContent>
      </Card>
    );
  };

export default function FundamentalAnalysis() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = React.useState<string>("AAPL");
  const [analysisData, setAnalysisData] = React.useState<any>(null);

  const fetchFundData = async (ticker: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://quanttraderai-production.up.railway.app/api/v1/postFundamentalData/${ticker}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      const result = await response.json();
      setAnalysisData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFundData(selectedTicker);
  }, [selectedTicker]);

  return (
        <Card className="mt-5">
            <CardHeader className="flex items-center gap-5 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle className="text-2xl">Fundamental Analysis - {selectedTicker}</CardTitle>
                    <CardDescription>Company&#39;s financial health</CardDescription>
                </div>
                <Combobox onSelectTicker={setSelectedTicker}/>
            </CardHeader>
            <CardContent className="mt-6">
                {analysisData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <IndicatorCard title="PE Ratio" value={analysisData.peRatio} />
                    <IndicatorCard title="PEG Ratio" value={analysisData.pegRatio} />
                    <IndicatorCard title="Dividend Yield" value={analysisData.dividendYield} />
                    <IndicatorCard title="Payout Ratio" value={analysisData.payoutRatio} />
                    <IndicatorCard title="Revenue" value={analysisData.revenue} />
                    <IndicatorCard title="Profit Margin" value={analysisData.profitMargin} />
                    <IndicatorCard title="Free Cash Flow" value={analysisData.freeCashFlow} />
                    </div>
                )}
            </CardContent>
        </Card>
  );
}
