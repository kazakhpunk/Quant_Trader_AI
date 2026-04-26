"use client";

import { TradeLogDto } from "@/lib/api/rv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function TradeLogTable({ trades }: { trades: TradeLogDto[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pair</TableHead>
          <TableHead>Entry</TableHead>
          <TableHead>Exit</TableHead>
          <TableHead className="text-right">Entry z</TableHead>
          <TableHead className="text-right">Exit z</TableHead>
          <TableHead className="text-right">Days</TableHead>
          <TableHead className="text-right">P&amp;L</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trades.map((t, i) => (
          <TableRow key={i}>
            <TableCell className="font-mono">{t.pairKey}</TableCell>
            <TableCell>{t.entryDate}</TableCell>
            <TableCell>{t.exitDate}</TableCell>
            <TableCell className="text-right">{t.entryZ.toFixed(2)}</TableCell>
            <TableCell className="text-right">{t.exitZ.toFixed(2)}</TableCell>
            <TableCell className="text-right">{t.holdingDays}</TableCell>
            <TableCell className={`text-right ${t.pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              ${t.pnl.toFixed(0)}
            </TableCell>
            <TableCell><Badge variant="outline">{t.exitReason}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
