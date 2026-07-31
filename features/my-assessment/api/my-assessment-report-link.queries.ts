// features/my-assessment/api/my-assessment-report-link.queries.ts

import {
  getActiveReportAccessGrantForCurrentUserSessionScope,
  getReportAccessOfferForCompletedSession,
} from "@/features/report-access/api/report-access.queries";
import { requireSession } from "@/server/auth/require-session";

export type MyAssessmentReportAccessState = {
  reportHref: string | null;
  unlockHref: string | null;

  teaserHref: string | null;
  sampleHref: string | null;
  reportTemplateVersionId: string | null;

  isUnlocked: boolean;
  isAvailableForPurchase: boolean;
  message: string | null;
};

function buildScopedPreviewHref({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  previewKind,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  previewKind: "teaser" | "sample";
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (projectQuestionnaireId) {
    params.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    params.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  return (
    `/my/assessment/sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}` +
    `/${previewKind}?${params.toString()}`
  );
}

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
    params.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    params.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  return (
    `/my/assessment/sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}` +
    `?${params.toString()}`
  );
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
    params.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    params.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  return (
    `/my/assessment/sessions/${sessionId}` +
    `/unlock-report?${params.toString()}`
  );
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
      teaserHref: null,
      sampleHref: null,
      reportTemplateVersionId: null,
      isUnlocked: false,
      isAvailableForPurchase: false,
      message:
        "Brakuje danych sesji lub tenanta.",
    };
  }

  /**
   * Najpierw sprawdzamy faktycznie posiadany dostęp.
   *
   * Nie możemy rozpoczynać od aktualnej oferty sprzedażowej,
   * ponieważ od chwili zakupu mogła zmienić się aktywna wersja
   * szablonu raportu albo jego binding.
   */
  const existingScopedGrant =
    await getActiveReportAccessGrantForCurrentUserSessionScope({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

  if (existingScopedGrant) {
    return {
      reportHref: buildScopedReportHref({
        tenantSlug,
        sessionId,
        reportTemplateVersionId:
          existingScopedGrant.reportTemplateVersionId,
        projectQuestionnaireId,
        questionnaireVersionId,
      }),
      unlockHref: null,
      teaserHref: null,
      sampleHref: null,
      reportTemplateVersionId:
        existingScopedGrant.reportTemplateVersionId,
      isUnlocked: true,
      isAvailableForPurchase: false,
      message: null,
    };
  }

  /**
   * Dopiero gdy użytkownik nie posiada aktywnego grantu,
   * ustalamy aktualną ofertę i wersję raportu dostępną
   * do zakupu.
   */
  const offer =
    await getReportAccessOfferForCompletedSession({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

  if (!offer.ok) {
    return {
      reportHref: null,
      unlockHref: null,
      teaserHref: null,
      sampleHref: null,
      reportTemplateVersionId: null,
      isUnlocked: false,
      isAvailableForPurchase: false,
      message: offer.message,
    };
  }

  const scopedQuestionnaireVersionId =
    offer.questionnaireVersionId ??
    questionnaireVersionId ??
    null;

  const reportTemplateVersionId =
    offer.reportVersion.reportTemplateVersionId;

  /**
   * Druga próba uwzględnia questionnaireVersionId
   * rozwiązane przez ofertę na podstawie
   * projectQuestionnaireId.
   */
  const existingResolvedGrant =
    offer.existingGrant ??
    (await getActiveReportAccessGrantForCurrentUserSessionScope({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId:
        scopedQuestionnaireVersionId,
    }));

  if (existingResolvedGrant) {
    return {
      reportHref: buildScopedReportHref({
        tenantSlug,
        sessionId,
        reportTemplateVersionId:
          existingResolvedGrant.reportTemplateVersionId,
        projectQuestionnaireId,
        questionnaireVersionId:
          scopedQuestionnaireVersionId,
      }),
      unlockHref: null,
      teaserHref: null,
      sampleHref: null,
      reportTemplateVersionId:
        existingResolvedGrant.reportTemplateVersionId,
      isUnlocked: true,
      isAvailableForPurchase: false,
      message: null,
    };
  }

  const teaserHref = buildScopedPreviewHref({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    previewKind: "teaser",
    projectQuestionnaireId,
    questionnaireVersionId:
      scopedQuestionnaireVersionId,
  });

  const sampleHref = buildScopedPreviewHref({
    tenantSlug,
    sessionId,
    reportTemplateVersionId,
    previewKind: "sample",
    projectQuestionnaireId,
    questionnaireVersionId:
      scopedQuestionnaireVersionId,
  });

  return {
    reportHref: null,
    unlockHref: buildScopedUnlockHref({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId:
        scopedQuestionnaireVersionId,
    }),
    teaserHref,
    sampleHref,
    reportTemplateVersionId,
    isUnlocked: false,
    isAvailableForPurchase:
      Boolean(offer.product),
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

  const access =
    await getMyAssessmentReportAccessState({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

  return access.reportHref;
}