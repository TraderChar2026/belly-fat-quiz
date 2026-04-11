import { useEffect, useState } from "react";

export interface AttributionData {
  sessionId: string;
  timezone: string;
  adName?: string;
  adNameRaw?: string;
  referrerUrl?: string;
  referrerPlatform?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmId?: string;
  utmTerm?: string;
  fbclid?: string;
  fbEventId?: string;
  pageUrl?: string;
}

/** Generate a random session ID */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalize referrer URL to a platform name */
function detectPlatform(referrer: string, utmSource?: string): string {
  const src = (utmSource ?? referrer ?? "").toLowerCase();
  if (src.includes("facebook") || src.includes("fb.com")) return "Facebook";
  if (src.includes("instagram")) return "Instagram";
  if (src.includes("threads")) return "Threads";
  if (src.includes("google")) return "Google";
  if (src.includes("youtube")) return "YouTube";
  if (src.includes("tiktok")) return "TikTok";
  if (referrer && referrer !== "") return "Referral";
  return "Direct";
}

const SESSION_KEY = "bfq_session_id";
const ATTRIBUTION_KEY = "bfq_attribution";

export function useAttribution(): AttributionData {
  const [attribution, setAttribution] = useState<AttributionData>(() => {
    // Try to restore from sessionStorage (persists across page reloads in same tab)
    try {
      const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
      if (stored) return JSON.parse(stored) as AttributionData;
    } catch {}

    // Build fresh attribution from URL params
    const params = new URLSearchParams(window.location.search);

    // Session ID — persist in sessionStorage so it survives quiz navigation
    let sessionId = sessionStorage.getItem(SESSION_KEY) ?? "";
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }

    const adNameRaw = params.get("ad_name") ?? undefined;
    const utmSource = params.get("utm_source") ?? undefined;
    const utmMedium = params.get("utm_medium") ?? undefined;
    const utmCampaign = params.get("utm_campaign") ?? undefined;
    const utmId = params.get("utm_id") ?? undefined;
    const utmTerm = params.get("utm_term") ?? undefined;
    const fbclid = params.get("fbclid") ?? undefined;
    const fbEventId = params.get("fb_event_id") ?? undefined;
    const referrerUrl = document.referrer || undefined;
    const referrerPlatform = detectPlatform(document.referrer ?? "", utmSource);

    const data: AttributionData = {
      sessionId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      adNameRaw,
      referrerUrl,
      referrerPlatform,
      utmSource,
      utmMedium,
      utmCampaign,
      utmId,
      utmTerm,
      fbclid,
      fbEventId,
      pageUrl: window.location.href,
    };

    // Persist so it survives navigation within the quiz
    try {
      sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(data));
    } catch {}

    return data;
  });

  useEffect(() => {
    // Nothing to do — attribution is captured once on load
  }, []);

  return attribution;
}
