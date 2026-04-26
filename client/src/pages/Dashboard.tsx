import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Users, TrendingUp, AlertTriangle, Leaf, DollarSign,
  Search, ChevronLeft, ChevronRight, Plus, ExternalLink,
  RefreshCw, Eye,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

function alertBadge(tier?: string | null) {
  if (!tier) return <Badge variant="outline">—</Badge>;
  const map: Record<string, string> = {
    Red: "bg-red-100 text-red-800 border-red-200",
    Yellow: "bg-amber-100 text-amber-800 border-amber-200",
    Green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return (
    <Badge className={`${map[tier] ?? "bg-gray-100 text-gray-700"} font-medium`}>
      {tier}
    </Badge>
  );
}

function scoreBandLabel(band?: string | null) {
  const map: Record<string, string> = {
    Green: "Green",
    Yellow: "Yellow",
    Lower_Red: "Red (Lower)",
    Upper_Red: "Red (Upper)",
  };
  return band ? (map[band] ?? band) : "—";
}

function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtDateTime(d?: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards() {
  const { data, isLoading } = trpc.dashboard.summary.useQuery();

  const totals = data?.totals;
  const tierCounts = data?.tierCounts ?? [];
  const bandAvgScores = data?.bandAvgScores ?? [];

  const getCount = (tier: string) =>
    Number(tierCounts.find((t) => t.alertTier === tier)?.count ?? 0);

  const getBandAvg = (band: string) => {
    const row = bandAvgScores.find((b) => b.scoreBand === band);
    return row ? Number(row.avgScore).toFixed(1) : "—";
  };

  const countCards = [
    { label: "Total Submissions", value: isLoading ? "—" : (totals?.total ?? 0), icon: Users, color: "text-[#4a7c59]", bg: "bg-[#f4f8f4]" },
    { label: "Unique Leads", value: isLoading ? "—" : (totals?.uniqueEmails ?? 0), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Red Alert", value: isLoading ? "—" : getCount("Red"), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Yellow Alert", value: isLoading ? "—" : getCount("Yellow"), icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Green Alert", value: isLoading ? "—" : getCount("Green"), icon: Leaf, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const avgCards = [
    { label: "Avg Score — Red (Upper)", value: isLoading ? "—" : getBandAvg("Upper_Red"), color: "text-red-700", bg: "bg-red-50" },
    { label: "Avg Score — Red (Lower)", value: isLoading ? "—" : getBandAvg("Lower_Red"), color: "text-red-500", bg: "bg-red-50" },
    { label: "Avg Score — Yellow", value: isLoading ? "—" : getBandAvg("Yellow"), color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Avg Score — Green", value: isLoading ? "—" : getBandAvg("Green"), color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-3 mb-6">
      {/* Count cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {countCards.map((c) => (
          <Card key={c.label} className="border border-border/60">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                <c.icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{String(c.value)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Per-band average score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {avgCards.map((c) => (
          <Card key={c.label} className="border border-border/60">
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                <TrendingUp className={`w-4 h-4 ${c.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{String(c.value)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Ad Performance Table ──────────────────────────────────────────────────────

function AdPerformanceTable() {
  const { data, isLoading, refetch } = trpc.dashboard.adPerformance.useQuery();

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Ad Performance</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Ad / Source</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Red</TableHead>
                <TableHead className="text-right">Yellow</TableHead>
                <TableHead className="text-right">Green</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right pr-4">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No submissions yet. Data will appear here once your ads start driving traffic.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4 font-medium max-w-[200px] truncate">
                      {row.adName ?? "Direct / Unknown"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{Number(row.total)}</TableCell>
                    <TableCell className="text-right text-red-600">{Number(row.redCount)}</TableCell>
                    <TableCell className="text-right text-amber-600">{Number(row.yellowCount)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{Number(row.greenCount)}</TableCell>
                    <TableCell className="text-right">{Number(row.avgScore).toFixed(1)}</TableCell>
                    <TableCell className="text-right pr-4 text-muted-foreground text-sm">
                      {fmtDate(row.lastSeen)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Submission Detail Dialog ──────────────────────────────────────────────────

function SubmissionDetail({ id }: { id: number }) {
  const { data, isLoading } = trpc.dashboard.submissionDetail.useQuery({ id });

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;
  if (!data) return <p className="text-sm text-destructive py-4">Not found.</p>;

  const fields: [string, string | null | undefined][] = [
    ["Name", data.fullName],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Total Score", String(data.totalScore)],
    ["Alert Tier", data.alertTier],
    ["Score Band", scoreBandLabel(data.scoreBand)],
    ["Submitted", fmtDateTime(data.submissionDate)],
    ["Ad / Source", data.adName ?? "Direct / Unknown"],
    ["UTM Campaign", data.utmCampaign],
    ["UTM Source", data.utmSource],
    ["UTM Medium", data.utmMedium],
    ["Referrer", data.referrerUrl],
    ["Platform", data.referrerPlatform],
    ["fbclid", data.fbclid],
    ["Timezone", data.timezone],
    ["Repeat Submission", data.isRepeatSubmission ? "Yes" : "No"],
    ["GHL Contact ID", data.awesomecrmContactId],
  ];

  const qFields: [string, string | null | undefined][] = [
    ["Q1 Digestion", data.q1Digestion],
    ["Q2 Heartburn", data.q2Heartburn],
    ["Q3 Weight Changes", data.q3WeightChanges],
    ["Q4 Energy", data.q4Energy],
    ["Q5 After Meals", data.q5AfterMeals],
    ["Q6 Eating Control", data.q6EatingControl],
    ["Q7 Lose Weight", data.q7LoseWeight],
    ["Q8 Breakfast", data.q8Breakfast],
    ["Q9 Sleep", data.q9Sleep],
    ["Q10 Brain Fog", data.q10BrainFog],
    ["Q11 Mood Swings", data.q11MoodSwings],
    ["Q12 Diet", data.q12Diet],
    ["Q13 Fermented Foods", data.q13FermentedFoods],
    ["Q14 Prebiotic Foods", data.q14PrebioticFoods],
    ["Q15 Antacids", data.q15Antacids],
    ["Q16 Pain Pills", data.q16PainPills],
    ["Q17 Antibiotics", data.q17Antibiotics],
  ];

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Contact & Attribution</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          {fields.map(([label, val]) => val ? (
            <React.Fragment key={label}>
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium break-all">{val}</span>
            </React.Fragment>
          ) : null)}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quiz Answers</h4>
        <div className="grid grid-cols-1 gap-y-1.5 text-sm">
          {qFields.map(([label, val]) => val ? (
            <div key={label} className="flex gap-2">
              <span className="text-muted-foreground w-36 shrink-0">{label}</span>
              <span className="font-medium">{val}</span>
            </div>
          ) : null)}
        </div>
      </div>
    </div>
  );
}

// ── Log Sale Dialog ───────────────────────────────────────────────────────────

function LogSaleDialog({
  submissionEmail,
  submissionId,
  submissionName,
}: {
  submissionEmail?: string;
  submissionId?: number;
  submissionName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(submissionEmail ?? "");
  const [name, setName] = useState(submissionName ?? "");
  const [product, setProduct] = useState("Healthy Edge Stack");
  const [value, setValue] = useState("149.99");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const logSale = trpc.sales.log.useMutation({
    onSuccess: () => {
      toast.success("Sale logged successfully.");
      utils.sales.list.invalidate();
      setOpen(false);
    },
    onError: () => toast.error("Failed to log sale."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !product || !value || !date) return;
    logSale.mutate({
      submissionId,
      email,
      fullName: name || undefined,
      productName: product,
      orderValue: parseFloat(value),
      orderDate: new Date(date),
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs">
          <Plus className="w-3 h-3" /> Log Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log a Sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="jane@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Input value={product} onChange={(e) => setProduct(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Order Value ($) *</Label>
              <Input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Order Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
          <Button type="submit" className="w-full" disabled={logSale.isPending}>
            {logSale.isPending ? "Saving..." : "Save Sale"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Submissions Table ─────────────────────────────────────────────────────────

function SubmissionsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [alertTier, setAlertTier] = useState<string>("");
  const [scoreBand, setScoreBand] = useState<string>("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.dashboard.submissions.useQuery({
    page,
    pageSize,
    search: search || undefined,
    alertTier: alertTier || undefined,
    scoreBand: scoreBand || undefined,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <CardTitle className="text-base font-semibold">
            All Submissions <span className="text-muted-foreground font-normal text-sm ml-1">({total})</span>
          </CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <LogSaleDialog />
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-3">
          <form onSubmit={handleSearch} className="flex gap-1.5">
            <Input
              placeholder="Search name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 w-52 text-sm"
            />
            <Button type="submit" size="sm" variant="outline" className="h-8 px-2">
              <Search className="w-3.5 h-3.5" />
            </Button>
          </form>

          <Select value={alertTier} onValueChange={(v) => { setAlertTier(v === "_all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="Alert tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All tiers</SelectItem>
              <SelectItem value="Red">Red</SelectItem>
              <SelectItem value="Yellow">Yellow</SelectItem>
              <SelectItem value="Green">Green</SelectItem>
            </SelectContent>
          </Select>

          <Select value={scoreBand} onValueChange={(v) => { setScoreBand(v === "_all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="h-8 w-40 text-sm">
              <SelectValue placeholder="Score band" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All bands</SelectItem>
              <SelectItem value="Upper_Red">Red (Upper)</SelectItem>
              <SelectItem value="Lower_Red">Red (Lower)</SelectItem>
              <SelectItem value="Yellow">Yellow</SelectItem>
              <SelectItem value="Green">Green</SelectItem>
            </SelectContent>
          </Select>

          {(search || alertTier || scoreBand) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={() => { setSearch(""); setSearchInput(""); setAlertTier(""); setScoreBand(""); setPage(1); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Alert</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Ad / Source</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No submissions found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell className="pl-4 font-medium">{row.fullName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.email}</TableCell>
                    <TableCell>{alertBadge(row.alertTier)}</TableCell>
                    <TableCell className="font-semibold">{row.totalScore}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{scoreBandLabel(row.scoreBand)}</TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate text-muted-foreground">
                      {row.adName ?? "Direct"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(row.submissionDate)}</TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex gap-1 justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => setDetailId(row.id)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle>{row.fullName} — Submission #{row.id}</DialogTitle>
                            </DialogHeader>
                            <SubmissionDetail id={row.id} />
                          </DialogContent>
                        </Dialog>
                        <LogSaleDialog
                          submissionEmail={row.email}
                          submissionId={row.id}
                          submissionName={row.fullName}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sales Log Table ───────────────────────────────────────────────────────────

function SalesLogTable() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { data, isLoading, refetch } = trpc.sales.list.useQuery({ page, pageSize });
  const utils = trpc.useUtils();
  const deleteSale = trpc.sales.delete.useMutation({
    onSuccess: () => { toast.success("Sale deleted."); utils.sales.list.invalidate(); },
    onError: () => toast.error("Failed to delete sale."),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">
          Sales Log <span className="text-muted-foreground font-normal text-sm ml-1">({total})</span>
        </CardTitle>
        <div className="flex gap-2">
          <LogSaleDialog />
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No sales logged yet. Use "Log Sale" to record a LifeVantage order.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4 font-medium">{row.fullName ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.email}</TableCell>
                    <TableCell className="text-sm">{row.productName}</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      ${Number(row.orderValue).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDate(row.orderDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{row.notes ?? "—"}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this sale record?")) deleteSale.mutate({ id: row.id });
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Funnel Analytics Section ─────────────────────────────────────────────────

function FunnelSection() {
  const { data, isLoading, refetch } = trpc.dashboard.funnelStats.useQuery();

  const steps = [
    { key: "page_view",    label: "Page Views",       color: "bg-blue-500" },
    { key: "quiz_start",   label: "Quiz Started",     color: "bg-indigo-500" },
    { key: "quiz_complete",label: "Quiz Completed",   color: "bg-violet-500" },
    { key: "vsl_view",     label: "VSL Viewed",       color: "bg-amber-500" },
    { key: "vsl_25",       label: "Video 25%",        color: "bg-orange-400" },
    { key: "vsl_50",       label: "Video 50%",        color: "bg-orange-500" },
    { key: "vsl_75",       label: "Video 75%",        color: "bg-orange-600" },
    { key: "vsl_100",      label: "Video 100%",       color: "bg-red-500" },
    { key: "order_click",  label: "Order Clicked",    color: "bg-emerald-600" },
  ] as const;

  const getValue = (key: string) =>
    isLoading ? null : (data?.[key as keyof typeof data] ?? 0) as number;

  const topValue = getValue("page_view") ?? 1;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Funnel Analytics</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const val = getValue(step.key);
            const prev = i > 0 ? (getValue(steps[i - 1].key) ?? 0) : null;
            const pctOfTop = topValue > 0 && val !== null ? Math.round((val / topValue) * 100) : 0;
            const dropPct = prev !== null && prev > 0 && val !== null
              ? Math.round(((prev - val) / prev) * 100)
              : null;

            return (
              <div key={step.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground w-36">{step.label}</span>
                    {dropPct !== null && dropPct > 0 && (
                      <span className="text-xs text-muted-foreground">↓ {dropPct}% drop</span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {val === null ? "—" : val.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${step.color}`}
                    style={{ width: `${pctOfTop}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {!isLoading && (data?.page_view ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            No funnel data yet. Events will appear here once visitors start taking the quiz.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Quiz Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stubborn Belly Fat Quiz — submissions, ad performance, and sales tracking
          </p>
        </div>

        <SummaryCards />
        <AdPerformanceTable />
        <FunnelSection />
        <SubmissionsTable />
        <SalesLogTable />
      </div>
    </DashboardLayout>
  );
}
