"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";

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

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem("alpaca_access_token"); // Replace with actual token logic

      if (!token) {
        console.error("No token found");
        return;
      }
      const dashboardData = await fetchDashboardData(token);
      setData(dashboardData);
    };

    loadData();
  }, []);

  if (!data) {
    return (
      <div className="mt-5 flex justify-center">
        Please, check Analysis and Trade pages. Dashboard page load after first
        trade!
      </div>
    );
  }

  return (
    <div>
      <h1>Portfolio Overview</h1>
      <Card>
        <CardHeader>Total Account Value</CardHeader>
        <CardContent>{data.account.portfolio_value}</CardContent>
      </Card>
      <Card>
        <CardHeader>Available Cash</CardHeader>
        <CardContent>{data.account.cash}</CardContent>
      </Card>
      <Card>
        <CardHeader>Open Positions</CardHeader>
        <CardContent>
          {data.positions.map((position) => (
            <div key={position.symbol}>
              <p>Symbol: {position.symbol}</p>
              <p>Quantity: {position.qty}</p>
              <p>Entry Price: {position.avg_entry_price}</p>
              <p>Current Price: {position.current_price}</p>
              <p>Market Value: {position.market_value}</p>
              <p>Unrealized P&L: {position.unrealized_pl}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>Open Orders</CardHeader>
        <CardContent>
          {data.orders.map((order) => (
            <div key={order.id}>
              <p>Symbol: {order.symbol}</p>
              <p>Order Type: {order.orderType}</p>
              <p>Quantity: {order.qty}</p>
              <p>Filled Quantity: {order.filled_qty}</p>
              <p>Status: {order.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
