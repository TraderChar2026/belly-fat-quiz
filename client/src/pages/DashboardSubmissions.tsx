import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Search, ChevronLeft, ChevronRight, Plus,
  RefreshCw, Eye, Trash2,
} from "lucide-react";

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

export default function DashboardSubmissions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [alertTier, setAlertTier] = useState<string>("");
  const [scoreBand, setScoreBand] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const pageSize = 20;

  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.dashboard.submissions.useQuery({
    page,
    pageSize,
    search: search || undefined,
    alertTier: alertTier || undefined,
    scoreBand: scoreBand || undefined,
  });

  const deleteSubmissions = trpc.dashboard.deleteSubmissions.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.deleted} submission${result.deleted === 1 ? "" : "s"} deleted.`);
      setSelectedIds(new Set());
      utils.dashboard.submissions.invalidate();
      utils.dashboard.summary.invalidate();
      utils.dashboard.adPerformance.invalidate();
    },
    onError: () => toast.error("Failed to delete submissions."),
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const allPageIds = rows.map((r) => r.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    deleteSubmissions.mutate({ ids });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Submissions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            All quiz submissions — searchable, filterable, with full detail view
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-base font-semibold">
                All Submissions <span className="text-muted-foreground font-normal text-sm ml-1">({total})</span>
              </CardTitle>
              <div className="flex flex-wrap gap-2 items-center">
                {selectedIds.size > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1.5 text-xs">
                        <Trash2 className="w-3 h-3" /> Delete Selected ({selectedIds.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedIds.size} submission{selectedIds.size === 1 ? "" : "s"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove {selectedIds.size === 1 ? "this submission" : `these ${selectedIds.size} submissions`} from the database. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleBulkDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <LogSaleDialog />
                <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>
            </div>

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
                    <TableHead className="pl-4 w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Select all on this page"
                        className={someSelected && !allSelected ? "opacity-50" : ""}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
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
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                        No submissions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={`hover:bg-muted/30 ${selectedIds.has(row.id) ? "bg-muted/20" : ""}`}
                      >
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={selectedIds.has(row.id)}
                            onCheckedChange={() => toggleOne(row.id)}
                            aria-label={`Select submission from ${row.fullName}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.fullName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.phone ?? "—"}</TableCell>
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
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} · {total} total
                </p>
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
      </div>
    </DashboardLayout>
  );
}
