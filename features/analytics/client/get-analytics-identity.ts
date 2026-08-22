// @humanet-ga4-mp-v1
// @humanet-ga4-identity-cookie-fallback-v1.2
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function readBrowserCookies(): Map<string, string> {
  const result = new Map<string, string>();

  if (typeof document === "undefined") return result;

  for (const part of document.cookie.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;

    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (!name) continue;
    result.set(name, safeDecode(value));
  }

  return result;
}

function parseGaClientId(value: string | null | undefined): string | null {
  if (!value) return null;

  const parts = safeDecode(value).split(".");
  if (parts.length < 2) return null;

  const high = parts.at(-2) ?? "";
  const low = parts.at(-1) ?? "";

  if (!/^\\d+$/.test(high) || !/^\\d+$/.test(low)) return null;

  const clientId = `${high}.${low}`;
  return clientId.length <= 100 ? clientId : null;
}

function parseGaSessionId(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = safeDecode(value);

  // Current GA4 cookie format, e.g. GS2.1.s1787417130$o1$g1$t...
  const gs2 = normalized.match(/(?:^|[.$])s(\\d+)(?=[$.]|$)/);
  if (gs2?.[1]) return gs2[1];

  // Older GA4 cookie format, e.g. GS1.1.1787417130.1.1....
  const gs1 = normalized.match(/^GS\\d+\\.\\d+\\.(\\d+)/);
  if (gs1?.[1]) return gs1[1];

  return null;
}

function normalizeMeasurementSuffix(measurementId: string | null): string | null {
  if (!measurementId) return null;

  const suffix = measurementId
    .replace(/^G-/i, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  return suffix || null;
}

function findGaSessionCookie(
  cookies: Map<string, string>,
  measurementId: string | null,
): string | null {
  const suffix = normalizeMeasurementSuffix(measurementId);

  if (suffix) {
    const exact = cookies.get(`_ga_${suffix}`);
    if (exact) return exact;
  }

  const candidates = [...cookies.entries()].filter(([name]) =>
    /^_ga_[A-Za-z0-9]+$/.test(name),
  );

  // Never guess when several GA4 properties share the same domain.
  return candidates.length === 1 ? candidates[0][1] : null;
}

function getAnalyticsIdentityFromCookies(
  measurementId: string | null,
): AnalyticsIdentity | null {
  const cookies = readBrowserCookies();
  const clientId = parseGaClientId(cookies.get("_ga"));

  if (!clientId) return null;

  const sessionId = parseGaSessionId(
    findGaSessionCookie(cookies, measurementId),
  );

  return {
    clientId,
    sessionId,
    capturedAt: new Date().toISOString(),
  };
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

    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timeout = window.setTimeout(() => finish(null), 1000);

    window.gtag("get", measurementId, field, (value: unknown) => {
      window.clearTimeout(timeout);

      if (typeof value === "string" || typeof value === "number") {
        finish(String(value));
        return;
      }

      finish(null);
    });
  });
}

async function getAnalyticsIdentityFromGtag(
  measurementId: string | null,
): Promise<AnalyticsIdentity | null> {
  if (!measurementId || !window.gtag) return null;

  const [clientId, sessionId] = await Promise.all([
    getGtagField(measurementId, "client_id"),
    getGtagField(measurementId, "session_id"),
  ]);

  if (!clientId) return null;

  return {
    clientId: clientId.slice(0, 100),
    sessionId: sessionId && /^\\d+$/.test(sessionId) ? sessionId : null,
    capturedAt: new Date().toISOString(),
  };
}

export async function getAnalyticsIdentity(): Promise<AnalyticsIdentity | null> {
  if (typeof window === "undefined") return null;

  const measurementId =
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ||
    null;

  // GTM-managed GA4 does not guarantee that gtag("get", ...) invokes its callback.
  // Standard GA cookies are therefore the fastest and most robust source when present.
  const cookieIdentity = getAnalyticsIdentityFromCookies(measurementId);
  if (cookieIdentity) return cookieIdentity;

  return getAnalyticsIdentityFromGtag(measurementId);
}
