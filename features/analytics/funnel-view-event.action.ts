// @humanet-funnel-analytics-v1
"use server";

import { dispatchAssessmentFunnelEvent } from "@/features/analytics/server/assessment-funnel.analytics";
import { requireSession } from "@/server/auth/require-session";

type FunnelViewEventName = "view_basic_result" | "view_report";

type FunnelViewEventInput = {
  eventName: FunnelViewEventName;
  questionnaireVersionId?: string | null;
};

const ALLOWED_EVENTS = new Set<FunnelViewEventName>([
  "view_basic_result",
  "view_report",
]);

export async function dispatchFunnelViewEventAction(
  input: FunnelViewEventInput,
): Promise<boolean> {
  if (!input || !ALLOWED_EVENTS.has(input.eventName)) return false;

  const session = await requireSession();

  return dispatchAssessmentFunnelEvent({
    userId: session.user.id,
    name: input.eventName,
    questionnaireVersionId: input.questionnaireVersionId ?? null,
    surface:
      input.eventName === "view_basic_result"
        ? "report_teaser"
        : "full_report",
  });
}
