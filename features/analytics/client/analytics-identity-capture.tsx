// @humanet-ga4-mp-v1
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
