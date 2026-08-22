// @humanet-funnel-analytics-v1
import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { questionnaireVersions, questionnaires } from "@/drizzle/schema";
import { readAttributionForRequest } from "@/features/attribution";
import {
  hasActiveAnalyticsConsent,
  readAnalyticsIdentityFromRequest,
  sendGa4ServerEvent,
} from "@/features/analytics/server";
import { getPurchaseFlowConfig } from "@/features/purchase-flow/config/purchase-flow.config";
import type { ReportType } from "@/features/purchase-flow/types/purchase-flow.types";
import { controlDb } from "@/server/db/control-db";

export type AssessmentFunnelEventName =
  | "assessment_start"
  | "assessment_complete"
  | "join_research_program"
  | "view_basic_result"
  | "view_report";

type DispatchAssessmentFunnelEventInput = {
  // @humanet-funnel-analytics-v1.1
  userId: string;
  name: AssessmentFunnelEventName;
  questionnaireVersionId?: string | null;
  reportType?: ReportType | null;
  entryFlow?: "research_program" | "purchase_flow" | "standard" | null;
  surface?: string | null;
  offerCode?: string | null;
  occurredAt?: Date;
  qaMode?: boolean;
};

function shortText(value: unknown, max = 100): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, max) : null;
}

async function resolveReportTypeByQuestionnaireVersionId(
  questionnaireVersionId: string | null | undefined,
): Promise<ReportType | null> {
  if (!questionnaireVersionId) return null;

  const rows = await controlDb
    .select({ questionnaireCode: questionnaires.code })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        eq(questionnaireVersions.id, questionnaireVersionId),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .limit(1);

  const questionnaireCode = rows[0]?.questionnaireCode ?? null;
  if (!questionnaireCode) return null;

  const config = getPurchaseFlowConfig();
  for (const [reportType, definition] of Object.entries(config.reports)) {
    if (definition.questionnaireCode === questionnaireCode) {
      return reportType as ReportType;
    }
  }

  return null;
}

/**
 * Analytics must never change the business outcome. This function intentionally
 * swallows analytics failures after logging a technical diagnostic.
 *
 * Privacy rule: never send answers, scores, respondent identifiers, e-mail,
 * assessment/session UUIDs, demographic profile or report contents to GA4.
 */
export async function dispatchAssessmentFunnelEvent(
  input: DispatchAssessmentFunnelEventInput,
): Promise<boolean> {
  try {
    if (!(await hasActiveAnalyticsConsent(input.userId))) return false;

    const identity = await readAnalyticsIdentityFromRequest();
    if (!identity) return false;

    const attribution = await readAttributionForRequest({});
    const touch = attribution?.lastTouch ?? attribution?.firstTouch ?? null;

    const reportType =
      input.reportType ??
      (await resolveReportTypeByQuestionnaireVersionId(
        input.questionnaireVersionId,
      ));

    const entryFlow =
      input.entryFlow ??
      (touch?.ref === "research_program" ? "research_program" : "standard");

    const source = shortText(touch?.source);
    const medium = shortText(touch?.medium);
    const campaign = shortText(touch?.campaign);
    const surface = shortText(input.surface);
    const offerCode = shortText(input.offerCode);

    const result = await sendGa4ServerEvent({
      identity,
      name: input.name,
      params: {
        ...(reportType ? { report_type: reportType } : {}),
        entry_flow: entryFlow,
        ...(surface ? { surface } : {}),
        ...(offerCode ? { offer_code: offerCode } : {}),
        ...(source ? { marketing_source: source } : {}),
        ...(medium ? { marketing_medium: medium } : {}),
        ...(campaign ? { marketing_campaign: campaign } : {}),
        ...(touch?.ref === "research_program"
          ? { attribution_ref: "research_program" }
          : {}),
        has_partner: touch?.partner ? 1 : 0,
        ...(input.qaMode
          ? { qa_mode: 1, debug_mode: 1 }
          : {}),
      },
      occurredAt: input.occurredAt,
    });

    if (result.sent) {
      console.info("GA4_FUNNEL_SENT", {
        eventName: input.name,
        reportType,
        entryFlow,
        surface,
        status: result.status,
      });
    }

    return result.sent;
  } catch (error) {
    console.error("GA4_FUNNEL_DISPATCH_FAILED", {
      eventName: input.name,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}
