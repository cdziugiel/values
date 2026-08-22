// @humanet-ga4-mp-v1
// @humanet-ga4-identity-cookie-fallback-v1.2
"use client";

import { useEffect } from "react";

import { useConsent } from "@/features/consent";
import { getAnalyticsIdentity } from "./get-analytics-identity";
import {
  removeAnalyticsIdentityCookie,
  writeAnalyticsIdentityCookie,
} from "./analytics-identity-cookie";

const CAPTURE_ATTEMPTS = 12;
const RETRY_DELAY_MS = 500;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

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
    let running = false;

    const capture = async () => {
      if (running || cancelled) return;
      running = true;

      try {
        for (let attempt = 0; attempt < CAPTURE_ATTEMPTS; attempt += 1) {
          const identity = await getAnalyticsIdentity();

          if (cancelled) return;

          if (identity) {
            writeAnalyticsIdentityCookie(identity);
            return;
          }

          await sleep(RETRY_DELAY_MS);
        }
      } finally {
        running = false;
      }
    };

    void capture();

    const intervalId = window.setInterval(() => {
      void capture();
    }, REFRESH_INTERVAL_MS);

    const onFocus = () => {
      void capture();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void capture();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [consent.analytics, hydrated]);

  return null;
}
