import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { MousePointerClick, Mail, Phone, RefreshCw } from "lucide-react";

const TIER_COLORS: Record<string, string> = {
  Red: "bg-red-100 text-red-800",
  Yellow: "bg-yellow-100 text-yellow-800",
  Green: "bg-green-100 text-green-800",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function DashboardOrderClickers() {
  const { data, isLoading, error, refetch } = trpc.dashboard.orderClickers.useQuery();

  const rows = data ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MousePointerClick className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Order Clickers</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                People who clicked "Order Now" on a VSL page — tagged as <strong>order clicked</strong> in AwesomeCRM
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md border hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Summary badge */}
        {!isLoading && (
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
            <MousePointerClick className="h-4 w-4" />
            {rows.length} {rows.length === 1 ? "person" : "people"} clicked Order Now
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              Loading order clickers...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-destructive text-sm">
              Failed to load data. Please refresh.
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <MousePointerClick className="h-10 w-10 opacity-30" />
              <p className="text-sm">No order clicks recorded yet.</p>
              <p className="text-xs">When someone clicks "Order Now" on a VSL page, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Country</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Alert Tier</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ad Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clicked At</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.eventId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {row.fullName ?? <span className="text-muted-foreground italic">Unknown</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.email ? (
                          <a
                            href={`mailto:${row.email}`}
                            className="flex items-center gap-1.5 text-primary hover:underline"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {row.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.phone ? (
                          <a
                            href={`tel:${row.phone}`}
                            className="flex items-center gap-1.5 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {row.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground" title={(row as any).countryName ?? ""}>
                        {(row as any).countryName ?? (row as any).country ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.alertTier ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[row.alertTier] ?? "bg-gray-100 text-gray-700"}`}>
                            {row.alertTier} Alert
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {row.totalScore != null ? `${row.totalScore} / 51` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.adName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(row.clickedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Each person listed here has been automatically tagged as <strong>order clicked</strong> in AwesomeCRM, allowing you to trigger a follow-up automation sequence.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
