#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const INSTALLER_ID = "humanet-values-ga4-mp-v1";
const MARKER = "@humanet-ga4-mp-v1";
const root = process.cwd();
const args = process.argv.slice(2);
const command = args.find((arg) => !arg.startsWith("--")) ?? "install";
const force = args.includes("--force");
const full = args.includes("--full");

const backupRoot = path.join(root, ".humanet-installer-backups", INSTALLER_ID);
let activeRunDir = null;
let manifest = null;
const snapshotted = new Set();

function fail(message) {
  throw new Error(message);
}

function relPath(value) {
  return value.split(path.sep).join("/");
}

function abs(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  if (!exists(rel)) fail(`Brak wymaganego pliku: ${rel}`);
  return fs.readFileSync(abs(rel), "utf8");
}

function sha256Buffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function fileSha256(rel) {
  if (!exists(rel)) return null;
  return sha256Buffer(fs.readFileSync(abs(rel)));
}

function ensureParent(rel) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeManifest() {
  if (!activeRunDir || !manifest) return;
  fs.writeFileSync(
    path.join(activeRunDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

function snapshot(rel) {
  rel = relPath(rel);
  if (snapshotted.has(rel)) return;
  snapshotted.add(rel);

  const source = abs(rel);
  const existed = fs.existsSync(source);
  const change = {
    path: rel,
    existed,
    originalSha256: existed ? sha256Buffer(fs.readFileSync(source)) : null,
    installedSha256: null,
  };

  if (existed) {
    const backupFile = path.join(activeRunDir, "files", rel);
    fs.mkdirSync(path.dirname(backupFile), { recursive: true });
    fs.copyFileSync(source, backupFile);
  }

  manifest.changes.push(change);
  writeManifest();
}

function writeTracked(rel, content) {
  snapshot(rel);
  ensureParent(rel);
  fs.writeFileSync(abs(rel), content, "utf8");
}

function replaceOnce(rel, needle, replacement, label = needle.slice(0, 80)) {
  const text = read(rel);
  const first = text.indexOf(needle);
  if (first < 0) fail(`Nie znaleziono bezpiecznego anchoru w ${rel}: ${label}`);
  const second = text.indexOf(needle, first + needle.length);
  if (second >= 0) fail(`Anchor nie jest unikalny w ${rel}: ${label}`);
  writeTracked(rel, `${text.slice(0, first)}${replacement}${text.slice(first + needle.length)}`);
}

function assertRepo() {
  const pkg = JSON.parse(read("package.json"));
  if (pkg.name !== "humanet-values") {
    fail(`Uruchom instalator w katalogu repozytorium values. Wykryto package.json name=${pkg.name ?? "?"}`);
  }

  for (const rel of [
    "app/layout.tsx",
    "features/consent/components/dynamic-analytics.tsx",
    "features/consent/lib/consent-cookie.ts",
    "features/purchase-flow/api/start-purchase-flow.action.ts",
    "features/purchase-flow/api/purchase-flow.mutations.ts",
    "features/purchase-flow/types/purchase-flow.types.ts",
    "features/report-access/api/report-access-purchase.actions.ts",
    "features/purchase-flow/components/purchase-analytics.tsx",
    "features/purchase-flow/server.ts",
    "app/api/webhooks/calcom/route.ts",
    "drizzle/schema/control/consent-records.ts",
  ]) {
    if (!exists(rel)) fail(`Repozytorium nie ma oczekiwanej struktury: ${rel}`);
  }
}

function restoreFromManifest(runDir, data, { requireInstalledHash, forceRestore }) {
  const drift = [];
  for (const change of data.changes ?? []) {
    const current = fileSha256(change.path);
    if (
      requireInstalledHash &&
      change.installedSha256 &&
      current !== change.installedSha256
    ) {
      drift.push({ path: change.path, current, expected: change.installedSha256 });
    }
  }

  if (drift.length && !forceRestore) {
    fail(
      `Rollback zatrzymany: po instalacji zmieniono ${drift.length} plik(i/ów):\n` +
      `${drift.map((item) => ` - ${item.path}`).join("\n")}\n` +
      `Użyj --force tylko jeśli świadomie chcesz nadpisać późniejsze zmiany.`,
    );
  }

  for (const change of [...(data.changes ?? [])].reverse()) {
    const target = abs(change.path);
    if (change.existed) {
      const backupFile = path.join(runDir, "files", change.path);
      if (!fs.existsSync(backupFile)) fail(`Brak kopii zapasowej: ${backupFile}`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(backupFile, target);
    } else if (fs.existsSync(target)) {
      fs.rmSync(target, { force: true });
    }
  }
}

function latestInstalledRun() {
  if (!fs.existsSync(backupRoot)) return null;
  const candidates = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const runDir = path.join(backupRoot, entry.name);
      const manifestPath = path.join(runDir, "manifest.json");
      if (!fs.existsSync(manifestPath)) return null;
      try {
        return { runDir, data: JSON.parse(fs.readFileSync(manifestPath, "utf8")) };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((entry) => entry.data.status === "installed")
    .sort((a, b) => String(b.data.createdAt).localeCompare(String(a.data.createdAt)));

  return candidates[0] ?? null;
}

function warnEnv(keys) {
  const candidates = [".env.local", ".env", ".env.production.local", ".env.prod"];
  const combined = candidates
    .filter((rel) => exists(rel))
    .map((rel) => read(rel))
    .join("\n");

  for (const key of keys) {
    const inFile = new RegExp(`^\\s*${key}\\s*=`, "m").test(combined);
    if (!inFile && !process.env[key]) {
      console.warn(`[WARN] Brak konfiguracji ${key}. Kod pozostaje bezpiecznie wyłączony do czasu ustawienia zmiennej.`);
    }
  }
}

function runFullVerification() {
  if (!full) return;

  const tsc = "node_modules/typescript/bin/tsc";
  if (exists(tsc)) {
    const result = spawnSync(process.execPath, [abs(tsc), "--noEmit"], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.status !== 0) fail("TypeScript --noEmit zakończył się błędem.");
  } else {
    console.warn("[WARN] Pomijam typecheck --full: brak node_modules/typescript.");
  }

  const vitest = "node_modules/vitest/vitest.mjs";
  if (exists(vitest)) {
    const result = spawnSync(
      process.execPath,
      [
        abs(vitest),
        "run",
        "features/analytics/lib/analytics-identity.test.ts",
        "features/analytics/lib/ga4-privacy.test.ts",
      ],
      { cwd: root, stdio: "inherit" },
    );
    if (result.status !== 0) fail("Testy analytics zakończyły się błędem.");
  } else {
    console.warn("[WARN] Pomijam testy --full: brak node_modules/vitest.");
  }
}

const analyticsIdentityTypes = `// ${MARKER}
export type AnalyticsIdentity = {
  clientId: string;
  sessionId: string | null;
  capturedAt: string;
};
`;

const analyticsIdentityLib = `// ${MARKER}
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
    typeof value.sessionId === "string" && /^\\d+$/.test(value.sessionId)
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
`;

const analyticsIdentityTest = `// ${MARKER}
import { describe, expect, it } from "vitest";

import {
  parseAnalyticsIdentity,
  readAnalyticsIdentityFromMetadata,
} from "./analytics-identity";

describe("analytics identity", () => {
  it("accepts a bounded anonymous GA identity", () => {
    expect(
      parseAnalyticsIdentity({
        clientId: "12345.67890",
        sessionId: "1780000000",
        capturedAt: "2026-08-20T12:00:00.000Z",
      }),
    ).toEqual({
      clientId: "12345.67890",
      sessionId: "1780000000",
      capturedAt: "2026-08-20T12:00:00.000Z",
    });
  });

  it("rejects malformed identity", () => {
    expect(
      parseAnalyticsIdentity({
        clientId: "",
        sessionId: "not-a-number",
        capturedAt: "invalid",
      }),
    ).toBeNull();
  });

  it("reads identity only from the dedicated metadata field", () => {
    expect(
      readAnalyticsIdentityFromMetadata({
        analyticsIdentity: {
          clientId: "1.2",
          sessionId: null,
          capturedAt: "2026-08-20T12:00:00.000Z",
        },
      })?.clientId,
    ).toBe("1.2");
  });
});
`;

const ga4PrivacyLib = `// ${MARKER}
const FORBIDDEN_ANALYTICS_KEYS = new Set([
  "email",
  "phone",
  "first_name",
  "last_name",
  "full_name",
  "date_of_birth",
  "sex",
  "voivodeship",
  "job_title",
  "assessment_session_id",
  "questionnaire_response_id",
  "user_uuid",
  "respondent_id",
  "answers",
  "raw_answers",
  "scores",
  "dimension_scores",
  "value_system_scores",
  "dominant_value_system",
  "free_text",
  "report_html",
  "report_text",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function findForbiddenAnalyticsParam(
  value: unknown,
  path = "",
): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenAnalyticsParam(
        value[index],
        \`\${path}[\${index}]\`,
      );
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.trim().toLowerCase();
    const nextPath = path ? \`\${path}.\${key}\` : key;

    if (FORBIDDEN_ANALYTICS_KEYS.has(normalized)) {
      return nextPath;
    }

    const found = findForbiddenAnalyticsParam(nested, nextPath);
    if (found) return found;
  }

  return null;
}
`;

const ga4PrivacyTest = `// ${MARKER}
import { describe, expect, it } from "vitest";

import { findForbiddenAnalyticsParam } from "./ga4-privacy";

describe("GA4 privacy guard", () => {
  it("allows approved ecommerce and funnel fields", () => {
    expect(
      findForbiddenAnalyticsParam({
        offer_code: "report",
        report_type: "work",
        items: [
          {
            item_id: "report",
            item_name: "Raport HUMANET",
            item_category: "report",
          },
        ],
      }),
    ).toBeNull();
  });

  it("blocks direct PII fields", () => {
    expect(
      findForbiddenAnalyticsParam({
        lead_source: "contact",
        email: "test@example.invalid",
      }),
    ).toBe("email");
  });

  it("blocks psychometric payloads even when nested", () => {
    expect(
      findForbiddenAnalyticsParam({
        context: {
          dimension_scores: { X: 1.2 },
        },
      }),
    ).toBe("context.dimension_scores");
  });
});
`;

const getAnalyticsIdentityFile = `// ${MARKER}
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
    sessionId: sessionId && /^\\d+$/.test(sessionId) ? sessionId : null,
    capturedAt: new Date().toISOString(),
  };
}
`;

const identityCookieFile = `// ${MARKER}
import type { AnalyticsIdentity } from "../types/analytics-identity.types";

export const ANALYTICS_IDENTITY_COOKIE_NAME = "humanet_ga_identity_v1";
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

function usesHumanetParentDomain(hostname: string): boolean {
  return hostname === "humanet.me" || hostname.endsWith(".humanet.me");
}

export function writeAnalyticsIdentityCookie(identity: AnalyticsIdentity): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const value = encodeURIComponent(JSON.stringify(identity));
  const attributes = [
    \`\${ANALYTICS_IDENTITY_COOKIE_NAME}=\${value}\`,
    "Path=/",
    \`Max-Age=\${MAX_AGE_SECONDS}\`,
    "SameSite=Lax",
  ];

  if (window.location.protocol === "https:") attributes.push("Secure");
  if (usesHumanetParentDomain(window.location.hostname)) {
    attributes.push("Domain=.humanet.me");
  }

  document.cookie = attributes.join("; ");
}

function expire(domain?: string): void {
  const attributes = [
    \`\${ANALYTICS_IDENTITY_COOKIE_NAME}=\`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
  ];

  if (domain) attributes.push(\`Domain=\${domain}\`);
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    attributes.push("Secure");
  }

  document.cookie = attributes.join("; ");
}

export function removeAnalyticsIdentityCookie(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  expire();
  expire(window.location.hostname);

  if (usesHumanetParentDomain(window.location.hostname)) {
    expire(".humanet.me");
  }
}
`;

const identityCaptureFile = `// ${MARKER}
"use client";

import { useEffect } from "react";

import { useConsent } from "@/features/consent";
import { getAnalyticsIdentity } from "./get-analytics-identity";
import {
  removeAnalyticsIdentityCookie,
  writeAnalyticsIdentityCookie,
} from "./analytics-identity-cookie";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function AnalyticsIdentityCapture() {
  const { consent, hydrated } = useConsent();

  useEffect(() => {
    if (!hydrated) return;

    if (!consent.analytics) {
      removeAnalyticsIdentityCookie();
      return;
    }

    let cancelled = false;

    void (async () => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const identity = await getAnalyticsIdentity();

        if (cancelled) return;

        if (identity) {
          writeAnalyticsIdentityCookie(identity);
          return;
        }

        await sleep(400);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consent.analytics, hydrated]);

  return null;
}
`;

const readIdentityServerFile = `// ${MARKER}
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
`;

const analyticsConsentServerFile = `// ${MARKER}
import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { consentRecords } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function hasActiveAnalyticsConsent(
  userId: string,
): Promise<boolean> {
  const rows = await controlDb
    .select({ status: consentRecords.status })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.purpose, "analytics"),
      ),
    )
    .orderBy(desc(consentRecords.createdAt))
    .limit(1);

  return rows[0]?.status === "granted";
}
`;

const measurementProtocolServerFile = `// ${MARKER}
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
  if (!identity.sessionId || !/^\\d+$/.test(identity.sessionId)) return null;

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
    \`\${endpoint}?measurement_id=\${encodeURIComponent(
      measurementId,
    )}&api_secret=\${encodeURIComponent(apiSecret)}\`,
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
`;

const analyticsIndexFile = `// ${MARKER}
export { AnalyticsIdentityCapture } from "./client/analytics-identity-capture";
export type { AnalyticsIdentity } from "./types/analytics-identity.types";
`;

const analyticsServerIndexFile = `// ${MARKER}
import "server-only";

export { hasActiveAnalyticsConsent } from "./server/analytics-consent";
export {
  sendGa4ServerEvent,
  validateGa4ServerEvent,
} from "./server/ga4-measurement-protocol";
export { readAnalyticsIdentityFromRequest } from "./server/read-analytics-identity";
export { readAnalyticsIdentityFromMetadata } from "./lib/analytics-identity";
export type { AnalyticsIdentity } from "./types/analytics-identity.types";
`;

const purchaseFlowAnalyticsFile = `// ${MARKER}
import "server-only";

import { and, eq, isNull, lt } from "drizzle-orm";

import {
  consultationEntitlements,
  reportAccessOrders,
} from "@/drizzle/schema";
import {
  hasActiveAnalyticsConsent,
  readAnalyticsIdentityFromMetadata,
  sendGa4ServerEvent,
} from "@/features/analytics/server";
import { controlDb } from "@/server/db/control-db";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function logDispatchFailure(
  eventName: string,
  sourceId: string,
  error: unknown,
): void {
  console.error("GA4_MP_DISPATCH_FAILED", {
    eventName,
    sourceType: "order",
    sourceId,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function dispatchBeginCheckoutAnalytics({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}): Promise<boolean> {
  try {
    const order = await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),
        eq(reportAccessOrders.buyerUserId, userId),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

    if (!order) return false;

    const metadata = asRecord(order.metadata);
    const identity = readAnalyticsIdentityFromMetadata(metadata);

    if (!identity || !(await hasActiveAnalyticsConsent(userId))) {
      return false;
    }

    const productCode = text(metadata.productCode) ?? "report";
    const productName = text(metadata.productName) ?? "Raport HUMANET";
    const offerCode = text(metadata.offerCode);
    const reportType = text(metadata.reportType);
    const value = number(order.totalGross);

    const result = await sendGa4ServerEvent({
      identity,
      name: "begin_checkout",
      params: {
        currency: order.currency,
        value,
        ...(offerCode ? { offer_code: offerCode } : {}),
        ...(reportType ? { report_type: reportType } : {}),
        items: [
          {
            item_id: productCode,
            item_name: productName,
            item_category: "report",
            price: value,
            quantity: 1,
          },
        ],
      },
    });

    if (result.sent) {
      console.info("GA4_MP_SENT", {
        eventName: "begin_checkout",
        sourceType: "order",
        sourceId: orderId,
        status: result.status,
      });
    }

    return result.sent;
  } catch (error) {
    logDispatchFailure("begin_checkout", orderId, error);
    return false;
  }
}

export async function dispatchPurchaseAnalytics({
  orderId,
}: {
  orderId: string;
}): Promise<boolean> {
  try {
    const order = await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

    if (!order || order.status !== "paid" || !order.buyerUserId) return false;

    const metadata = asRecord(order.metadata);
    const analyticsDispatch = asRecord(metadata.analyticsDispatch);

    if (text(analyticsDispatch.purchaseSentAt)) return true;

    const identity = readAnalyticsIdentityFromMetadata(metadata);
    if (
      !identity ||
      !(await hasActiveAnalyticsConsent(order.buyerUserId))
    ) {
      return false;
    }

    const previousPaidOrders = await controlDb
      .select({ id: reportAccessOrders.id })
      .from(reportAccessOrders)
      .where(
        and(
          eq(reportAccessOrders.buyerUserId, order.buyerUserId),
          eq(reportAccessOrders.status, "paid"),
          lt(reportAccessOrders.createdAt, order.createdAt),
          isNull(reportAccessOrders.deletedAt),
        ),
      )
      .limit(1);

    const value = number(order.totalGross);
    const productCode = text(metadata.productCode) ?? "report";
    const productName = text(metadata.productName) ?? "Raport HUMANET";
    const offerCode = text(metadata.offerCode);
    const reportType = text(metadata.reportType);

    const result = await sendGa4ServerEvent({
      identity,
      name: "purchase",
      params: {
        transaction_id: order.id,
        currency: order.currency,
        value,
        tax: number(order.totalVat),
        customer_type: previousPaidOrders.length ? "returning" : "new",
        ...(offerCode ? { offer_code: offerCode } : {}),
        ...(reportType ? { report_type: reportType } : {}),
        items: [
          {
            item_id: productCode,
            item_name: productName,
            item_category: "report",
            price: value,
            quantity: 1,
          },
        ],
      },
      occurredAt: order.paidAt ?? new Date(),
    });

    if (!result.sent) return false;

    const latest = await controlDb.query.reportAccessOrders.findFirst({
      where: eq(reportAccessOrders.id, order.id),
      columns: { metadata: true },
    });
    const latestMetadata = asRecord(latest?.metadata);
    const latestDispatch = asRecord(latestMetadata.analyticsDispatch);

    await controlDb
      .update(reportAccessOrders)
      .set({
        metadata: {
          ...latestMetadata,
          analyticsDispatch: {
            ...latestDispatch,
            purchaseSentAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(reportAccessOrders.id, order.id));

    console.info("GA4_MP_SENT", {
      eventName: "purchase",
      sourceType: "order",
      sourceId: order.id,
      status: result.status,
    });

    return true;
  } catch (error) {
    logDispatchFailure("purchase", orderId, error);
    return false;
  }
}

export async function dispatchPackageConsultationBookedAnalytics({
  entitlementId,
}: {
  entitlementId: string;
}): Promise<boolean> {
  try {
    const entitlement =
      await controlDb.query.consultationEntitlements.findFirst({
        where: eq(consultationEntitlements.id, entitlementId),
      });

    if (
      !entitlement ||
      entitlement.source !== "package" ||
      entitlement.status !== "booked" ||
      !entitlement.orderId
    ) {
      return false;
    }

    const bookingMetadata = asRecord(entitlement.bookingMetadata);
    const dispatch = asRecord(bookingMetadata.analyticsDispatch);
    if (text(dispatch.bookConsultationSentAt)) return true;

    const order = await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, entitlement.orderId),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

    if (!order?.buyerUserId) return false;

    const identity = readAnalyticsIdentityFromMetadata(order.metadata);
    if (
      !identity ||
      !(await hasActiveAnalyticsConsent(order.buyerUserId))
    ) {
      return false;
    }

    const result = await sendGa4ServerEvent({
      identity,
      name: "book_consultation",
      params: {
        consultation_kind: entitlement.kind,
        consultation_source: "package",
        duration_minutes: entitlement.durationMinutes,
      },
      occurredAt: entitlement.bookedAt ?? new Date(),
    });

    if (!result.sent) return false;

    const latest =
      await controlDb.query.consultationEntitlements.findFirst({
        where: eq(consultationEntitlements.id, entitlement.id),
        columns: { bookingMetadata: true },
      });
    const latestBookingMetadata = asRecord(latest?.bookingMetadata);
    const latestDispatch = asRecord(latestBookingMetadata.analyticsDispatch);

    await controlDb
      .update(consultationEntitlements)
      .set({
        bookingMetadata: {
          ...latestBookingMetadata,
          analyticsDispatch: {
            ...latestDispatch,
            bookConsultationSentAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(consultationEntitlements.id, entitlement.id));

    console.info("GA4_MP_SENT", {
      eventName: "book_consultation",
      sourceType: "consultation_entitlement",
      sourceId: entitlement.id,
      status: result.status,
    });

    return true;
  } catch (error) {
    console.error("GA4_MP_DISPATCH_FAILED", {
      eventName: "book_consultation",
      sourceType: "consultation_entitlement",
      sourceId: entitlementId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}
`;

const purchaseAnalyticsNoop = `// ${MARKER}
"use client";

/**
 * Celowo pusty adapter kompatybilności.
 *
 * Event "purchase" jest wysyłany wyłącznie po stronie serwera przez
 * GA4 Measurement Protocol po potwierdzeniu order.status === "paid".
 * Pozostawienie komponentu jako no-op chroni starsze importy przed
 * dublowaniem zakupu po odświeżeniu strony sukcesu.
 */
type PurchaseAnalyticsProps = {
  orderId: string;
  currency: string;
  value: number;
  productCode: string;
  productName: string;
};

export function PurchaseAnalytics(props: PurchaseAnalyticsProps) {
  void props;
  return null;
}
`;

function writeNewFiles() {
  const files = {
    "features/analytics/types/analytics-identity.types.ts": analyticsIdentityTypes,
    "features/analytics/lib/analytics-identity.ts": analyticsIdentityLib,
    "features/analytics/lib/analytics-identity.test.ts": analyticsIdentityTest,
    "features/analytics/lib/ga4-privacy.ts": ga4PrivacyLib,
    "features/analytics/lib/ga4-privacy.test.ts": ga4PrivacyTest,
    "features/analytics/client/get-analytics-identity.ts": getAnalyticsIdentityFile,
    "features/analytics/client/analytics-identity-cookie.ts": identityCookieFile,
    "features/analytics/client/analytics-identity-capture.tsx": identityCaptureFile,
    "features/analytics/server/read-analytics-identity.ts": readIdentityServerFile,
    "features/analytics/server/analytics-consent.ts": analyticsConsentServerFile,
    "features/analytics/server/ga4-measurement-protocol.ts": measurementProtocolServerFile,
    "features/analytics/index.ts": analyticsIndexFile,
    "features/analytics/server.ts": analyticsServerIndexFile,
    "features/purchase-flow/api/purchase-flow.analytics.ts": purchaseFlowAnalyticsFile,
  };

  for (const [rel, content] of Object.entries(files)) {
    if (exists(rel) && !read(rel).includes(MARKER)) {
      fail(`Plik ${rel} już istnieje i nie należy do tego instalatora. Przerywam.`);
    }
    writeTracked(rel, content);
  }
}

function patchDynamicAnalytics() {
  const rel = "features/consent/components/dynamic-analytics.tsx";
  if (read(rel).includes(MARKER)) return;

  replaceOnce(
    rel,
    'const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();',
    `const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() ||
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();`,
    "GA4 public measurement id",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function patchRootLayout() {
  const rel = "app/layout.tsx";
  if (read(rel).includes("<AnalyticsIdentityCapture")) return;

  replaceOnce(
    rel,
    'import { Analytics } from "@/shared/ui/Analytics";',
    `import { Analytics } from "@/shared/ui/Analytics";
import { AnalyticsIdentityCapture } from "@/features/analytics";`,
    "analytics identity import",
  );

  replaceOnce(
    rel,
    `            <AttributionCapture />
            <Analytics />`,
    `            <AttributionCapture />
            <Analytics />
            <AnalyticsIdentityCapture />`,
    "analytics identity render",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function patchConsentCookie() {
  const rel = "features/consent/lib/consent-cookie.ts";
  if (read(rel).includes('name === "humanet_ga_identity_v1"')) return;

  replaceOnce(
    rel,
    `        name === "_gat" ||
        name.startsWith("_ga_") ||`,
    `        name === "_gat" ||
        name === "humanet_ga_identity_v1" ||
        name.startsWith("_ga_") ||`,
    "identity cookie removal",
  );
}

function patchPurchaseTypes() {
  const rel = "features/purchase-flow/types/purchase-flow.types.ts";
  if (read(rel).includes("analyticsIdentity: AnalyticsIdentity | null")) return;

  replaceOnce(
    rel,
    'import type { AttributionSnapshot } from "@/features/attribution";',
    `import type { AttributionSnapshot } from "@/features/attribution";
import type { AnalyticsIdentity } from "@/features/analytics";`,
    "AnalyticsIdentity import",
  );

  replaceOnce(
    rel,
    `  attribution: AttributionSnapshot | null;
};`,
    `  attribution: AttributionSnapshot | null;
  analyticsIdentity: AnalyticsIdentity | null;
};`,
    "PurchaseIntent analytics identity",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function patchStartPurchaseAction() {
  const rel = "features/purchase-flow/api/start-purchase-flow.action.ts";
  if (read(rel).includes("readAnalyticsIdentityFromRequest")) return;

  replaceOnce(
    rel,
    'import { readAttributionForRequest } from "@/features/attribution";',
    `import { readAttributionForRequest } from "@/features/attribution";
import { readAnalyticsIdentityFromRequest } from "@/features/analytics/server";`,
    "analytics identity server import",
  );

  replaceOnce(
    rel,
    `  const attribution = await readAttributionForRequest(rawSearchParams);

  const intent = await createOrResumePurchaseIntent({`,
    `  const attribution = await readAttributionForRequest(rawSearchParams);
  const analyticsIdentity = await readAnalyticsIdentityFromRequest();

  const intent = await createOrResumePurchaseIntent({`,
    "read analytics identity",
  );

  replaceOnce(
    rel,
    `      assessmentSessionId: started.sessionId,
      attribution,
    },`,
    `      assessmentSessionId: started.sessionId,
      attribution,
      analyticsIdentity,
    },`,
    "pass analytics identity",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function patchPurchaseMutations() {
  const rel = "features/purchase-flow/api/purchase-flow.mutations.ts";
  if (read(rel).includes(MARKER)) return;

  replaceOnce(
    rel,
    'import type { PurchaseIntentInput } from "../types/purchase-flow.types";',
    `import type { PurchaseIntentInput } from "../types/purchase-flow.types";
import { dispatchPurchaseAnalytics } from "./purchase-flow.analytics";`,
    "purchase analytics import",
  );

  replaceOnce(
    rel,
    `function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}`,
    `function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function withAnalyticsIdentity(
  metadata: unknown,
  identity: PurchaseIntentInput["analyticsIdentity"],
): Record<string, unknown> {
  const next = { ...asRecord(metadata) };
  delete next.analyticsIdentity;

  if (identity) {
    next.analyticsIdentity = identity;
  }

  return next;
}`,
    "analytics metadata helper",
  );

  replaceOnce(
    rel,
    `        attribution: input.attribution,
        updatedAt: now,`,
    `        attribution: input.attribution,
        metadata: withAnalyticsIdentity(existing.metadata, input.analyticsIdentity),
        updatedAt: now,`,
    "resume purchase intent metadata",
  );

  replaceOnce(
    rel,
    `      attribution: input.attribution,
      metadata: {},
      createdAt: now,`,
    `      attribution: input.attribution,
      metadata: withAnalyticsIdentity({}, input.analyticsIdentity),
      createdAt: now,`,
    "new purchase intent metadata",
  );

  replaceOnce(
    rel,
    `  return { handled: true as const };
}`,
    `  await dispatchPurchaseAnalytics({ orderId: order.id });

  return { handled: true as const };
}`,
    "server-side purchase dispatch",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function patchReportAccessPurchase() {
  const rel = "features/report-access/api/report-access-purchase.actions.ts";
  if (read(rel).includes(MARKER)) return;

  replaceOnce(
    rel,
    'import { readReportAccessB2cOffer } from "@/features/report-access/lib/report-access-product-offer";',
    `import { readReportAccessB2cOffer } from "@/features/report-access/lib/report-access-product-offer";
import { readAnalyticsIdentityFromMetadata } from "@/features/analytics/server";`,
    "analytics metadata import",
  );

  replaceOnce(
    rel,
    `import {
  finalizeMarketingPurchaseOrder,
  getOwnedPurchaseIntentForCheckout,
  markPurchaseIntentCheckoutStarted,
} from "@/features/purchase-flow/server";`,
    `import {
  dispatchBeginCheckoutAnalytics,
  finalizeMarketingPurchaseOrder,
  getOwnedPurchaseIntentForCheckout,
  markPurchaseIntentCheckoutStarted,
} from "@/features/purchase-flow/server";`,
    "begin checkout analytics import",
  );

  replaceOnce(
    rel,
    `    attribution: purchaseIntent?.attribution ?? null,
    b2cOffer: purchaseIntent ? b2cOffer : null,`,
    `    attribution: purchaseIntent?.attribution ?? null,
    analyticsIdentity: purchaseIntent
      ? readAnalyticsIdentityFromMetadata(purchaseIntent.metadata)
      : null,
    b2cOffer: purchaseIntent ? b2cOffer : null,`,
    "order analytics identity",
  );

  replaceOnce(
    rel,
    `    await markPurchaseIntentCheckoutStarted({
      purchaseIntentId: purchaseIntent.id,
      userId: authSession.user.id,
      orderId: order.id,
    });
  }`,
    `    await markPurchaseIntentCheckoutStarted({
      purchaseIntentId: purchaseIntent.id,
      userId: authSession.user.id,
      orderId: order.id,
    });

    await dispatchBeginCheckoutAnalytics({
      orderId: order.id,
      userId: authSession.user.id,
    });
  }`,
    "begin checkout after order creation",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function patchPurchaseAnalyticsComponent() {
  const rel = "features/purchase-flow/components/purchase-analytics.tsx";
  if (read(rel).includes(MARKER)) return;

  const current = read(rel);
  if (!current.includes('trackEvent("purchase"')) {
    fail("purchase-analytics.tsx nie zawiera oczekiwanego klientowego eventu purchase; nie nadpisuję nieznanej wersji.");
  }

  writeTracked(rel, purchaseAnalyticsNoop);
}

function patchPurchaseFlowServerExports() {
  const rel = "features/purchase-flow/server.ts";
  if (read(rel).includes("dispatchBeginCheckoutAnalytics")) return;

  writeTracked(
    rel,
    `${read(rel).trimEnd()}
export {
  dispatchBeginCheckoutAnalytics,
  dispatchPackageConsultationBookedAnalytics,
  dispatchPurchaseAnalytics,
} from "./api/purchase-flow.analytics";
// ${MARKER}
`,
  );
}

function patchCalcomWebhook() {
  const rel = "app/api/webhooks/calcom/route.ts";
  if (read(rel).includes(MARKER)) return;

  replaceOnce(
    rel,
    'import { getConfiguredCalComEventSlugs } from "@/features/purchase-flow/lib/calcom-config.server";',
    `import { getConfiguredCalComEventSlugs } from "@/features/purchase-flow/lib/calcom-config.server";
import { dispatchPackageConsultationBookedAnalytics } from "@/features/purchase-flow/server";`,
    "Cal.com server analytics import",
  );

  replaceOnce(
    rel,
    `    .where(eq(consultationEntitlements.id, existing.id));

  return NextResponse.json({`,
    `    .where(eq(consultationEntitlements.id, existing.id));

  if (
    status === "booked" &&
    existing.source === "package" &&
    !existing.bookedAt
  ) {
    await dispatchPackageConsultationBookedAnalytics({
      entitlementId: existing.id,
    });
  }

  return NextResponse.json({`,
    "confirmed package consultation event",
  );

  writeTracked(rel, `// ${MARKER}\n${read(rel)}`);
}

function install() {
  assertRepo();

  const already = verify({ quiet: true, skipFull: true });
  if (already.ok) {
    console.log("HUMANET VALUES GA4 Measurement Protocol: zmiany są już zainstalowane.");
    warnEnv([
      "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
      "NEXT_PUBLIC_GTM_ID",
      "GA4_MEASUREMENT_ID",
      "GA4_API_SECRET",
    ]);
    return;
  }

  activeRunDir = path.join(backupRoot, nowStamp());
  fs.mkdirSync(activeRunDir, { recursive: true });
  manifest = {
    installerId: INSTALLER_ID,
    version: 1,
    createdAt: new Date().toISOString(),
    repo: "values",
    status: "installing",
    changes: [],
  };
  writeManifest();

  try {
    writeNewFiles();
    patchDynamicAnalytics();
    patchRootLayout();
    patchConsentCookie();
    patchPurchaseTypes();
    patchStartPurchaseAction();
    patchPurchaseMutations();
    patchReportAccessPurchase();
    patchPurchaseAnalyticsComponent();
    patchPurchaseFlowServerExports();
    patchCalcomWebhook();

    const result = verify({ quiet: true, skipFull: true });
    if (!result.ok) {
      fail(`Weryfikacja po instalacji nie przeszła:\n${result.errors.map((x) => ` - ${x}`).join("\n")}`);
    }

    for (const change of manifest.changes) {
      change.installedSha256 = fileSha256(change.path);
    }
    manifest.status = "installed";
    manifest.finishedAt = new Date().toISOString();
    writeManifest();

    console.log(`Zainstalowano ${manifest.changes.length} zmian. Backup: ${path.relative(root, activeRunDir)}`);
    warnEnv([
      "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
      "NEXT_PUBLIC_GTM_ID",
      "GA4_MEASUREMENT_ID",
      "GA4_API_SECRET",
    ]);
    runFullVerification();
  } catch (error) {
    try {
      restoreFromManifest(activeRunDir, manifest, {
        requireInstalledHash: false,
        forceRestore: true,
      });
      manifest.status = "failed_rolled_back";
      manifest.error = error instanceof Error ? error.message : String(error);
      manifest.finishedAt = new Date().toISOString();
      writeManifest();
    } catch (rollbackError) {
      console.error("Automatyczny rollback po błędzie również się nie udał:", rollbackError);
    }
    throw error;
  }
}

function verify({ quiet = false, skipFull = false } = {}) {
  assertRepo();
  const errors = [];
  const checks = [
    ["features/analytics/types/analytics-identity.types.ts", MARKER],
    ["features/analytics/client/analytics-identity-capture.tsx", "AnalyticsIdentityCapture"],
    ["features/analytics/server/ga4-measurement-protocol.ts", "sendGa4ServerEvent"],
    ["features/analytics/server/analytics-consent.ts", "hasActiveAnalyticsConsent"],
    ["features/analytics/lib/ga4-privacy.ts", "FORBIDDEN_ANALYTICS_KEYS"],
    ["features/analytics/lib/analytics-identity.test.ts", 'describe("analytics identity"'],
    ["features/analytics/lib/ga4-privacy.test.ts", 'describe("GA4 privacy guard"'],
    ["app/layout.tsx", "<AnalyticsIdentityCapture />"],
    ["features/consent/components/dynamic-analytics.tsx", "NEXT_PUBLIC_GA4_MEASUREMENT_ID"],
    ["features/consent/lib/consent-cookie.ts", 'name === "humanet_ga_identity_v1"'],
    ["features/purchase-flow/types/purchase-flow.types.ts", "analyticsIdentity: AnalyticsIdentity | null"],
    ["features/purchase-flow/api/start-purchase-flow.action.ts", "readAnalyticsIdentityFromRequest"],
    ["features/purchase-flow/api/purchase-flow.mutations.ts", "dispatchPurchaseAnalytics"],
    ["features/report-access/api/report-access-purchase.actions.ts", "dispatchBeginCheckoutAnalytics"],
    ["features/report-access/api/report-access-purchase.actions.ts", "readAnalyticsIdentityFromMetadata"],
    ["features/purchase-flow/api/purchase-flow.analytics.ts", 'name: "begin_checkout"'],
    ["features/purchase-flow/api/purchase-flow.analytics.ts", 'name: "purchase"'],
    ["features/purchase-flow/api/purchase-flow.analytics.ts", 'name: "book_consultation"'],
    ["features/purchase-flow/server.ts", "dispatchPackageConsultationBookedAnalytics"],
    ["app/api/webhooks/calcom/route.ts", "dispatchPackageConsultationBookedAnalytics"],
    ["features/purchase-flow/components/purchase-analytics.tsx", "Celowo pusty adapter kompatybilności"],
  ];

  for (const [rel, needle] of checks) {
    if (!exists(rel)) {
      errors.push(`${rel}: brak pliku`);
      continue;
    }
    if (!read(rel).includes(needle)) {
      errors.push(`${rel}: brak ${needle}`);
    }
  }

  if (
    exists("features/purchase-flow/components/purchase-analytics.tsx") &&
    read("features/purchase-flow/components/purchase-analytics.tsx").includes('trackEvent("purchase"')
  ) {
    errors.push("Client-side PurchaseAnalytics nadal emituje purchase.");
  }

  const clientAnalyticsFiles = [
    "features/analytics/client/get-analytics-identity.ts",
    "features/analytics/client/analytics-identity-cookie.ts",
    "features/analytics/client/analytics-identity-capture.tsx",
    "features/analytics/index.ts",
  ];
  const clientAnalytics = clientAnalyticsFiles
    .filter(exists)
    .map(read)
    .join("\n");

  if (clientAnalytics.includes("GA4_API_SECRET")) {
    errors.push("GA4_API_SECRET pojawił się w kodzie klienta.");
  }

  if (!quiet) {
    if (errors.length) {
      console.error("VERIFY: NIEPOWODZENIE");
      for (const error of errors) console.error(` - ${error}`);
    } else {
      console.log("VERIFY: OK — kod HUMANET VALUES GA4/MP jest zainstalowany.");
      console.log("Privacy guard blokuje PII i dane psychometryczne przed wysyłką MP.");
      warnEnv([
        "NEXT_PUBLIC_GA4_MEASUREMENT_ID",
        "NEXT_PUBLIC_GTM_ID",
        "GA4_MEASUREMENT_ID",
        "GA4_API_SECRET",
      ]);
    }
  }

  if (!skipFull && !errors.length) runFullVerification();
  return { ok: errors.length === 0, errors };
}

function rollback() {
  assertRepo();
  const latest = latestInstalledRun();
  if (!latest) fail(`Nie znaleziono instalacji do rollbacku w ${path.relative(root, backupRoot)}.`);

  restoreFromManifest(latest.runDir, latest.data, {
    requireInstalledHash: true,
    forceRestore: force,
  });

  latest.data.status = "rolled_back";
  latest.data.rolledBackAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(latest.runDir, "manifest.json"),
    `${JSON.stringify(latest.data, null, 2)}\n`,
    "utf8",
  );

  console.log(`Rollback zakończony: ${path.relative(root, latest.runDir)}`);
}

try {
  if (command === "install") {
    install();
  } else if (command === "verify") {
    const result = verify();
    if (!result.ok) process.exitCode = 2;
  } else if (command === "rollback") {
    rollback();
  } else {
    console.error(`Nieznana komenda: ${command}`);
    console.error("Użycie: node install-humanet-values-ga4-mp.mjs [install|verify|rollback] [--full] [--force]");
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`BŁĄD: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
