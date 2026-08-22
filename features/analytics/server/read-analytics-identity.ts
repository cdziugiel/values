// @humanet-ga4-mp-v1
// @humanet-ga4-server-cookie-identity-v1.3
import "server-only";

import { cookies } from "next/headers";

import { parseAnalyticsIdentity } from "../lib/analytics-identity";
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

const CUSTOM_IDENTITY_COOKIE_NAME = "humanet_ga_identity_v1";
const GA_CLIENT_COOKIE_NAME = "_ga";

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseGaClientId(value: string | null | undefined): string | null {
  if (!value) return null;

  const parts = safeDecode(value).split(".");
  if (parts.length < 2) return null;

  const high = parts.at(-2) ?? "";
  const low = parts.at(-1) ?? "";

  if (!/^\d+$/.test(high) || !/^\d+$/.test(low)) return null;

  const clientId = `${high}.${low}`;
  return clientId.length <= 100 ? clientId : null;
}

function parseGaSessionId(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = safeDecode(value);

  // Current GA4 cookie format, e.g. GS2.1.s1787418190$o1$g1$t...
  const gs2 = normalized.match(/(?:^|[.$])s(\d+)(?=[$.]|$)/);
  if (gs2?.[1]) return gs2[1];

  // Older GA4 cookie format, e.g. GS1.1.1787418190.1.1....
  const gs1 = normalized.match(/^GS\d+\.\d+\.(\d+)/);
  if (gs1?.[1]) return gs1[1];

  return null;
}

function gaSessionCookieName(measurementId: string | null | undefined): string | null {
  const normalized = measurementId?.trim();
  if (!normalized) return null;

  const suffix = normalized
    .replace(/^G-/i, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();

  return suffix ? `_ga_${suffix}` : null;
}

function parseCustomIdentity(raw: string | null | undefined): AnalyticsIdentity | null {
  if (!raw) return null;

  try {
    return parseAnalyticsIdentity(JSON.parse(safeDecode(raw)) as unknown);
  } catch {
    return null;
  }
}

export async function readAnalyticsIdentityFromRequest(): Promise<AnalyticsIdentity | null> {
  const store = await cookies();

  /**
   * Source of truth for server-side GA4 events is the standard first-party GA cookie.
   * This removes the production dependency on a client-side helper cookie and works
   * when GA4 is loaded through GTM, where gtag("get", ...) may not return identity.
   */
  const clientId = parseGaClientId(store.get(GA_CLIENT_COOKIE_NAME)?.value);

  if (clientId) {
    const configuredSessionCookieName = gaSessionCookieName(
      process.env.GA4_MEASUREMENT_ID,
    );

    let sessionCookieValue = configuredSessionCookieName
      ? store.get(configuredSessionCookieName)?.value ?? null
      : null;

    if (!sessionCookieValue) {
      const candidates = store
        .getAll()
        .filter((cookie) => /^_ga_[A-Za-z0-9]+$/.test(cookie.name));

      // If there is only one GA4 stream cookie on the domain, it is unambiguous.
      if (candidates.length === 1) {
        sessionCookieValue = candidates[0]?.value ?? null;
      }
    }

    return {
      clientId,
      sessionId: parseGaSessionId(sessionCookieValue),
      capturedAt: new Date().toISOString(),
    };
  }

  // Backward-compatible fallback for sessions that already have the helper cookie.
  return parseCustomIdentity(store.get(CUSTOM_IDENTITY_COOKIE_NAME)?.value);
}
