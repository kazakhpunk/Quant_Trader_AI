"use client";

import { CountryDto } from "@/lib/api/rv";
import { cn } from "@/lib/utils";

function Badge({ children, variant = "secondary" }: { children: React.ReactNode; variant?: "secondary" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "secondary"
          ? "bg-secondary text-secondary-foreground"
          : "border border-border text-muted-foreground"
      )}
    >
      {children}
    </span>
  );
}

export function UniverseTable({ countries }: { countries: CountryDto[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full table-auto">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">ISO</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Country</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Region</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Rating</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">IG/HY</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Tags</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">Debt/GDP</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {countries.map((c) => (
            <tr key={c.iso} className="transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-sm">{c.iso}</td>
              <td className="px-4 py-3 text-sm">{c.name}</td>
              <td className="px-4 py-3 text-sm">{c.region}</td>
              <td className="px-4 py-3 text-sm">{c.rating}</td>
              <td className="px-4 py-3">
                <Badge variant={c.igHy === "IG" ? "secondary" : "outline"}>{c.igHy}</Badge>
              </td>
              <td className="px-4 py-3 space-x-1">
                {c.oilExporter && <Badge variant="outline">Oil</Badge>}
                {c.commodityExporter && <Badge variant="outline">Commodity</Badge>}
              </td>
              <td className="px-4 py-3 text-right text-sm font-mono tabular-nums">{c.debtToGdp}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
