"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import {
  getCompositeReportAccessOfferForCurrentUser,
  getReportAccessOfferForCompletedSession,
} from "./report-access.queries";
import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";

export type ReportAccessActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function fail(error: unknown): ReportAccessActionState {
  if (isRedirectError(error)) {
    throw error;
  }

  return {
    status: "error",
    message:
      error instanceof Error
        ? error.message
        : "Operacja nie powiodła się.",
  };
}

function toMoneyString(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

function calculateVat({
  gross,
  net,
}: {
  gross: unknown;
  net: unknown;
}) {
  const grossNumber = Number(gross);
  const netNumber = Number(net);

  if (!Number.isFinite(grossNumber) || !Number.isFinite(netNumber)) {
    return "0.00";
  }

  return Math.max(grossNumber - netNumber, 0).toFixed(2);
}

export async function unlockReportWithPlaceholderPaymentAction(
  _previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!tenantSlug || !sessionId) {
    return {
      status: "error",
      message: "Brakuje danych sesji lub tenanta.",
    };
  }

  try {
    const offer = await getReportAccessOfferForCompletedSession({
      tenantSlug,
      sessionId,
    });

    if (!offer.ok) {
      return {
        status: "error",
        message: offer.message,
      };
    }

    if (offer.hasAccess) {
      redirect(
        `/my/assessment/sessions/${sessionId}/report/${offer.reportVersion.reportTemplateVersionId}?tenant=${tenantSlug}`,
      );
    }

    const product =
      offer.product ??
      (await controlDb.query.reportAccessProducts.findFirst({
        where: and(
          eq(
            reportAccessProducts.reportTemplateId,
            offer.reportVersion.reportTemplateId,
          ),
          eq(reportAccessProducts.status, "active"),
          isNull(reportAccessProducts.deletedAt),
        ),
      }));

    if (!product) {
      return {
        status: "error",
        message:
          "Nie znaleziono aktywnego produktu sprzedażowego dla tego typu raportu.",
      };
    }

    const now = new Date();

    const totalNet = toMoneyString(product.priceNet);
    const totalGross = toMoneyString(product.priceGross);
    const totalVat = calculateVat({
      gross: product.priceGross,
      net: product.priceNet,
    });

    const existingGrant =
      await controlDb.query.reportAccessGrants.findFirst({
        where: and(
          eq(reportAccessGrants.tenantSlug, tenantSlug),
          eq(reportAccessGrants.assessmentSessionId, sessionId),
          eq(
            reportAccessGrants.reportTemplateId,
            offer.reportVersion.reportTemplateId,
          ),
          eq(reportAccessGrants.status, "active"),
          isNull(reportAccessGrants.deletedAt),
        ),
      });

    if (existingGrant) {
      redirect(
        `/my/assessment/sessions/${sessionId}/report/${existingGrant.reportTemplateVersionId}?tenant=${tenantSlug}`,
      );
    }

    const result = await controlDb.transaction(async (tx) => {
      const [order] = await tx
        .insert(reportAccessOrders)
        .values({
          buyerType: "user",
          tenantSlug,
          buyerUserId: offer.actorUserId,

          status: "paid",

          paymentProvider: "placeholder",
          paymentProviderOrderId: `placeholder:${sessionId}:${Date.now()}`,

          currency: product.currency,
          totalNet,
          totalVat,
          totalGross,

          invoiceRequested: false,

          metadata: {
            placeholder: true,
            sessionId,
            reportTemplateId: offer.reportVersion.reportTemplateId,
            reportTemplateVersionId:
              offer.reportVersion.reportTemplateVersionId,
          },

          paidAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: offer.actorUserId,
          updatedBy: offer.actorUserId,
        })
        .returning();

      await tx.insert(reportAccessOrderItems).values({
        orderId: order.id,
        productId: product.id,
        quantity: 1,

        unitNet: totalNet,
        unitVat: totalVat,
        unitGross: totalGross,

        totalNet,
        totalVat,
        totalGross,

        createdAt: now,
        updatedAt: now,
      });

      const validUntil = product.validityDays
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

      const [grant] = await tx
        .insert(reportAccessGrants)
        .values({
          source: "placeholder_payment",
          status: "active",

          productId: product.id,
          orderId: order.id,

          reportTemplateId: offer.reportVersion.reportTemplateId,
          reportTemplateVersionId:
            offer.reportVersion.reportTemplateVersionId,

          tenantSlug,
          userId: offer.actorUserId,
          email: offer.actorEmail,

          subjectType: "assessment_session",
          subjectId: sessionId,

          assessmentProjectId: offer.session.assessmentProjectId,
          assessmentSessionId: sessionId,
          assessmentAccessLinkId: offer.session.assessmentAccessLinkId,

          validFrom: now,
          validUntil,

          metadata: {
            placeholder: true,
            purchasedReportTemplateVersionName:
              offer.reportVersion.reportTemplateVersionName,
            purchasedReportTemplateVersion:
              offer.reportVersion.reportTemplateVersion,
          },

          createdAt: now,
          updatedAt: now,
          createdBy: offer.actorUserId,
          updatedBy: offer.actorUserId,
        })
        .returning();

      return {
        order,
        grant,
      };
    });

    redirect(
      `/my/assessment/sessions/${sessionId}/report/${result.grant.reportTemplateVersionId}?tenant=${tenantSlug}`,
    );
  } catch (error) {
    return fail(error);
  }
}


export async function unlockCompositeReportWithPlaceholderPaymentAction(
  _previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const reportTemplateVersionId = String(
    formData.get("reportTemplateVersionId") ?? "",
  );

  const rawSelectionMode = String(
    formData.get("selectionMode") ?? "latest_completed",
  );

  const selectionMode: "latest_completed" | "same_project" | "manual" =
    rawSelectionMode === "same_project" || rawSelectionMode === "manual"
      ? rawSelectionMode
      : "latest_completed";

  if (!tenantSlug || !reportTemplateVersionId) {
    return {
      status: "error",
      message: "Brakuje danych raportu złożonego.",
    };
  }

  try {
    const offer = await getCompositeReportAccessOfferForCurrentUser({
      tenantSlug,
      reportTemplateVersionId,
    });

    if (!offer.ok) {
      return {
        status: "error",
        message: offer.message,
      };
    }

    if (!offer.eligibility.canRender) {
      return {
        status: "error",
        message:
          "Nie można odblokować raportu złożonego, ponieważ brakuje wymaganych ukończonych kwestionariuszy.",
      };
    }

    const product = offer.product;

    if (!product) {
      return {
        status: "error",
        message:
          "Nie znaleziono aktywnego produktu sprzedażowego dla tego raportu złożonego.",
      };
    }

    let manualSelection:
      | {
          bySlot?: Record<string, string>;
          byQuestionnaireId?: Record<string, string>;
        }
      | undefined;

    if (selectionMode === "manual") {
      const manualRaw = String(formData.get("manualSelection") ?? "{}");

      try {
        const parsed = JSON.parse(manualRaw);

        if (
          parsed &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          manualSelection = parsed;
        } else {
          manualSelection = {};
        }
      } catch {
        return {
          status: "error",
          message: "Nieprawidłowy format ręcznego wyboru źródeł raportu.",
        };
      }
    }

    const selectionResult = buildFrozenCompositeSelectionForUserUnlock({
  respondentId: offer.respondent.id,
  reportTemplateVersionId,
  assessmentProjectId: null,
  configuredSources: offer.eligibility.configuredSources,
  sourceCandidates: offer.sourceCandidates ?? [],
  sourceSelection: {
    mode: selectionMode,
    manual: manualSelection,
  },
});

if (!selectionResult.eligibility.canRender) {
  return {
    status: "error",
    message:
      "Nie można odblokować raportu złożonego dla wybranego zestawu źródeł.",
  };
}

const frozenSelection = selectionResult.frozenSelection;

if (!frozenSelection) {
  return {
    status: "error",
    message: "Nie udało się zamrozić wyboru źródeł raportu złożonego.",
  };
}

    const now = new Date();

    const totalNet = toMoneyString(product.priceNet);
    const totalGross = toMoneyString(product.priceGross);
    const totalVat = calculateVat({
      gross: product.priceGross,
      net: product.priceNet,
    });

    const result = await controlDb.transaction(async (tx) => {
      const [order] = await tx
        .insert(reportAccessOrders)
        .values({
          buyerType: "user",
          tenantSlug,
          buyerUserId: offer.actorUserId,

          status: "paid",

          paymentProvider: "placeholder",
          paymentProviderOrderId: `placeholder:composite:${offer.respondent.id}:${Date.now()}`,

          currency: product.currency,
          totalNet,
          totalVat,
          totalGross,

          invoiceRequested: false,

          metadata: {
            placeholder: true,
            reportKind: "personal_composite",
            subjectType: "respondent",
            subjectId: offer.respondent.id,
            reportTemplateId: offer.reportVersion.reportTemplateId,
            reportTemplateVersionId:
              offer.reportVersion.reportTemplateVersionId,
            compositeSelection: frozenSelection,
            compositeSelectionMode: selectionMode,
            eligibility: selectionResult.eligibility,
          },

          paidAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: offer.actorUserId,
          updatedBy: offer.actorUserId,
        })
        .returning();

      await tx.insert(reportAccessOrderItems).values({
        orderId: order.id,
        productId: product.id,
        quantity: 1,

        unitNet: totalNet,
        unitVat: totalVat,
        unitGross: totalGross,

        totalNet,
        totalVat,
        totalGross,

        createdAt: now,
        updatedAt: now,
      });

      const validUntil = product.validityDays
        ? new Date(
            now.getTime() + product.validityDays * 24 * 60 * 60 * 1000,
          )
        : null;

      const [grant] = await tx
        .insert(reportAccessGrants)
        .values({
          source: "placeholder_payment",
          status: "active",

          productId: product.id,
          orderId: order.id,

          reportTemplateId: offer.reportVersion.reportTemplateId,
          reportTemplateVersionId:
            offer.reportVersion.reportTemplateVersionId,

          tenantSlug,
          userId: offer.actorUserId,
          email: offer.actorEmail,

          subjectType: "respondent",
          subjectId: offer.respondent.id,

          assessmentProjectId: null,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          validFrom: now,
          validUntil,

          metadata: {
            placeholder: true,
            reportKind: "personal_composite",
            respondentId: offer.respondent.id,

            compositeSelection: frozenSelection,
            compositeSelectionMode: selectionMode,

            purchasedReportTemplateVersionName:
              offer.reportVersion.reportTemplateVersionName,
            purchasedReportTemplateVersion:
              offer.reportVersion.reportTemplateVersion,
            eligibility: selectionResult.eligibility,
          },

          createdAt: now,
          updatedAt: now,
          createdBy: offer.actorUserId,
          updatedBy: offer.actorUserId,
        })
        .returning();

      return {
        order,
        grant,
      };
    });

    redirect(
      `/my/reports/composite/grants/${result.grant.id}?tenant=${encodeURIComponent(
        tenantSlug,
      )}`,
    );
  } catch (error) {
    return fail(error);
  }
}


type CompositeUnlockSourceCandidate = {
  slot: string;
  label: string;
  questionnaireName: string;
  questionnaireId?: string | null;
  questionnaireCode?: string | null;
  required?: boolean;
  candidates: {
    assessmentSessionId: string;
    assessmentProjectName: string | null;
    completedAt: string | Date | null;
  }[];
};

type CompositeUnlockSourceSelection = {
  mode: "latest_completed" | "same_project" | "manual";
  manual?: {
    bySlot?: Record<string, string>;
    byQuestionnaireId?: Record<string, string>;
  };
};

function buildFrozenCompositeSelectionForUserUnlock({
  respondentId,
  reportTemplateVersionId,
  assessmentProjectId,
  configuredSources,
  sourceCandidates,
  sourceSelection,
}: {
  respondentId: string;
  reportTemplateVersionId: string;
  assessmentProjectId: string | null;
  configuredSources: any[];
  sourceCandidates: CompositeUnlockSourceCandidate[];
  sourceSelection: CompositeUnlockSourceSelection;
}) {
  const candidateBySlot = new Map(
    sourceCandidates.map((source) => [source.slot, source]),
  );

  const selectedSources = configuredSources.map((source, index) => {
    const sourceRecord = source as Record<string, any>;

    const slot = String(sourceRecord.slot ?? `source_${index + 1}`);
    const questionnaireId =
      typeof sourceRecord.questionnaireId === "string"
        ? sourceRecord.questionnaireId
        : null;

    const questionnaireCode =
      typeof sourceRecord.questionnaireCode === "string"
        ? sourceRecord.questionnaireCode
        : null;

    const required = Boolean(sourceRecord.required);

    const candidateGroup = candidateBySlot.get(slot);
    const candidates = candidateGroup?.candidates ?? [];

    let selectedSessionId: string | null = null;

    if (sourceSelection.mode === "manual") {
      selectedSessionId =
        sourceSelection.manual?.bySlot?.[slot] ??
        (questionnaireId
          ? sourceSelection.manual?.byQuestionnaireId?.[questionnaireId]
          : undefined) ??
        null;
    }

    if (!selectedSessionId) {
      selectedSessionId = candidates[0]?.assessmentSessionId ?? null;
    }

    const selectedCandidate = selectedSessionId
      ? candidates.find(
          (candidate) => candidate.assessmentSessionId === selectedSessionId,
        )
      : null;

    const available = Boolean(selectedCandidate);

    return {
      slot,
      required,
      available,

      questionnaireId,
      questionnaireCode,
      questionnaireName:
        String(sourceRecord.questionnaireName ?? "").trim() ||
        candidateGroup?.questionnaireName ||
        questionnaireCode ||
        questionnaireId ||
        slot,

      assessmentSessionId: selectedCandidate?.assessmentSessionId ?? null,
      assessmentProjectName: selectedCandidate?.assessmentProjectName ?? null,
      completedAt: selectedCandidate?.completedAt ?? null,
    };
  });

  const missingRequiredSources = selectedSources.filter(
    (source) => source.required && !source.available,
  );

  const missingOptionalSources = selectedSources.filter(
    (source) => !source.required && !source.available,
  );

  const eligibility = {
    status:
      missingRequiredSources.length > 0
        ? ("missing_required_sources" as const)
        : ("ready" as const),
    canRender: missingRequiredSources.length === 0,
    warnings: [] as string[],
    missingRequiredSources,
    missingOptionalSources,
  };

  const frozenSelection = {
    version: 1,
    mode: sourceSelection.mode,
    respondentId,
    reportTemplateVersionId,
    assessmentProjectId,
    frozenAt: new Date().toISOString(),
    selectedSources: selectedSources
      .filter((source) => source.available)
      .map((source) => ({
        slot: source.slot,
        questionnaireId: source.questionnaireId,
        questionnaireCode: source.questionnaireCode,
        questionnaireName: source.questionnaireName,
        assessmentSessionId: source.assessmentSessionId,
        assessmentProjectName: source.assessmentProjectName,
        completedAt: source.completedAt,
      })),
  };

  return {
    eligibility,
    frozenSelection,
    selectedSources,
  };
}