// @humanet-ga4-mp-v1
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseAnalyticsIdentity(value: unknown): AnalyticsIdentity | null {
  if (!isRecord(value)) return null;

  const clientId =
    typeof value.clientId === "string" ? value.clientId.trim() : "";
  const capturedAt =
    typeof value.capturedAt === "string" ? value.capturedAt.trim() : "";

  if (!clientId || !capturedAt || !Number.isFinite(new Date(capturedAt).getTime())) {
    return null;
  }

  const sessionId =
    typeof value.sessionId === "string" && /^\d+$/.test(value.sessionId)
      ? value.sessionId
      : null;

  return {
    clientId: clientId.slice(0, 100),
    sessionId,
    capturedAt,
  };
}

export function readAnalyticsIdentityFromMetadata(
  metadata: unknown,
): AnalyticsIdentity | null {
  if (!isRecord(metadata)) return null;
  return parseAnalyticsIdentity(metadata.analyticsIdentity);
}
