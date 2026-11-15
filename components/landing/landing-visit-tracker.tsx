"use client";

import { useLiveHeartbeat } from "./use-live-heartbeat";

/**
 * Keeps the landing visit live on pages that belong to a landing but are not the landing itself —
 * the order thank-you page (/order/success?l=slug). Same visit as the landing (same browser id), so
 * Live Visitors shows the person as "on the thank-you page" of that landing.
 */
export function LandingVisitTracker({ landingId }: { landingId: number }) {
  useLiveHeartbeat(landingId, landingId > 0);
  return null;
}
