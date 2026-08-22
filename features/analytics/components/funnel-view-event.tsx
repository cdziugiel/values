// @humanet-funnel-analytics-v1
"use client";

import { useEffect, useRef } from "react";

import { dispatchFunnelViewEventAction } from "@/features/analytics/funnel-view-event.action";
import { useConsent } from "@/features/consent";

type FunnelViewEventName = "view_basic_result" | "view_report";

export function FunnelViewEvent({
  eventName,
  dedupeKey,
  questionnaireVersionId = null,
}: {
  eventName: FunnelViewEventName;
  dedupeKey: string;
  questionnaireVersionId?: string | null;
}) {
  const inFlight = useRef(false);
  const { consent, hydrated } = useConsent();

  useEffect(() => {
    if (!hydrated || !consent.analytics) return;

    const storageKey =
      "humanet_funnel_view_v1:" + eventName + ":" + dedupeKey;

    if (window.sessionStorage.getItem(storageKey) === "1") return;
    if (inFlight.current) return;

    inFlight.current = true;

    void dispatchFunnelViewEventAction({
      eventName,
      questionnaireVersionId,
    })
      .then((sent) => {
        if (sent) {
          window.sessionStorage.setItem(storageKey, "1");
        }
      })
      .catch(() => false)
      .finally(() => {
        inFlight.current = false;
      });
  }, [consent.analytics, dedupeKey, eventName, hydrated, questionnaireVersionId]);

  return null;
}
