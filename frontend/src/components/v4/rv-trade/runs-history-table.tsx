"use client";

import Link from "next/link";
import { BacktestRunDto } from "@/lib/api/rv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function RunsHistoryTable({ runs }: { runs: BacktestRunDto[] }) {
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">No saved runs yet.</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Range</TableHead>
          <TableHead className="text-right">Entry z</TableHead>
          <TableHead className="text-right">Cost bps</TableHead>
          <TableHead className="text-right">Sharpe</TableHead>
          <TableHead className="text-right">Trades</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map(r => (
          <TableRow key={r._id}>
            <TableCell>{r.ts.slice(0, 16).replace("T", " ")}</TableCell>
            <TableCell>{r.config.startDate} → {r.config.endDate}</TableCell>
            <TableCell className="text-right">{r.config.rules.entryZ.toFixed(1)}</TableCell>
            <TableCell className="text-right">{r.config.rules.costBpsRoundTrip}</TableCell>
            <TableCell className="text-right font-semibold">{r.metrics.sharpe.toFixed(2)}</TableCell>
            <TableCell className="text-right">{r.metrics.numTrades}</TableCell>
            <TableCell><Link className="text-primary underline" href={`/rv-trade/runs/${r._id}`}>open</Link></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
