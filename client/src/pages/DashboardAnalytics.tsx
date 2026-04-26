import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
} from "recharts";

const TIER_COLORS: Record<string, string> = {
  Red: "#ef4444",
  Yellow: "#eab308",
  Green: "#22c55e",
};

const FUNNEL_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
  "#ddd6fe", "#ede9fe", "#f5f3ff", "#faf5ff", "#f0fdf4",
];

const STEP_LABELS: Record<string, string> = {
  page_view: "Page Views",
  quiz_start: "Quiz Started",
  quiz_complete: "Quiz Completed",
  vsl_view: "VSL Viewed",
  vsl_25: "Video 25%",
  vsl_50: "Video 50%",
  vsl_75: "Video 75%",
  vsl_100: "Video 100%",
  order_click: "Order Clicked",
};

const BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
];

export default function DashboardAnalytics() {
  const [days, setDays] = useState(30);

  const { data: timelineData, isLoading: timelineLoading } = trpc.analytics.submissionsOverTime.useQuery({ days });
  const { data: questionData, isLoading: questionLoading } = trpc.analytics.questionDistributions.useQuery();
  const { data: trafficData, isLoading: trafficLoading } = trpc.analytics.trafficSources.useQuery();
  const { data: funnelData, isLoading: funnelLoading } = trpc.dashboard.funnelStats.useQuery();
  const { data: summaryData, isLoading: summaryLoading } = trpc.dashboard.summary.useQuery();
  const { data: adData, isLoading: adLoading } = trpc.dashboard.adPerformance.useQuery();

  // Build tier distribution for pie chart
  const tierPieData = (summaryData?.tierCounts ?? []).map(t => ({
    name: t.alertTier ?? "Unknown",
    value: Number(t.count),
  }));

  // Build funnel steps
  const funnelSteps = funnelData
    ? Object.entries(STEP_LABELS).map(([key, label]) => ({
        name: label,
        value: funnelData[key as keyof typeof funnelData] ?? 0,
      }))
    : [];

  // Build ad performance chart data
  const adChartData = (adData ?? []).map(row => ({
    name: row.adName ?? "Direct",
    Red: Number(row.redCount),
    Yellow: Number(row.yellowCount),
    Green: Number(row.greenCount),
    Total: Number(row.total),
  }));

  // Timeline chart data
  const timelineChartData = (timelineData ?? []).map(row => ({
    day: row.day,
    Total: Number(row.total),
    Red: Number(row.red),
    Yellow: Number(row.yellow),
    Green: Number(row.green),
  }));

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quiz submission data and key tracking metrics
            </p>
          </div>
          <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Submissions", value: summaryLoading ? "…" : String(summaryData?.totals?.total ?? 0) },
            { label: "Unique Leads", value: summaryLoading ? "…" : String(summaryData?.totals?.uniqueEmails ?? 0) },
            {
              label: "Red Alert",
              value: summaryLoading ? "…" : String(summaryData?.tierCounts?.find(t => t.alertTier === "Red")?.count ?? 0),
              color: "text-red-600",
            },
            {
              label: "Yellow Alert",
              value: summaryLoading ? "…" : String(summaryData?.tierCounts?.find(t => t.alertTier === "Yellow")?.count ?? 0),
              color: "text-yellow-600",
            },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <p className={`text-3xl font-bold mt-1 ${kpi.color ?? ""}`}>{kpi.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submissions over time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Submissions Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : timelineChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timelineChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Red" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Yellow" stroke="#eab308" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="Green" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Alert tier distribution + Ad performance */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Tier pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Alert Tier Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
              ) : tierPieData.length === 0 || tierPieData.every(d => d.value === 0) ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={tierPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {tierPieData.map((entry) => (
                        <Cell key={entry.name} fill={TIER_COLORS[entry.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Ad performance bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Submissions by Ad</CardTitle>
            </CardHeader>
            <CardContent>
              {adLoading ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
              ) : adChartData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={adChartData} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" interval={0} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Red" stackId="a" fill="#ef4444" />
                    <Bar dataKey="Yellow" stackId="a" fill="#eab308" />
                    <Bar dataKey="Green" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Funnel conversion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funnel Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelLoading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : funnelSteps.every(s => s.value === 0) ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No funnel data yet</div>
            ) : (
              <div className="space-y-2 py-2">
                {funnelSteps.map((step, i) => {
                  const maxVal = funnelSteps[0]?.value || 1;
                  const pct = maxVal > 0 ? Math.round((step.value / maxVal) * 100) : 0;
                  const dropPct = i > 0 && funnelSteps[i - 1].value > 0
                    ? Math.round(((funnelSteps[i - 1].value - step.value) / funnelSteps[i - 1].value) * 100)
                    : null;
                  return (
                    <div key={step.name}>
                      {dropPct !== null && dropPct > 0 && (
                        <div className="flex items-center gap-1 pl-2 mb-1">
                          <span className="text-xs text-red-500">↓ {dropPct}% drop</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">{step.name}</span>
                        <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                          <div
                            className="h-5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: FUNNEL_COLORS[i] ?? "#6366f1" }}
                          />
                        </div>
                        <span className="text-xs font-medium w-10 text-right">{step.value}</span>
                        <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic sources */}
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "By Platform",
              data: (trafficData?.platformRows ?? []).map(r => ({ name: r.platform ?? "Unknown", value: Number(r.count) })),
            },
            {
              title: "By UTM Source",
              data: (trafficData?.utmSourceRows ?? []).map(r => ({ name: r.source ?? "Unknown", value: Number(r.count) })),
            },
            {
              title: "By UTM Medium",
              data: (trafficData?.utmMediumRows ?? []).map(r => ({ name: r.medium ?? "Unknown", value: Number(r.count) })),
            },
          ].map(chart => (
            <Card key={chart.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Traffic {chart.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {trafficLoading ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
                ) : chart.data.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chart.data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                      <Tooltip />
                      {chart.data.map((_, idx) => null)}
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chart.data.map((_, idx) => (
                          <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Question answer distributions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Question Answer Distributions</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">How respondents answered each quiz question</p>
          </CardHeader>
          <CardContent>
            {questionLoading ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                {(questionData ?? []).map((q) => {
                  const total = q.answers.reduce((s, a) => s + a.count, 0);
                  return (
                    <div key={q.key} className="space-y-1">
                      <p className="text-xs font-medium text-foreground">{q.label}</p>
                      {q.answers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No responses yet</p>
                      ) : (
                        q.answers.map((a, i) => {
                          const pct = total > 0 ? Math.round((a.count / total) * 100) : 0;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                                <div
                                  className="h-3 rounded-full"
                                  style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-6 text-right">{pct}%</span>
                              <span className="text-xs text-muted-foreground max-w-[120px] truncate" title={a.answer}>
                                {a.answer.length > 30 ? a.answer.slice(0, 28) + "…" : a.answer}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
