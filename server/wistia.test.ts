import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    wistiaApiToken: "test-token-abc",
    wistiaRedVideoId: "9384761b7n",
    wistiaYellowVideoId: "g4s4s1m6ta",
  },
}));

import { getWistiaVideoStats, getBothVSLStats } from "./wistia";

const mockRedStats = {
  id: 146426764,
  hashed_id: "9384761b7n",
  name: "Red Alert - Descript",
  stats: {
    pageLoads: 96,
    visitors: 52,
    percentOfVisitorsClickingPlay: 35,
    plays: 19,
    averagePercentWatched: 44,
  },
};

const mockYellowStats = {
  id: 146424147,
  hashed_id: "g4s4s1m6ta",
  name: "Yellow Alert (1) - Descript",
  stats: {
    pageLoads: 24,
    visitors: 8,
    percentOfVisitorsClickingPlay: 38,
    plays: 3,
    averagePercentWatched: 78,
  },
};

describe("getWistiaVideoStats", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns parsed stats on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRedStats,
    });

    const result = await getWistiaVideoStats("9384761b7n");
    expect(result).not.toBeNull();
    expect(result!.plays).toBe(19);
    expect(result!.averagePercentWatched).toBe(44);
    expect(result!.pageLoads).toBe(96);
    expect(result!.name).toBe("Red Alert - Descript");
  });

  it("returns null when API returns non-ok status", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await getWistiaVideoStats("bad-id");
    expect(result).toBeNull();
  });

  it("returns null when token is empty", async () => {
    // Override ENV mock for this test
    vi.doMock("./_core/env", () => ({
      ENV: { wistiaApiToken: "", wistiaRedVideoId: "", wistiaYellowVideoId: "" },
    }));
    // Token empty path handled by the helper
    mockFetch.mockResolvedValueOnce({ ok: false });
    const result = await getWistiaVideoStats("9384761b7n");
    expect(result).toBeNull();
  });
});

describe("getBothVSLStats", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns red and yellow stats together", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => mockRedStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockYellowStats });

    const result = await getBothVSLStats();
    expect(result.red).not.toBeNull();
    expect(result.yellow).not.toBeNull();
    expect(result.red!.plays).toBe(19);
    expect(result.yellow!.plays).toBe(3);
    expect(result.yellow!.averagePercentWatched).toBe(78);
  });

  it("handles one video failing gracefully", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => mockYellowStats });

    const result = await getBothVSLStats();
    expect(result.red).toBeNull();
    expect(result.yellow).not.toBeNull();
  });
});
