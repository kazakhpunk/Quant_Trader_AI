import { ContentLayout } from "@/components/admin-panel/content-layout";
import { UniverseTable } from "@/components/v4/rv-trade/universe-table";
import { UniverseMap } from "@/components/v4/rv-trade/universe-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function fetchUniverse() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const res = await fetch(`${base}/api/v4/rv/universe`, { cache: "no-store" });
  if (!res.ok) return { universe: [] };
  return res.json();
}

export default async function RvUniversePage() {
  const { universe } = await fetchUniverse();
  return (
    <ContentLayout title="RV Trade — Universe">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Countries</CardTitle></CardHeader>
          <CardContent><UniverseTable countries={universe} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fundamentals map (PCA)</CardTitle></CardHeader>
          <CardContent><UniverseMap countries={universe} /></CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
