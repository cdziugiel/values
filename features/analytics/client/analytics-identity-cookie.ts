// @humanet-ga4-mp-v1
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
    `${ANALYTICS_IDENTITY_COOKIE_NAME}=${value}`,
    "Path=/",
    `Max-Age=${MAX_AGE_SECONDS}`,
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
    `${ANALYTICS_IDENTITY_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "SameSite=Lax",
  ];

  if (domain) attributes.push(`Domain=${domain}`);
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
