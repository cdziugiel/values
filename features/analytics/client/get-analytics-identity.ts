// @humanet-ga4-mp-v1
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function getGtagField(
  measurementId: string,
  field: "client_id" | "session_id",
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!window.gtag) {
      resolve(null);
      return;
    }

    const timeout = window.setTimeout(() => resolve(null), 1500);

    window.gtag("get", measurementId, field, (value: unknown) => {
      window.clearTimeout(timeout);

      if (typeof value === "string" || typeof value === "number") {
        resolve(String(value));
        return;
      }

      resolve(null);
    });
  });
}

export async function getAnalyticsIdentity(): Promise<AnalyticsIdentity | null> {
  if (typeof window === "undefined") return null;

  const measurementId =
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

  if (!measurementId || !window.gtag) return null;

  const [clientId, sessionId] = await Promise.all([
    getGtagField(measurementId, "client_id"),
    getGtagField(measurementId, "session_id"),
  ]);

  if (!clientId) return null;

  return {
    clientId: clientId.slice(0, 100),
    sessionId: sessionId && /^\d+$/.test(sessionId) ? sessionId : null,
    capturedAt: new Date().toISOString(),
  };
}
