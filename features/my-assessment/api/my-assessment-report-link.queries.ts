// features/my-assessment/api/my-assessment-report-link.queries.ts
import {
  getActiveReportAccessGrantForSession,
  getReportAccessOfferForCompletedSession,
} from "@/features/report-access/api/report-access.queries";
import { reportAccessGrants } from "@/drizzle/schema";
import { requireSession } from "@/server/auth/require-session";

export type MyAssessmentReportAccessState = {
  reportHref: string | null;
  unlockHref: string | null;
  isUnlocked: boolean;
  isAvailableForPurchase: boolean;
  message: string | null;
};

export async function getMyAssessmentReportAccessState({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
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

  const existingGrant =
    offer.existingGrant ??
    (await getActiveReportAccessGrantForSession({
      tenantSlug,
      sessionId,
      reportTemplateVersionId: offer.reportVersion.reportTemplateVersionId,
      userId: offer.actorUserId,
    }));

  if (existingGrant) {
    return {
      reportHref: `/my/assessment/sessions/${sessionId}/report/${existingGrant.reportTemplateVersionId}?tenant=${tenantSlug}`,
      unlockHref: null,
      isUnlocked: true,
      isAvailableForPurchase: false,
      message: null,
    };
  }

  return {
    reportHref: null,
    unlockHref: `/my/assessment/sessions/${sessionId}/unlock-report?tenant=${tenantSlug}`,
    isUnlocked: false,
    isAvailableForPurchase: Boolean(offer.product),
    message: offer.product
      ? null
      : "Dla tego raportu nie ma jeszcze aktywnego produktu sprzedażowego.",
  };
}

/**
 * Kompatybilność wsteczna.
 *
 * Uwaga: ta funkcja zwraca link do raportu WYŁĄCZNIE wtedy,
 * gdy user ma już aktywny grant dostępu.
 *
 * Do UI lepiej używać getMyAssessmentReportAccessState,
 * bo pozwala pokazać też przycisk „Odblokuj raport”.
 */
export async function getMyAssessmentReportHref({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const authSession = await requireSession();
  const access = await getMyAssessmentReportAccessState({
    tenantSlug,
    sessionId,
  });

  return access.reportHref;
}