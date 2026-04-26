import { ContentLayout } from "@/components/admin-panel/content-layout";
import { PairTable } from "@/components/v4/rv-trade/pair-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchPairs() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const res = await fetch(`${base}/api/v4/rv/pairs`, { cache: "no-store" });
  if (!res.ok) return { pairs: [] };
  return res.json();
}

export default async function RvPairsPage() {
  const { pairs } = await fetchPairs();
  return (
    <ContentLayout title="RV Trade — Pairs">
      <Card>
        <CardHeader>
          <CardTitle>Pipeline output</CardTitle>
          <p className="text-sm text-muted-foreground">
            Bucket → Engle-Granger cointegration → Pearson correlation → OU half-life.
          </p>
        </CardHeader>
        <CardContent><PairTable pairs={pairs} /></CardContent>
      </Card>
    </ContentLayout>
  );
}
