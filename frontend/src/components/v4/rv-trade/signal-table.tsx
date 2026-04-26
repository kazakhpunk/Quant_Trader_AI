"use client";

import { SignalDto } from "@/lib/api/rv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function SignalTable({ signals }: { signals: SignalDto[] }) {
  const sorted = [...signals].sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pair</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Residual</TableHead>
          <TableHead className="text-right">z</TableHead>
          <TableHead className="text-right">Δ5d</TableHead>
          <TableHead className="text-right">Half-life</TableHead>
          <TableHead className="text-right">β (Kalman)</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map(s => (
          <TableRow key={s.pairKey}>
            <TableCell className="font-mono">{s.a}-{s.b}</TableCell>
            <TableCell>{s.category}</TableCell>
            <TableCell className="text-right">{s.residual.toFixed(2)}</TableCell>
            <TableCell className={`text-right font-semibold ${Math.abs(s.z) >= 2 ? "text-foreground" : "text-muted-foreground"}`}>
              {s.z.toFixed(2)}
            </TableCell>
            <TableCell className="text-right">{s.delta5d.toFixed(2)}</TableCell>
            <TableCell className="text-right">{s.halfLife.toFixed(1)}</TableCell>
            <TableCell className="text-right">{s.beta.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={s.status === "tradeable" ? "default" : "destructive"}>
                {s.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
