import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Eye, PlayCircle, CheckCircle2, MonitorPlay, TrendingUp,
  MousePointerClick, ShoppingCart, ChevronDown, Users, BarChart3
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(num: number, denom: number): string {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

function dropPct(num: number, denom: number): string {
  if (!denom) return "—";
  const d = denom - num;
  return `${Math.round((d / denom) * 100)}% dropped off`;
}

// ── Date range options ────────────────────────────────────────────────────────

const DATE_RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: 0 },
];

function getDateRange(days: number): { dateFrom?: Date; dateTo?: Date } {
  if (!days) return {};
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: from, dateTo: now };
}

// ── Funnel Step Row ───────────────────────────────────────────────────────────

interface FunnelStepProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  count: number;
  convRate?: string;   // conversion from previous step
  dropRate?: string;   // drop-off from previous step
  isFirst?: boolean;
  color?: string;
  highlight?: boolean;
}

function FunnelStep({ icon, label, sublabel, count, convRate, dropRate, isFirst, color = "bg-sage-100", highlight }: FunnelStepProps) {
  return (
    <div className="relative">
      {!isFirst && (
        <div className="flex items-center justify-center py-1">
          <div className="flex flex-col items-center">
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
            {dropRate && (
              <span className="text-xs text-red-500 font-medium">{dropRate}</span>
            )}
          </div>
        </div>
      )}
      <div className={`flex items-center gap-4 p-4 rounded-lg border ${highlight ? "border-green-400 bg-green-50" : "border-border bg-card"}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-foreground">{label}</div>
          {sublabel && <div className="text-xs text-muted-foreground">{sublabel}</div>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-foreground">{count.toLocaleString()}</div>
          {convRate && (
            <div className="text-xs text-green-600 font-medium">{convRate} conversion</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tier Badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier, count, total }: { tier: string; count: number; total: number }) {
  const colors: Record<string, string> = {
    Red: "bg-red-100 text-red-700 border-red-200",
    Yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Green: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded border ${colors[tier] ?? "bg-muted"}`}>
      <span className="font-medium text-sm">{tier} Alert</span>
      <span className="font-bold">{count} <span className="font-normal text-xs opacity-70">({pct(count, total)})</span></span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardFunnel() {
  const [rangeDays, setRangeDays] = useState(0);

  const dateRange = useMemo(() => getDateRange(rangeDays), [rangeDays]);

  const { data: stats, isLoading } = trpc.dashboard.fullFunnelStats.useQuery(
    { ...dateRange },
    { refetchInterval: 60_000 }
  );

  const { data: dropoff } = trpc.dashboard.dropoffByQuestion.useQuery();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse w-48" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  const s = stats ?? {
    page_view: 0, quiz_start: 0, quiz_complete: 0,
    vsl_view: 0, vsl_25: 0, vsl_50: 0, vsl_75: 0, vsl_100: 0,
    order_click: 0, order_placed: 0,
    red_complete: 0, yellow_complete: 0, green_complete: 0,
  };

  const totalComplete = s.red_complete + s.yellow_complete + s.green_complete;

  return (
    <DashboardLayout>
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Funnel Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track every step from first visit to purchase</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={String(rangeDays)} onValueChange={v => setRangeDays(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(r => (
                <SelectItem key={r.days} value={String(r.days)}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Main funnel */}
        <div className="lg:col-span-2 space-y-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Full Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <FunnelStep
                isFirst
                icon={<Eye className="w-5 h-5 text-blue-600" />}
                label="Page visits"
                sublabel="Landed on quiz page"
                count={s.page_view}
                color="bg-blue-100"
              />
              <FunnelStep
                icon={<PlayCircle className="w-5 h-5 text-indigo-600" />}
                label="Quiz started"
                sublabel="Answered at least Q1"
                count={s.quiz_start}
                convRate={pct(s.quiz_start, s.page_view)}
                dropRate={dropPct(s.quiz_start, s.page_view)}
                color="bg-indigo-100"
              />
              <FunnelStep
                icon={<CheckCircle2 className="w-5 h-5 text-violet-600" />}
                label="Quiz completed"
                sublabel="All 18 questions answered + contact info submitted"
                count={s.quiz_complete}
                convRate={pct(s.quiz_complete, s.quiz_start)}
                dropRate={dropPct(s.quiz_complete, s.quiz_start)}
                color="bg-violet-100"
              />
              <FunnelStep
                icon={<MonitorPlay className="w-5 h-5 text-amber-600" />}
                label="VSL page loaded"
                sublabel="Redirected to results video page"
                count={s.vsl_view}
                convRate={pct(s.vsl_view, s.quiz_complete)}
                dropRate={dropPct(s.vsl_view, s.quiz_complete)}
                color="bg-amber-100"
              />
              <FunnelStep
                icon={<TrendingUp className="w-5 h-5 text-orange-600" />}
                label="Video watched 25%+"
                sublabel="Engaged with the VSL"
                count={s.vsl_25}
                convRate={pct(s.vsl_25, s.vsl_view)}
                dropRate={dropPct(s.vsl_25, s.vsl_view)}
                color="bg-orange-100"
              />
              <FunnelStep
                icon={<TrendingUp className="w-5 h-5 text-rose-600" />}
                label="Video watched 50%+"
                sublabel="Halfway through the VSL"
                count={s.vsl_50}
                convRate={pct(s.vsl_50, s.vsl_25)}
                dropRate={dropPct(s.vsl_50, s.vsl_25)}
                color="bg-rose-100"
              />
              <FunnelStep
                icon={<MousePointerClick className="w-5 h-5 text-green-600" />}
                label="Order button clicked"
                sublabel="Clicked 'Order Now' on VSL page"
                count={s.order_click}
                convRate={pct(s.order_click, s.vsl_50 || s.vsl_view)}
                dropRate={dropPct(s.order_click, s.vsl_50 || s.vsl_view)}
                color="bg-green-100"
                highlight
              />
              <FunnelStep
                icon={<ShoppingCart className="w-5 h-5 text-emerald-600" />}
                label="Orders placed"
                sublabel="Confirmed purchase (manual entry)"
                count={s.order_placed}
                convRate={pct(s.order_placed, s.order_click)}
                dropRate={dropPct(s.order_placed, s.order_click)}
                color="bg-emerald-100"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary cards + tier breakdown */}
        <div className="space-y-4">
          {/* Quick stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Visit → Complete</span>
                <span className="font-bold text-sm">{pct(s.quiz_complete, s.page_view)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Complete → VSL</span>
                <span className="font-bold text-sm">{pct(s.vsl_view, s.quiz_complete)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">VSL → Click</span>
                <span className="font-bold text-sm">{pct(s.order_click, s.vsl_view)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Click → Order</span>
                <span className="font-bold text-sm">{pct(s.order_placed, s.order_click)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Overall (Visit → Order)</span>
                <span className="font-bold text-sm text-green-600">{pct(s.order_placed || s.order_click, s.page_view)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Tier breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Completions by tier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <TierBadge tier="Red" count={s.red_complete} total={totalComplete} />
              <TierBadge tier="Yellow" count={s.yellow_complete} total={totalComplete} />
              <TierBadge tier="Green" count={s.green_complete} total={totalComplete} />
              <div className="text-xs text-muted-foreground pt-1 text-center">
                {totalComplete} total completions
              </div>
            </CardContent>
          </Card>

          {/* Video depth */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Video depth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "25%", count: s.vsl_25 },
                { label: "50%", count: s.vsl_50 },
                { label: "75%", count: s.vsl_75 },
                { label: "100%", count: s.vsl_100 },
              ].map(({ label, count }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">{label}</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all"
                      style={{ width: s.vsl_view ? `${Math.round((count / s.vsl_view) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Question Drop-off Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Question Drop-off Funnel</CardTitle>
          <p className="text-xs text-muted-foreground">
            For each question: how many people started it, how many finished (moved to next), and how many dropped off.
          </p>
          <div className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-0.5">
            <p><span className="font-semibold text-foreground">Started:</span> Number of unique visitors who reached that question.</p>
            <p><span className="font-semibold text-foreground">Finished:</span> Number who answered and moved to the next question (Started minus Dropped Off).</p>
            <p><span className="font-semibold text-amber-600">Dropped Off:</span> Number who left the quiz at that question without continuing.</p>
            <p className="pt-1 border-t border-border/30"><span className="font-semibold text-blue-700">Quiz Started</span> = clicked the Start Quiz button. <span className="font-semibold text-emerald-700">Completed &amp; Submitted</span> = filled out the contact form and submitted their info.</p>
          </div>
        </CardHeader>
        <CardContent>
          {!dropoff || dropoff.byQuestion.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No drop-off data yet. Data will appear once visitors begin the quiz.
            </p>
          ) : (() => {
            const QLABELS = [
              "How would you describe your digestion?",
              "Do you have heartburn after meals?",
              "How do you experience unexplained weight changes?",
              "How would you rate your energy levels throughout the day?",
              "How do you feel after meals?",
              "How well do you control your eating?",
              "How difficult is it for you to lose weight?",
              "What do you typically eat for breakfast?",
              "Do you have problems sleeping?",
              "Do you often experience brain fog?",
              "Do you experience mood swings?",
              "How would you describe your typical diet?",
              "How often do you eat fermented foods?",
              "How often do you eat prebiotic foods?",
              "Do you take antacids or acid blockers?",
              "Do you take pain pills like aspirin or ibuprofen?",
              "Recent antibiotic use?",
            ];
            const dropMap: Record<number, number> = {};
            dropoff.byQuestion.forEach((r: { question: number; droppedOff: number }) => {
              dropMap[r.question] = r.droppedOff;
            });
            const totalTracked = dropoff.byQuestion.reduce((s: number, r: { droppedOff: number }) => s + r.droppedOff, 0) + dropoff.completions;
            const totalStarted = (dropoff as { totalStarts?: number }).totalStarts ?? totalTracked;
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-10">#</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Question</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Stopped Here</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">% of Starters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Header row: total who clicked Start Quiz */}
                    <tr className="bg-blue-50/60 border-b-2 border-blue-200">
                      <td className="py-2 px-2 font-bold text-blue-700">▶</td>
                      <td className="py-2 px-2 font-semibold text-blue-700">
                        Clicked Start Quiz
                      </td>
                      <td className="text-right py-2 px-2 font-bold text-blue-700">{totalStarted.toLocaleString()}</td>
                      <td className="text-right py-2 px-2 text-muted-foreground">—</td>
                    </tr>
                    {QLABELS.map((label, i) => {
                      const stopped = dropMap[i + 1] ?? 0;
                      const pctStopped = totalStarted > 0 ? Math.round((stopped / totalStarted) * 100) : 0;
                      const isHighDrop = pctStopped >= 10;
                      const shortLabel = label.length > 60 ? label.slice(0, 60) + "…" : label;
                      return (
                        <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                          <td className="py-1.5 px-2 font-bold text-muted-foreground">Q{i + 1}</td>
                          <td className="py-1.5 px-2 text-foreground">{shortLabel}</td>
                          <td className={`text-right py-1.5 px-2 font-semibold ${isHighDrop ? "text-red-500" : stopped > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {stopped > 0 ? stopped.toLocaleString() : "—"}
                          </td>
                          <td className={`text-right py-1.5 px-2 font-medium ${isHighDrop ? "text-red-500" : "text-muted-foreground"}`}>
                            {stopped > 0 ? `${pctStopped}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-emerald-50/60 border-t-2 border-emerald-200">
                      <td className="py-2 px-2 font-bold text-emerald-700">✓</td>
                      <td className="py-2 px-2 font-semibold text-emerald-700">Completed &amp; Submitted</td>
                      <td className="text-right py-2 px-2 font-bold text-emerald-700">{dropoff.completions.toLocaleString()}</td>
                      <td className="text-right py-2 px-2 font-semibold text-emerald-700">
                        {totalStarted > 0 ? `${Math.round((dropoff.completions / totalStarted) * 100)}%` : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}