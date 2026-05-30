import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Play, Clock, TrendingUp, MousePointerClick, AlertTriangle } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(n: number, total: number) {
  if (!total) return "—";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-md bg-muted">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WistiaPanel({
  label,
  tier,
  data,
  funnelViews,
  funnelOrderClicks,
}: {
  label: string;
  tier: "red" | "yellow";
  data: {
    id: number;
    hashedId: string;
    name: string;
    pageLoads: number;
    visitors: number;
    percentOfVisitorsClickingPlay: number;
    plays: number;
    averagePercentWatched: number;
  } | null;
  funnelViews: number;
  funnelOrderClicks: number;
}) {
  const badgeColor =
    tier === "red"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-yellow-100 text-yellow-700 border-yellow-200";

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge className={badgeColor}>{label}</Badge>
            <span className="text-muted-foreground text-sm font-normal">
              Wistia data unavailable
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Check that the WISTIA_API_TOKEN secret is set correctly.
          </p>
        </CardContent>
      </Card>
    );
  }

  const playRate = data.pageLoads
    ? ((data.plays / data.pageLoads) * 100).toFixed(1)
    : "—";
  const avgWatch = `${data.averagePercentWatched}%`;
  const clickPlayRate = `${data.percentOfVisitorsClickingPlay}%`;

  // Engagement quality colour
  const watchColor =
    data.averagePercentWatched >= 60
      ? "text-green-600"
      : data.averagePercentWatched >= 35
      ? "text-yellow-600"
      : "text-red-500";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Badge className={badgeColor}>{label}</Badge>
          <span className="text-muted-foreground text-sm font-normal truncate">
            {data.name}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Wistia stats grid */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Wistia — All-time video stats
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Page loads</p>
            <p className="text-xl font-bold">{data.pageLoads.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">times player loaded</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Unique visitors</p>
            <p className="text-xl font-bold">{data.visitors.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">unique viewers</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Total plays</p>
            <p className="text-xl font-bold">{data.plays.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">pressed play</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Click-to-play rate</p>
            <p className="text-xl font-bold">{clickPlayRate}</p>
            <p className="text-xs text-muted-foreground">of visitors played</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Play rate</p>
            <p className="text-xl font-bold">{playRate}%</p>
            <p className="text-xs text-muted-foreground">plays ÷ loads</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Avg % watched</p>
            <p className={`text-xl font-bold ${watchColor}`}>{avgWatch}</p>
            <p className="text-xs text-muted-foreground">average engagement</p>
          </div>
        </div>

        {/* Funnel event stats */}
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quiz funnel — visitors from your ads
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">VSL page views</p>
            <p className="text-xl font-bold">{funnelViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">arrived from quiz</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground mb-1">Order clicks</p>
            <p className="text-xl font-bold">{funnelOrderClicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {pct(funnelOrderClicks, funnelViews)} of VSL viewers
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardVSLPerformance() {
  const { data: wistia, isLoading: wistiaLoading } =
    trpc.dashboard.wistiaStats.useQuery(undefined, {
      refetchInterval: 5 * 60 * 1000, // refresh every 5 minutes
    });

  const { data: funnel, isLoading: funnelLoading } =
    trpc.dashboard.fullFunnelStats.useQuery({});

  const isLoading = wistiaLoading || funnelLoading;

  // Aggregate funnel numbers for each tier
  const redViews = funnel?.vsl_view_red ?? 0;
  const yellowViews = funnel?.vsl_view_yellow ?? 0;
  const redOrders = funnel?.order_click_red ?? 0;
  const yellowOrders = funnel?.order_click_yellow ?? 0;
  const totalVslViews = funnel?.vsl_view ?? 0;
  const totalOrderClicks = funnel?.order_click ?? 0;

  // Combined Wistia totals
  const totalPageLoads =
    (wistia?.red?.pageLoads ?? 0) + (wistia?.yellow?.pageLoads ?? 0);
  const totalPlays =
    (wistia?.red?.plays ?? 0) + (wistia?.yellow?.plays ?? 0);
  const avgWatched =
    wistia?.red && wistia?.yellow
      ? Math.round(
          (wistia.red.averagePercentWatched + wistia.yellow.averagePercentWatched) /
            2
        )
      : wistia?.red?.averagePercentWatched ??
        wistia?.yellow?.averagePercentWatched ??
        0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-muted-foreground">Loading VSL stats…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">VSL Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live video stats from Wistia combined with your quiz funnel data.
          </p>
        </div>

        {/* Top-level summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Total video loads"
            value={totalPageLoads.toLocaleString()}
            sub="both VSL pages"
            icon={Eye}
          />
          <StatCard
            label="Total plays"
            value={totalPlays.toLocaleString()}
            sub="pressed play"
            icon={Play}
          />
          <StatCard
            label="Avg % watched"
            value={`${avgWatched}%`}
            sub="across both videos"
            icon={Clock}
            color={
              avgWatched >= 60
                ? "text-green-600"
                : avgWatched >= 35
                ? "text-yellow-600"
                : "text-red-500"
            }
          />
          <StatCard
            label="Order clicks (funnel)"
            value={totalOrderClicks.toLocaleString()}
            sub={`${pct(totalOrderClicks, totalVslViews)} of VSL viewers`}
            icon={MousePointerClick}
          />
        </div>

        {/* Engagement guidance */}
        {avgWatched < 35 && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Average watch time is below 35%. Viewers are dropping off early —
              consider tightening the opening hook or shortening the video.
            </span>
          </div>
        )}
        {avgWatched >= 35 && avgWatched < 60 && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
            <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Average watch time is {avgWatched}%. Decent engagement — look at
              where viewers drop off in Wistia's heatmap to find the weak spot.
            </span>
          </div>
        )}
        {avgWatched >= 60 && (
          <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Strong engagement — {avgWatched}% average watch time. Viewers are
              staying through most of the video.
            </span>
          </div>
        )}

        {/* Per-video panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WistiaPanel
            label="Red Alert"
            tier="red"
            data={wistia?.red ?? null}
            funnelViews={redViews}
            funnelOrderClicks={redOrders}
          />
          <WistiaPanel
            label="Yellow Alert"
            tier="yellow"
            data={wistia?.yellow ?? null}
            funnelViews={yellowViews}
            funnelOrderClicks={yellowOrders}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Wistia stats include all traffic (direct links, email, ads). Funnel
          stats count only visitors who arrived via the quiz. Data refreshes
          every 5 minutes.
        </p>
      </div>
    </DashboardLayout>
  );
}
