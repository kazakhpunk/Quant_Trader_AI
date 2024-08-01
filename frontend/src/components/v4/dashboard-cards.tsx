"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { FaDollarSign, FaChartLine, FaExchangeAlt } from "react-icons/fa";
import { CircularProgress } from "@mui/material";
import Link from "next/link";

interface AccountData {
  portfolio_value: number;
  cash: number;
  // Add other relevant fields from the account object
}

interface PositionData {
  symbol: string;
  qty: number;
  avg_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pl: number;
  // Add other relevant fields from the position object
}

interface OrderData {
  id: string;
  symbol: string;
  orderType: string;
  qty: number;
  filled_qty: number;
  status: string;
  // Add other relevant fields from the order object
}

interface DashboardData {
  account: AccountData;
  positions: PositionData[];
  orders: OrderData[];
}

const getApiUrl = () => {
  return process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://quanttraderai-production.up.railway.app";
};

const fetchDashboardData = async (
  token: string
): Promise<DashboardData | null> => {
  try {
    const response = await fetch(`${getApiUrl()}/api/v4/dashboard-data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isLive: false,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard data");
    }

    const data = await response.json();
    console.log("Dashboard data:", data);
    return data;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return null;
  }
};

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("alpaca_access_token");
      if (!token) {
        console.error("No token found");
        setLoading(false);
        return;
      }
      const dashboardData = await fetchDashboardData(token);
      setData(dashboardData);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center min-h-screen mt-8 text-lg">
        {" "}
        Please check our&nbsp;
        <Link href="/trade">
          <span className="text-blue-500 underline">Trading</span>
        </Link>
        &nbsp;page. Dashboard will load after first trade!
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 2,
    }).format(value / 100);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <Card className="shadow-md w-full">
          <CardHeader className="flex items-center">
            <FaDollarSign className="mr-2" />
            <span className="font-bold">Total Account Value</span>
          </CardHeader>
          <CardContent className="text-2xl font-semibold pl-16">
            {formatCurrency(data.account.portfolio_value)}
          </CardContent>
        </Card>
        <Card className="shadow-md w-full">
          <CardHeader className="flex items-center">
            <FaDollarSign className="mr-2" />
            <span className="font-bold">Available Cash</span>
          </CardHeader>
          <CardContent className="text-2xl font-semibold pl-16">
            {formatCurrency(data.account.cash)}
          </CardContent>
        </Card>
        <Card className="shadow-md col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader className="flex items-center">
            <FaChartLine className="mr-2" />
            <span className="font-bold">Open Positions</span>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full ml-8">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 py-2">Symbol</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Entry Price</th>
                    <th className="px-4 py-2">Current Price</th>
                    <th className="px-4 py-2">Market Value</th>
                    <th className="px-4 py-2">Total P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {data.positions.map((position) => (
                    <tr key={position.symbol}>
                      <td className="px-4 py-2">{position.symbol}</td>
                      <td className="px-4 py-2">{position.qty}</td>
                      <td className="px-4 py-2">
                        {formatCurrency(position.avg_entry_price)}
                      </td>
                      <td className="px-4 py-2">
                        {formatCurrency(position.current_price)}
                      </td>
                      <td className="px-4 py-2">
                        {formatCurrency(position.market_value)}
                      </td>
                      <td
                        className={`px-4 py-2 font-mono ${
                          position.unrealized_pl >= 0
                            ? "text-green-600"
                            : "text-red-600 relative"
                        }`}
                      >
                        <div
                          className={`${
                            position.unrealized_pl < 0 &&
                            "absolute -left-2 px-4 py-2 top-0"
                          }`}
                        >
                          {formatCurrency(position.unrealized_pl)} (
                          {formatPercentage(
                            position.unrealized_pl / position.market_value
                          )}
                          )
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        {data.orders && (
          <Card className="shadow-md col-span-1 md:col-span-2 lg:col-span-3">
            <CardHeader className="flex items-center">
              <FaExchangeAlt className="mr-2" />
              <span className="font-bold">Open Orders</span>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full ml-8">
                  <thead>
                    <tr className="text-left">
                      <th className="px-4 py-2">Symbol</th>
                      <th className="px-4 py-2">Order Type</th>
                      <th className="px-4 py-2">Quantity</th>
                      <th className="px-4 py-2">Filled Quantity</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-2">{order.symbol}</td>
                        <td className="px-4 py-2">buy</td>
                        <td className="px-4 py-2">{order.qty}</td>
                        <td className="px-4 py-2">{order.filled_qty}</td>
                        <td className="px-4 py-2">{order.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
