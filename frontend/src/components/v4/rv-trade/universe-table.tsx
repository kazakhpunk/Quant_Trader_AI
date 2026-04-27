"use client";

import { AssetDto } from "@/lib/api/rv";
import { cn } from "@/lib/utils";

function Badge({
  children,
  variant = "secondary",
}: {
  children: React.ReactNode;
  variant?: "secondary" | "outline";
}) {
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

const SOURCE_LABEL: Record<AssetDto["source"], string> = {
  fred: "FRED",
  yahoo: "Yahoo",
};

export function UniverseTable({ countries }: { countries: AssetDto[] }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <table className="w-full min-w-[480px] table-auto">
        <thead className="bg-muted/30">
          <tr className="text-left">
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Name</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Category</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Tags</th>
            <th className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {countries.map((c) => (
            <tr key={c.iso} className="transition-colors hover:bg-muted/30">
              <td className="px-4 py-3 text-sm">
                <div>{c.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.iso}
                </div>
              </td>
              <td className="px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground">
                {c.category}
              </td>
              <td className="px-4 py-3 space-x-1">
                {c.region && <Badge variant="outline">{c.region}</Badge>}
                {c.igHy && <Badge variant={c.igHy === "IG" ? "secondary" : "outline"}>{c.igHy}</Badge>}
              </td>
              <td className="px-4 py-3">
                <Badge variant={c.source === "fred" ? "secondary" : "outline"}>
                  {SOURCE_LABEL[c.source]}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
