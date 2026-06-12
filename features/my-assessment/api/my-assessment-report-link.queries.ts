// features/my-assessment/api/my-assessment-report-link.queries.ts

import {
  getActiveReportAccessGrantForSession,
  getReportAccessOfferForCompletedSession,
} from "@/features/report-access/api/report-access.queries";
import { requireSession } from "@/server/auth/require-session";

export type MyAssessmentReportAccessState = {
  reportHref: string | null;
  unlockHref: string | null;
  isUnlocked: boolean;
  isAvailableForPurchase: boolean;
  message: string | null;
};

function buildScopedReportHref({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (projectQuestionnaireId) {
    params.set("projectQuestionnaireId", projectQuestionnaireId);
  }

  if (questionnaireVersionId) {
    params.set("questionnaireVersionId", questionnaireVersionId);
  }

  return `/my/assessment/sessions/${sessionId}/report/${reportTemplateVersionId}?${params.toString()}`;
}

function buildScopedUnlockHref({
  tenantSlug,
  sessionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (projectQuestionnaireId) {
    params.set("projectQuestionnaireId", projectQuestionnaireId);
  }

  if (questionnaireVersionId) {
    params.set("questionnaireVersionId", questionnaireVersionId);
  }

  return `/my/assessment/sessions/${sessionId}/unlock-report?${params.toString()}`;
}

export async function getMyAssessmentReportAccessState({
  tenantSlug,
  sessionId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}): Promise<MyAssessmentReportAccessState> {
  if (!tenantSlug || !sessionId) {
    return {
      reportHref: null,
      unlockHref: null,
      isUnlocked: false,
      isAvailableForPurchase: false,
      message: "Brakuje danych sesji lub tenanta.",
    };
  }

  const offer = await getReportAccessOfferForCompletedSession({
    tenantSlug,
    sessionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  if (!offer.ok) {
    return {
      reportHref: null,
      unlockHref: null,
      isUnlocked: false,
      isAvailableForPurchase: false,
      message: offer.message,
    };
  }

  const scopedQuestionnaireVersionId =
    offer.questionnaireVersionId ?? questionnaireVersionId ?? null;

  const existingGrant =
    offer.existingGrant ??
    (await getActiveReportAccessGrantForSession({
      tenantSlug,
      sessionId,
      reportTemplateVersionId: offer.reportVersion.reportTemplateVersionId,
      userId: offer.actorUserId,
      projectQuestionnaireId,
      questionnaireVersionId: scopedQuestionnaireVersionId,
    }));

  if (existingGrant) {
    return {
      reportHref: buildScopedReportHref({
        tenantSlug,
        sessionId,
        reportTemplateVersionId: existingGrant.reportTemplateVersionId,
        projectQuestionnaireId,
        questionnaireVersionId: scopedQuestionnaireVersionId,
      }),
      unlockHref: null,
      isUnlocked: true,
      isAvailableForPurchase: false,
      message: null,
    };
  }

  return {
    reportHref: null,
    unlockHref: buildScopedUnlockHref({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId: scopedQuestionnaireVersionId,
    }),
    isUnlocked: false,
    isAvailableForPurchase: Boolean(offer.product),
    message: offer.product
      ? null
      : "Dla tego raportu nie ma jeszcze aktywnego produktu sprzedażowego.",
  };
}

/**
 * Kompatybilność wsteczna.
 */
export async function getMyAssessmentReportHref({
  tenantSlug,
  sessionId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  await requireSession();

  const access = await getMyAssessmentReportAccessState({
    tenantSlug,
    sessionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  return access.reportHref;
}