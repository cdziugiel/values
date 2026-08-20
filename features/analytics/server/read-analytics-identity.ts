// @humanet-ga4-mp-v1
import "server-only";

import { cookies } from "next/headers";

import { parseAnalyticsIdentity } from "../lib/analytics-identity";
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

const COOKIE_NAME = "humanet_ga_identity_v1";

export async function readAnalyticsIdentityFromRequest(): Promise<AnalyticsIdentity | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;

  if (!raw) return null;

  try {
    return parseAnalyticsIdentity(JSON.parse(decodeURIComponent(raw)) as unknown);
  } catch {
    return null;
  }
}
