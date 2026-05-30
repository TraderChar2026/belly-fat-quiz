import { ENV } from "./_core/env";

export interface WistiaVideoStats {
  id: number;
  hashedId: string;
  name: string;
  pageLoads: number;
  visitors: number;
  percentOfVisitorsClickingPlay: number;
  plays: number;
  averagePercentWatched: number;
}

export async function getWistiaVideoStats(
  hashedId: string
): Promise<WistiaVideoStats | null> {
  const token = ENV.wistiaApiToken;
  if (!token) return null;

  const res = await fetch(
    `https://api.wistia.com/modern/medias/${hashedId}/stats`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Wistia-API-Version": "2026-03",
        accept: "application/json",
      },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  return {
    id: data.id,
    hashedId: data.hashed_id,
    name: data.name,
    pageLoads: data.stats?.pageLoads ?? 0,
    visitors: data.stats?.visitors ?? 0,
    percentOfVisitorsClickingPlay:
      data.stats?.percentOfVisitorsClickingPlay ?? 0,
    plays: data.stats?.plays ?? 0,
    averagePercentWatched: data.stats?.averagePercentWatched ?? 0,
  };
}

export async function getBothVSLStats(): Promise<{
  red: WistiaVideoStats | null;
  yellow: WistiaVideoStats | null;
}> {
  const [red, yellow] = await Promise.all([
    getWistiaVideoStats(ENV.wistiaRedVideoId),
    getWistiaVideoStats(ENV.wistiaYellowVideoId),
  ]);
  return { red, yellow };
}
