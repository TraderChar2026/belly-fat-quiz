import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Clock, Mail } from "lucide-react";
import { toast } from "sonner";

const TIERS = ["Red", "Yellow", "Green"] as const;
type Tier = typeof TIERS[number];

const EMAIL_LABELS = [
  "Email 1 — PDF delivery",
  "Email 2",
  "Email 3",
  "Email 4",
  "Email 5",
  "Email 6",
  "Email 7",
];

interface StatRow {
  subject: string;
  sentCount: string;
  openRate: string;
  clickRate: string;
  unsubCount: string;
  updatedAt?: string;
}

function emptyRow(): StatRow {
  return { subject: "", sentCount: "", openRate: "", clickRate: "", unsubCount: "" };
}

function avg(values: number[]): string {
  const valid = values.filter(v => !isNaN(v));
  if (!valid.length) return "—";
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1) + "%";
}

function TierTable({ tier }: { tier: Tier }) {
  const utils = trpc.useUtils();
  const { data: statsData, isLoading } = trpc.dashboard.emailStats.useQuery({ tier });
  const upsert = trpc.dashboard.upsertEmailStat.useMutation({
    onSuccess: () => {
      utils.dashboard.emailStats.invalidate();
      toast.success("Stats saved");
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const [rows, setRows] = useState<StatRow[]>(() => Array.from({ length: 7 }, emptyRow));

  // Hydrate from server data using useEffect (not during render)
  useEffect(() => {
    if (!statsData) return;
    const next = Array.from({ length: 7 }, emptyRow);
    for (const row of statsData) {
      const idx = row.emailNumber - 1;
      if (idx >= 0 && idx < 7) {
        next[idx] = {
          subject: row.subject ?? "",
          sentCount: row.sentCount != null ? String(row.sentCount) : "",
          openRate: row.openRate != null ? String(row.openRate) : "",
          clickRate: row.clickRate != null ? String(row.clickRate) : "",
          unsubCount: row.unsubCount != null ? String(row.unsubCount) : "",
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toLocaleString() : undefined,
        };
      }
    }
    setRows(next);
  }, [statsData]);

  function updateRow(idx: number, field: keyof StatRow, value: string) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  async function saveAll() {
    for (let i = 0; i < 7; i++) {
      const r = rows[i];
      await upsert.mutateAsync({
        tier,
        emailNumber: i + 1,
        subject: r.subject || undefined,
        sentCount: r.sentCount ? parseInt(r.sentCount) : undefined,
        openRate: r.openRate ? parseFloat(r.openRate) : undefined,
        clickRate: r.clickRate ? parseFloat(r.clickRate) : undefined,
        unsubCount: r.unsubCount ? parseInt(r.unsubCount) : undefined,
      });
    }
  }

  const openRates = rows.map(r => parseFloat(r.openRate)).filter(v => !isNaN(v));
  const clickRates = rows.map(r => parseFloat(r.clickRate)).filter(v => !isNaN(v));
  const totalUnsubs = rows.reduce((sum, r) => sum + (parseInt(r.unsubCount) || 0), 0);

  if (isLoading) {
    return <div className="space-y-2">{[...Array(7)].map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Avg open rate</div>
          <div className="text-xl font-bold">{avg(openRates)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Avg click rate</div>
          <div className="text-xl font-bold">{avg(clickRates)}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Total unsubscribes</div>
          <div className="text-xl font-bold">{totalUnsubs || "—"}</div>
        </Card>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-2 pr-3 font-medium w-40">Email</th>
              <th className="text-left py-2 pr-3 font-medium">Subject / Label</th>
              <th className="text-left py-2 pr-3 font-medium w-20">Sent</th>
              <th className="text-left py-2 pr-3 font-medium w-24">Open %</th>
              <th className="text-left py-2 pr-3 font-medium w-24">Click %</th>
              <th className="text-left py-2 pr-3 font-medium w-20">Unsubs</th>
              <th className="text-left py-2 font-medium w-36">Last updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium text-xs">{EMAIL_LABELS[i]}</span>
                  </div>
                  {i === 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">= PDF seen rate</div>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <Input
                    value={row.subject}
                    onChange={e => updateRow(i, "subject", e.target.value)}
                    placeholder="Subject line…"
                    className="h-7 text-xs"
                  />
                </td>
                <td className="py-2 pr-3">
                  <Input
                    value={row.sentCount}
                    onChange={e => updateRow(i, "sentCount", e.target.value)}
                    placeholder="0"
                    type="number"
                    min="0"
                    className="h-7 text-xs w-20"
                  />
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1">
                    <Input
                      value={row.openRate}
                      onChange={e => updateRow(i, "openRate", e.target.value)}
                      placeholder="0.0"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="h-7 text-xs w-16"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1">
                    <Input
                      value={row.clickRate}
                      onChange={e => updateRow(i, "clickRate", e.target.value)}
                      placeholder="0.0"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="h-7 text-xs w-16"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <Input
                    value={row.unsubCount}
                    onChange={e => updateRow(i, "unsubCount", e.target.value)}
                    placeholder="0"
                    type="number"
                    min="0"
                    className="h-7 text-xs w-16"
                  />
                </td>
                <td className="py-2">
                  {row.updatedAt ? (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      {row.updatedAt}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not saved yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Paste stats from AwesomeCRM periodically. Last updated shown per row.
        </p>
        <Button
          onClick={saveAll}
          disabled={upsert.isPending}
          size="sm"
          className="gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          {upsert.isPending ? "Saving…" : "Save all"}
        </Button>
      </div>
    </div>
  );
}

export default function DashboardEmailStats() {
  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Email Sequence Stats</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manually enter stats from AwesomeCRM. Email 1 open rate = % who saw the PDF. Email 1 click rate = % who downloaded it.
        </p>
      </div>

      <Tabs defaultValue="Red">
        <TabsList>
          {TIERS.map(t => (
            <TabsTrigger key={t} value={t}>
              <span className={t === "Red" ? "text-red-600" : t === "Yellow" ? "text-yellow-600" : "text-green-600"}>
                {t} Alert
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {TIERS.map(t => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t} Alert — 7-Email Nurture Sequence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TierTable tier={t} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
