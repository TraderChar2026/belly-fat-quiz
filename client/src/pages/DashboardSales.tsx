import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function LogSaleDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
      setEmail(""); setName(""); setNotes("");
    },
    onError: () => toast.error("Failed to log sale."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !product || !value || !date) return;
    logSale.mutate({
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
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Log New Sale
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

export default function DashboardSales() {
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

  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.orderValue), 0);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              Sales Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manually log LifeVantage orders against quiz submissions
            </p>
          </div>
          <LogSaleDialog />
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Sales Logged</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-emerald-700">${totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Total Revenue (this page)</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">
              Sales Records <span className="text-muted-foreground font-normal text-sm ml-1">({total})</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
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
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <p className="font-medium">No sales logged yet</p>
                          <p className="text-xs">Use the "Log New Sale" button to record a LifeVantage order.</p>
                        </div>
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
      </div>
    </DashboardLayout>
  );
}
