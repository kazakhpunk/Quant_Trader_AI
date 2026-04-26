"use client";

import { PairDto } from "@/lib/api/rv";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";

export function PairTable({ pairs }: { pairs: PairDto[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "rejected">("all");
  const filtered = useMemo(
    () => filter === "all" ? pairs : pairs.filter(p => p.status === filter),
    [pairs, filter],
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        {(["all", "active", "rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-md border px-3 py-1 ${filter === f ? "bg-primary text-primary-foreground" : ""}`}>
            {f}
          </button>
        ))}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Coint p</TableHead>
            <TableHead className="text-right">Corr</TableHead>
            <TableHead className="text-right">Half-life</TableHead>
            <TableHead className="text-right">β</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reject reason</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map(p => (
            <TableRow key={`${p.a.iso}-${p.b.iso}`}>
              <TableCell className="font-mono">{p.a.iso}-{p.b.iso}</TableCell>
              <TableCell>{p.category}</TableCell>
              <TableCell className="text-right">{p.cointPValue?.toFixed(3) ?? "—"}</TableCell>
              <TableCell className="text-right">{p.correlation?.toFixed(2) ?? "—"}</TableCell>
              <TableCell className="text-right">{p.halfLife != null ? p.halfLife.toFixed(1) : "—"}</TableCell>
              <TableCell className="text-right">{p.beta?.toFixed(2) ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={p.status === "active" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">{p.rejectReason ?? ""}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
