// @humanet-ga4-mp-v1
import "server-only";

import { findForbiddenAnalyticsParam } from "../lib/ga4-privacy";
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

export type Ga4EventInput = {
  identity: AnalyticsIdentity;
  name: string;
  params?: Record<string, unknown>;
  occurredAt?: Date;
};

export type Ga4SendResult = {
  sent: boolean;
  status: number | null;
};

export type Ga4ValidationMessage = {
  fieldPath?: string;
  description?: string;
  validationCode?: string;
};

function analyticsEnabled(): boolean {
  return Boolean(
    process.env.GA4_MEASUREMENT_ID?.trim() &&
      process.env.GA4_API_SECRET?.trim(),
  );
}

function currentSessionId(identity: AnalyticsIdentity): number | null {
  if (!identity.sessionId || !/^\d+$/.test(identity.sessionId)) return null;

  const capturedAt = new Date(identity.capturedAt).getTime();
  if (!Number.isFinite(capturedAt)) return null;

  const age = Date.now() - capturedAt;
  if (age < 0 || age > 24 * 60 * 60 * 1000) return null;

  const value = Number(identity.sessionId);
  return Number.isSafeInteger(value) ? value : null;
}

function validEventName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(name);
}

function buildBody({
  identity,
  name,
  params = {},
  occurredAt,
}: Ga4EventInput): Record<string, unknown> | null {
  if (!validEventName(name)) return null;

  const forbidden = findForbiddenAnalyticsParam(params);
  if (forbidden) {
    console.error("GA4_MP_BLOCKED_FORBIDDEN_PARAM", {
      eventName: name,
      blockedParam: forbidden,
    });
    return null;
  }

  const sessionId = currentSessionId(identity);
  const eventParams: Record<string, unknown> = {
    ...params,
    engagement_time_msec: 1,
  };

  if (sessionId !== null) {
    eventParams.session_id = sessionId;
  }

  const timestamp =
    occurredAt && Number.isFinite(occurredAt.getTime())
      ? occurredAt.getTime() * 1000
      : null;

  return {
    client_id: identity.clientId,
    consent: {
      ad_user_data: "DENIED",
      ad_personalization: "DENIED",
    },
    ...(timestamp !== null ? { timestamp_micros: timestamp } : {}),
    events: [{ name, params: eventParams }],
  };
}

async function postGa4(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const measurementId = process.env.GA4_MEASUREMENT_ID!.trim();
  const apiSecret = process.env.GA4_API_SECRET!.trim();

  return fetch(
    `${endpoint}?measurement_id=${encodeURIComponent(
      measurementId,
    )}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    },
  );
}

export async function sendGa4ServerEvent(
  input: Ga4EventInput,
): Promise<Ga4SendResult> {
  if (!analyticsEnabled()) return { sent: false, status: null };

  const body = buildBody(input);
  if (!body) return { sent: false, status: null };

  const endpoint =
    process.env.GA4_MP_ENDPOINT?.trim() ||
    "https://region1.google-analytics.com/mp/collect";

  try {
    const response = await postGa4(endpoint, body);
    return { sent: response.ok, status: response.status };
  } catch (error) {
    console.error("GA4_MP_SEND_FAILED", {
      eventName: input.name,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { sent: false, status: null };
  }
}

export async function validateGa4ServerEvent(
  input: Ga4EventInput,
): Promise<{
  valid: boolean;
  status: number | null;
  messages: Ga4ValidationMessage[];
}> {
  if (process.env.NODE_ENV === "production" || !analyticsEnabled()) {
    return { valid: false, status: null, messages: [] };
  }

  const body = buildBody(input);
  if (!body) return { valid: false, status: null, messages: [] };

  const endpoint =
    process.env.GA4_MP_DEBUG_ENDPOINT?.trim() ||
    "https://region1.google-analytics.com/debug/mp/collect";

  try {
    const response = await postGa4(endpoint, body);
    const payload = (await response.json().catch(() => null)) as
      | { validationMessages?: Ga4ValidationMessage[] }
      | null;
    const messages = Array.isArray(payload?.validationMessages)
      ? payload.validationMessages
      : [];

    return {
      valid: response.ok && messages.length === 0,
      status: response.status,
      messages,
    };
  } catch {
    return { valid: false, status: null, messages: [] };
  }
}
