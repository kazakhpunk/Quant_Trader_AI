"use client";

import { useEffect, useState } from "react";
import { AssetDto, AssetCategory, SeriesStatsDto, rvApi } from "@/lib/api/rv";
import { Loader } from "@/components/v4/loader";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/** Build a per-asset feature vector from market-stat fields. Each asset gets
 *  a unique position because the inputs are real numbers (mean spread, vol,
 *  recent return, autocorrelation), not categorical labels.  Assets without
 *  stats are dropped from the map. */
function featureVector(c: AssetDto): number[] | null {
  const s = c.stats;
  if (!s) return null;
  // Log-scale `mean` because spread levels span ~50bp (HG) to ~700bp (B&Lower)
  // and ETF prices are ~$30-$120 — log keeps both readable on the same axis.
  return [
    Math.log(Math.max(s.mean, 1e-3)),
    Math.log(Math.max(s.vol, 1e-6)),
    s.ret30d,
    s.autocorr1,
  ];
}

/** Standardize each feature column to z-scores so PCA isn't dominated by the
 *  largest-magnitude column. */
function standardize(vectors: number[][]): number[][] {
  const n = vectors.length;
  const d = vectors[0]?.length ?? 0;
  if (!n || !d) return vectors;
  const mean = new Array(d).fill(0);
  for (const v of vectors) for (let i = 0; i < d; i++) mean[i] += v[i] / n;
  const sd = new Array(d).fill(0);
  for (const v of vectors)
    for (let i = 0; i < d; i++) sd[i] += (v[i] - mean[i]) ** 2 / Math.max(n - 1, 1);
  for (let i = 0; i < d; i++) sd[i] = Math.sqrt(sd[i]) || 1;
  return vectors.map((v) => v.map((x, i) => (x - mean[i]) / sd[i]));
}

function pca2(vectors: number[][]): { x: number; y: number }[] {
  const n = vectors.length;
  const d = vectors[0]?.length ?? 0;
  if (!n || !d) return [];
  const centered = standardize(vectors);
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (const v of centered)
    for (let i = 0; i < d; i++)
      for (let j = 0; j < d; j++) cov[i][j] += (v[i] * v[j]) / Math.max(n - 1, 1);

  function powerIter(A: number[][], iters = 100): number[] {
    let v = new Array(A.length).fill(0).map(() => Math.random());
    for (let k = 0; k < iters; k++) {
      const w = A.map((row) => row.reduce((s, a, i) => s + a * v[i], 0));
      const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
      v = w.map((x) => x / norm);
    }
    return v;
  }
  const pc1 = powerIter(cov);
  const lambda1 = pc1.reduce(
    (s, vi, i) => s + vi * cov[i].reduce((ss, aij, j) => ss + aij * pc1[j], 0),
    0
  );
  const deflated = cov.map((row, i) => row.map((aij, j) => aij - lambda1 * pc1[i] * pc1[j]));
  const pc2 = powerIter(deflated);

  return centered.map((v) => ({
    x: v.reduce((s, x, i) => s + x * pc1[i], 0),
    y: v.reduce((s, x, i) => s + x * pc2[i], 0),
  }));
}

const CATEGORY_COLORS: Record<AssetCategory, string> = {
  overall: "#6b7280",
  region: "#3b82f6",
  rating: "#a855f7",
  grade: "#ef4444",
  sector: "#22c55e",
  etf: "#eab308",
};

export function UniverseMap({ countries }: { countries: AssetDto[] }) {
  const [statsByIso, setStatsByIso] = useState<Record<string, SeriesStatsDto | null> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    rvApi
      .getUniverseStats()
      .then((r) => { if (alive) setStatsByIso(r.stats); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, []);

  if (error) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center text-sm text-rose-600">
        Failed to load series stats: {error}
      </div>
    );
  }
  if (!statsByIso) {
    return <Loader height="420px" message="Computing series stats…" />;
  }

  // Merge fetched stats onto the static countries list.
  const merged = countries.map((c) => ({ ...c, stats: statsByIso[c.iso] ?? null }));
  const withStats = merged.filter((c) => c.stats);
  const withoutStats = merged.length - withStats.length;

  if (!withStats.length) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center text-sm text-muted-foreground">
        No series stats available — check FRED/Yahoo connectivity.
      </div>
    );
  }

  const vectors = withStats.map(featureVector).filter((v): v is number[] => v != null);
  const coords = pca2(vectors);
  const data = withStats.map((c, i) => ({
    ...coords[i],
    iso: c.iso,
    name: c.name,
    category: c.category,
    source: c.source,
    stats: c.stats!,
  }));

  return (
    <div className="space-y-2">
      <div className="h-[420px] w-full">
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" name="PC1" tickFormatter={() => ""} />
            <YAxis dataKey="y" type="number" name="PC2" tickFormatter={() => ""} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const p = payload[0].payload as (typeof data)[number];
                return (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-muted-foreground">
                      {p.category} · {p.source}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 font-mono">
                      <span className="text-muted-foreground">mean</span>
                      <span className="text-right">{p.stats.mean.toFixed(2)}</span>
                      <span className="text-muted-foreground">vol/day</span>
                      <span className="text-right">{p.stats.vol.toFixed(3)}</span>
                      <span className="text-muted-foreground">30d %</span>
                      <span className="text-right">{p.stats.ret30d.toFixed(2)}</span>
                      <span className="text-muted-foreground">acf₁</span>
                      <span className="text-right">{p.stats.autocorr1.toFixed(2)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={data}>
              {data.map((d, i) => (
                <Cell key={i} fill={CATEGORY_COLORS[d.category] || "#888"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {withoutStats > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {withoutStats} asset{withoutStats === 1 ? "" : "s"} hidden — series stats not available yet.
        </p>
      )}
    </div>
  );
}
