import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Date range helpers ────────────────────────────────────────────────────────
type Range = "7d" | "30d" | "90d" | "all";

function getDateRange(range: Range): { dateFrom?: Date; dateTo?: Date } {
  if (range === "all") return {};
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const dateFrom = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom, dateTo: now };
}

// ── Sortable column types ─────────────────────────────────────────────────────
type SortKey =
  | "adName"
  | "visits"
  | "starts"
  | "completes"
  | "vslViews"
  | "orderClicks"
  | "startRate"
  | "completeRate"
  | "vslRate"
  | "orderRate";

type SortDir = "asc" | "desc";

// ── Conversion rate badge ─────────────────────────────────────────────────────
function RateBadge({ value, thresholds }: { value: number; thresholds: [number, number] }) {
  const [low, high] = thresholds;
  if (value === 0) return <span className="text-muted-foreground text-sm">—</span>;
  const color =
    value >= high
      ? "bg-green-100 text-green-800 border-green-200"
      : value >= low
      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
      : "bg-red-100 text-red-800 border-red-200";
  const Icon = value >= high ? TrendingUp : value >= low ? Minus : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      <Icon className="w-3 h-3" />
      {value.toFixed(1)}%
    </span>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground/50 ml-1 inline" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3.5 h-3.5 text-primary ml-1 inline" />
    : <ArrowDown className="w-3.5 h-3.5 text-primary ml-1 inline" />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DashboardAdPerformance() {
  const [range, setRange] = useState<Range>("30d");
  const [sortKey, setSortKey] = useState<SortKey>("visits");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const dateRange = useMemo(() => getDateRange(range), [range]);
  const { data, isLoading } = trpc.dashboard.adPerformanceTable.useQuery(
    dateRange.dateFrom ? dateRange : undefined
  );

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      const an = av as number;
      const bn = bv as number;
      return sortDir === "asc" ? an - bn : bn - an;
    });
  }, [data, sortKey, sortDir]);

  const totalVisits = sorted.reduce((s, r) => s + r.visits, 0);
  const totalStarts = sorted.reduce((s, r) => s + r.starts, 0);
  const totalCompletes = sorted.reduce((s, r) => s + r.completes, 0);
  const totalVsl = sorted.reduce((s, r) => s + r.vslViews, 0);
  const totalOrders = sorted.reduce((s, r) => s + r.orderClicks, 0);

  const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) : "—");

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
    </th>
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ad Performance</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Full funnel breakdown by ad name. Click any column header to sort. Add new ads and they appear here automatically.
            </p>
          </div>
          {/* Date range */}
          <div className="flex gap-1.5">
            {(["7d", "30d", "90d", "all"] as Range[]).map(r => (
              <Button
                key={r}
                variant={range === r ? "default" : "outline"}
                size="sm"
                onClick={() => setRange(r)}
                className="text-xs"
              >
                {r === "all" ? "All time" : r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total visits", value: totalVisits.toLocaleString() },
            { label: "Quiz starts", value: totalStarts.toLocaleString() },
            { label: "Completions", value: totalCompletes.toLocaleString() },
            { label: "VSL views", value: totalVsl.toLocaleString() },
            { label: "Order clicks", value: totalOrders.toLocaleString() },
          ].map(c => (
            <Card key={c.label} className="p-3">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-xl font-bold mt-0.5">{c.value}</div>
            </Card>
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {isLoading ? "Loading…" : `${sorted.length} ad${sorted.length !== 1 ? "s" : ""} tracked`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No ad data yet. Traffic will appear here once visitors start arriving.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <Th col="adName" label="Ad name" />
                      <Th col="visits" label="Visits" />
                      <Th col="starts" label="Quiz starts" />
                      <Th col="startRate" label="Start %" />
                      <Th col="completes" label="Completions" />
                      <Th col="completeRate" label="Complete %" />
                      <Th col="vslViews" label="VSL views" />
                      <Th col="vslRate" label="VSL %" />
                      <Th col="orderClicks" label="Order clicks" />
                      <Th col="orderRate" label="Visit → Order" />
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row, i) => (
                      <tr
                        key={row.adName}
                        className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${
                          i % 2 === 0 ? "" : "bg-muted/10"
                        }`}
                      >
                        <td className="py-3 px-3 font-medium max-w-[200px]">
                          <div className="truncate" title={row.adName}>
                            {row.adName}
                          </div>
                          {row.adName === "Direct / Unknown" && (
                            <div className="text-xs text-muted-foreground">No UTM / direct traffic</div>
                          )}
                        </td>
                        <td className="py-3 px-3 tabular-nums">{row.visits.toLocaleString()}</td>
                        <td className="py-3 px-3 tabular-nums">{row.starts.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <RateBadge value={row.startRate} thresholds={[40, 60]} />
                        </td>
                        <td className="py-3 px-3 tabular-nums">{row.completes.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <RateBadge value={row.completeRate} thresholds={[50, 70]} />
                        </td>
                        <td className="py-3 px-3 tabular-nums">{row.vslViews.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <RateBadge value={row.vslRate} thresholds={[50, 75]} />
                        </td>
                        <td className="py-3 px-3 tabular-nums">{row.orderClicks.toLocaleString()}</td>
                        <td className="py-3 px-3">
                          <RateBadge value={row.orderRate} thresholds={[1, 3]} />
                        </td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="border-t-2 bg-muted/30 font-semibold">
                      <td className="py-3 px-3 text-xs uppercase tracking-wide text-muted-foreground">Total / avg</td>
                      <td className="py-3 px-3 tabular-nums">{totalVisits.toLocaleString()}</td>
                      <td className="py-3 px-3 tabular-nums">{totalStarts.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{pct(totalStarts, totalVisits)}%</td>
                      <td className="py-3 px-3 tabular-nums">{totalCompletes.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{pct(totalCompletes, totalStarts)}%</td>
                      <td className="py-3 px-3 tabular-nums">{totalVsl.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{pct(totalVsl, totalCompletes)}%</td>
                      <td className="py-3 px-3 tabular-nums">{totalOrders.toLocaleString()}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground">{pct(totalOrders, totalVisits)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-green-200 border border-green-300" />
            Good — above target
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-200 border border-yellow-300" />
            Moderate — watch closely
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-red-200 border border-red-300" />
            Low — needs attention
          </div>
          <div className="ml-auto">
            <strong>Visit → Order</strong> = the most important metric (end-to-end conversion rate)
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
