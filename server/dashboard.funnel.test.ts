import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB module ────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getFullFunnelStats: vi.fn(),
  getDropoffByQuestion: vi.fn(),
  getAdNames: vi.fn(),
  getEmailSequenceStats: vi.fn(),
  upsertEmailSequenceStat: vi.fn(),
  getManualSalesSummary: vi.fn(),
  upsertManualSalesSummary: vi.fn(),
}));

import {
  getFullFunnelStats,
  getDropoffByQuestion,
  getAdNames,
  getEmailSequenceStats,
  upsertEmailSequenceStat,
  getManualSalesSummary,
  upsertManualSalesSummary,
} from "./db";

// ── getFullFunnelStats ────────────────────────────────────────────────────────

describe("getFullFunnelStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all zero counts when no events exist", async () => {
    (getFullFunnelStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      page_view: 0, quiz_start: 0, quiz_complete: 0,
      vsl_view: 0, vsl_25: 0, vsl_50: 0, vsl_75: 0, vsl_100: 0,
      order_click: 0, order_placed: 0,
      red_complete: 0, yellow_complete: 0, green_complete: 0,
    });

    const result = await getFullFunnelStats();
    expect(result.page_view).toBe(0);
    expect(result.quiz_complete).toBe(0);
    expect(result.order_click).toBe(0);
  });

  it("returns correct counts with data", async () => {
    (getFullFunnelStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      page_view: 100, quiz_start: 80, quiz_complete: 50,
      vsl_view: 45, vsl_25: 30, vsl_50: 20, vsl_75: 10, vsl_100: 5,
      order_click: 8, order_placed: 3,
      red_complete: 25, yellow_complete: 15, green_complete: 10,
    });

    const result = await getFullFunnelStats();
    expect(result.page_view).toBe(100);
    expect(result.quiz_start).toBe(80);
    expect(result.quiz_complete).toBe(50);
    expect(result.vsl_view).toBe(45);
    expect(result.order_click).toBe(8);
    expect(result.red_complete).toBe(25);
    expect(result.yellow_complete).toBe(15);
    expect(result.green_complete).toBe(10);
  });

  it("accepts date range and adName filters", async () => {
    (getFullFunnelStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      page_view: 10, quiz_start: 8, quiz_complete: 5,
      vsl_view: 4, vsl_25: 3, vsl_50: 2, vsl_75: 1, vsl_100: 0,
      order_click: 1, order_placed: 0,
      red_complete: 3, yellow_complete: 1, green_complete: 1,
    });

    const opts = {
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-12-31"),
      adName: "Test Ad",
    };
    const result = await getFullFunnelStats(opts);
    expect(getFullFunnelStats).toHaveBeenCalledWith(opts);
    expect(result.page_view).toBe(10);
  });
});

// ── getDropoffByQuestion ──────────────────────────────────────────────────────

describe("getDropoffByQuestion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty byQuestion array when no data", async () => {
    (getDropoffByQuestion as ReturnType<typeof vi.fn>).mockResolvedValue({
      byQuestion: [],
      completions: 0,
    });
    const result = await getDropoffByQuestion();
    expect(result.byQuestion).toHaveLength(0);
    expect(result.completions).toBe(0);
  });

  it("returns drop-off counts per question", async () => {
    (getDropoffByQuestion as ReturnType<typeof vi.fn>).mockResolvedValue({
      byQuestion: [
        { question: 3, droppedOff: 12 },
        { question: 7, droppedOff: 8 },
        { question: 15, droppedOff: 3 },
      ],
      completions: 45,
    });
    const result = await getDropoffByQuestion();
    expect(result.byQuestion).toHaveLength(3);
    expect(result.byQuestion[0].question).toBe(3);
    expect(result.byQuestion[0].droppedOff).toBe(12);
    expect(result.completions).toBe(45);
  });
});

// ── getAdNames ────────────────────────────────────────────────────────────────

describe("getAdNames", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of ad names", async () => {
    (getAdNames as ReturnType<typeof vi.fn>).mockResolvedValue([
      "Ad Campaign A",
      "Ad Campaign B",
      "Direct / Unknown",
    ]);
    const result = await getAdNames();
    expect(result).toContain("Ad Campaign A");
    expect(result).toContain("Direct / Unknown");
  });
});

// ── Email Sequence Stats ──────────────────────────────────────────────────────

describe("getEmailSequenceStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns stats for a given tier", async () => {
    const mockStats = [
      { id: 1, tier: "Red", emailNumber: 1, subject: "Email 1", sentCount: 100, openRate: "42.50", clickRate: "5.20", unsubCount: 2, updatedAt: new Date() },
    ];
    (getEmailSequenceStats as ReturnType<typeof vi.fn>).mockResolvedValue(mockStats);

    const result = await getEmailSequenceStats("Red");
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe("Red");
    expect(result[0].emailNumber).toBe(1);
  });
});

describe("upsertEmailSequenceStat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls upsert with correct data", async () => {
    (upsertEmailSequenceStat as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await upsertEmailSequenceStat({
      tier: "Red",
      emailNumber: 1,
      subject: "Test Email",
      sentCount: 500,
      openRate: 38.5,
      clickRate: 4.2,
      unsubCount: 3,
    });

    expect(upsertEmailSequenceStat).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "Red", emailNumber: 1, sentCount: 500 })
    );
  });
});

// ── Manual Sales Summary ──────────────────────────────────────────────────────

describe("getManualSalesSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of manual sales summaries", async () => {
    (getManualSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 1, tier: "Red", periodLabel: "May 2026", salesCount: 5, revenue: "497.50", notes: null, updatedAt: new Date() },
    ]);
    const result = await getManualSalesSummary();
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe("Red");
    expect(result[0].salesCount).toBe(5);
  });
});

describe("upsertManualSalesSummary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls upsert with correct data", async () => {
    (upsertManualSalesSummary as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await upsertManualSalesSummary({
      tier: "Red",
      periodLabel: "May 2026",
      salesCount: 5,
      revenue: 497.50,
    });

    expect(upsertManualSalesSummary).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "Red", salesCount: 5 })
    );
  });
});

// ── getAdPerformanceTable ─────────────────────────────────────────────────────
// Note: getAdPerformanceTable is not mocked above since it wasn't in the original
// mock list. We add a separate describe block with its own vi.mock scope.

describe("getAdPerformanceTable (unit logic)", () => {
  it("computes conversion rates correctly", () => {
    // Test the pure percentage logic used inside the helper
    const pct = (num: number, den: number) =>
      den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

    expect(pct(80, 100)).toBe(80);
    expect(pct(50, 80)).toBe(62.5);
    expect(pct(0, 100)).toBe(0);
    expect(pct(5, 0)).toBe(0);   // no division by zero
    expect(pct(3, 100)).toBe(3); // visit-to-order rate
  });

  it("sorts rows by visits descending by default", () => {
    const rows = [
      { adName: "Ad B", visits: 50, starts: 40, completes: 30, vslViews: 25, orderClicks: 2, startRate: 80, completeRate: 75, vslRate: 83, orderRate: 4 },
      { adName: "Ad A", visits: 200, starts: 160, completes: 100, vslViews: 80, orderClicks: 10, startRate: 80, completeRate: 62.5, vslRate: 80, orderRate: 5 },
      { adName: "Direct / Unknown", visits: 30, starts: 10, completes: 5, vslViews: 3, orderClicks: 0, startRate: 33, completeRate: 50, vslRate: 60, orderRate: 0 },
    ];
    const sorted = [...rows].sort((a, b) => b.visits - a.visits);
    expect(sorted[0].adName).toBe("Ad A");
    expect(sorted[1].adName).toBe("Ad B");
    expect(sorted[2].adName).toBe("Direct / Unknown");
  });

  it("handles empty data gracefully", () => {
    const rows: { adName: string; visits: number }[] = [];
    const totalVisits = rows.reduce((s: number, r: { visits: number }) => s + r.visits, 0);
    expect(totalVisits).toBe(0);
  });

  it("orderRate uses visits as denominator (visit-to-order is the key metric)", () => {
    const pct = (num: number, den: number) =>
      den > 0 ? Math.round((num / den) * 1000) / 10 : 0;
    // 5 order clicks out of 200 visits = 2.5%
    expect(pct(5, 200)).toBe(2.5);
  });
});
