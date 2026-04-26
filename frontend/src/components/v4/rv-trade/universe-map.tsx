"use client";

import { CountryDto } from "@/lib/api/rv";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function featureVector(c: CountryDto): number[] {
  return [
    c.rating / 22,
    c.debtToGdp / 100,
    c.oilExporter ? 1 : 0,
    c.commodityExporter ? 1 : 0,
    c.igHy === "IG" ? 0 : 1,
    c.region === "LatAm" ? 1 : 0,
    c.region === "EMEA"  ? 1 : 0,
    c.region === "Asia"  ? 1 : 0,
    c.region === "MENA"  ? 1 : 0,
  ];
}

// Center features then run 2 iterations of power method on covariance to extract top-2 PCs.
function pca2(vectors: number[][]): { x: number; y: number }[] {
  const n = vectors.length, d = vectors[0].length;
  const mean = new Array(d).fill(0);
  for (const v of vectors) for (let i = 0; i < d; i++) mean[i] += v[i] / n;
  const centered = vectors.map(v => v.map((x, i) => x - mean[i]));
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const v of centered) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) cov[i][j] += v[i] * v[j] / Math.max(n - 1, 1);

  function powerIter(A: number[][], iters = 80): number[] {
    let v = new Array(A.length).fill(0).map(() => Math.random());
    for (let k = 0; k < iters; k++) {
      const w = A.map(row => row.reduce((s, a, i) => s + a * v[i], 0));
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
      v = w.map(x => x / norm);
    }
    return v;
  }
  const pc1 = powerIter(cov);
  const lambda1 = pc1.reduce((s, vi, i) => s + vi * cov[i].reduce((ss, aij, j) => ss + aij * pc1[j], 0), 0);
  const deflated = cov.map((row, i) => row.map((aij, j) => aij - lambda1 * pc1[i] * pc1[j]));
  const pc2 = powerIter(deflated);

  return centered.map(v => ({
    x: v.reduce((s, x, i) => s + x * pc1[i], 0),
    y: v.reduce((s, x, i) => s + x * pc2[i], 0),
  }));
}

const REGION_COLORS: Record<string, string> = {
  LatAm: "#ef4444", EMEA: "#3b82f6", Asia: "#22c55e", MENA: "#eab308",
};

export function UniverseMap({ countries }: { countries: CountryDto[] }) {
  if (!countries.length) {
    return (
      <div className="h-[420px] w-full flex items-center justify-center text-muted-foreground text-sm">
        No countries to display
      </div>
    );
  }

  const coords = pca2(countries.map(featureVector));
  const data = countries.map((c, i) => ({ ...coords[i], iso: c.iso, name: c.name, region: c.region }));

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" type="number" name="PC1" tickFormatter={() => ""} />
          <YAxis dataKey="y" type="number" name="PC2" tickFormatter={() => ""} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(v: unknown) => typeof v === "number" ? v.toFixed(2) : v}
            labelFormatter={() => ""}
            content={({ payload }) => {
              if (!payload || payload.length === 0) return null;
              const p = payload[0].payload as { iso: string; name: string; region: string };
              return (
                <div className="rounded-md border bg-background px-2 py-1 text-xs shadow">
                  <div className="font-semibold">{p.iso} — {p.name}</div>
                  <div className="text-muted-foreground">{p.region}</div>
                </div>
              );
            }}
          />
          <Scatter data={data}>
            {data.map((d, i) => <Cell key={i} fill={REGION_COLORS[d.region] || "#888"} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
