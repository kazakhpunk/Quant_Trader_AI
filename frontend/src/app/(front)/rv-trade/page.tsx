import { ContentLayout } from "@/components/admin-panel/content-layout";
import { UniverseTable } from "@/components/v4/rv-trade/universe-table";
import { UniverseMap } from "@/components/v4/rv-trade/universe-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiUrl } from "@/lib/utils";

// SSR fetch wrapped in try/catch so the page renders even if the backend
// is briefly unreachable — otherwise the whole route returns 500. Uses
// getApiUrl() (NEXT_PUBLIC_DEPLOY in prod, NEXT_PUBLIC_LOCAL in dev) to
// stay consistent with every other API call in the app.
async function fetchUniverse(): Promise<{ universe: any[] }> {
  const base = getApiUrl();
  if (!base) return { universe: [] };
  try {
    const res = await fetch(`${base}/api/v4/rv/universe`, { cache: "no-store" });
    if (!res.ok) return { universe: [] };
    return res.json();
  } catch (e) {
    console.error("[rv-trade] universe fetch failed:", (e as Error).message);
    return { universe: [] };
  }
}

export default async function RvUniversePage() {
  const { universe } = await fetchUniverse();
  const fred = universe.filter((a: any) => a.source === "fred").length;
  const yahoo = universe.filter((a: any) => a.source === "yahoo").length;

  return (
    <ContentLayout title="RV Trade — Universe">
      {/* Masthead */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            §UNIVERSE · EM credit relative-value
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            {universe.length} bucket{universe.length === 1 ? "" : "s"} on the watchlist.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            ICE BofA EM Corporate-Plus OAS series from FRED plus tradeable EM bond ETFs from Yahoo.
            Same-category pairs feed the cointegration pipeline.
          </p>
        </div>
        <div className="flex items-baseline gap-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <div><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-foreground" />FRED · {fred}</div>
          <div><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />Yahoo · {yahoo}</div>
        </div>
      </div>

      {/* Two-column at lg+, stacked below. Map gets more vertical room. */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Roster
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <UniverseTable countries={universe} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Behaviour map · PCA on series stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <UniverseMap countries={universe} />
          </CardContent>
        </Card>
      </div>
    </ContentLayout>
  );
}
