"use server";
import { createHash, randomUUID } from "crypto";
import {
  and,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";

import {
  buildPrzelewy24PaymentUrl,
  registerPrzelewy24Transaction,
} from "@/features/payments";

import {
  redeemDiscountForCheckout,
} from "@/features/discount-codes/api/discount-code.mutations";

import {
  getPersonalCompositeReport,
} from "@/features/assessment-results/api/personal-composite-report.queries";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { env } from "@/shared/config/env";

import {
  getCompositeReportAccessOfferForCurrentUser,
  getReportAccessOfferForCompletedSession,
} from "./report-access.queries";

type CompositeManualCandidateSelection = {
  tenantSlug: string;
  assessmentSessionId: string;
  projectQuestionnaireId: string | null;
  questionnaireVersionId: string | null;
};

type CompositeManualSelection = {
  bySlot?: Record<
    string,
    CompositeManualCandidateSelection
  >;

  byQuestionnaireId?: Record<
    string,
    CompositeManualCandidateSelection
  >;
};


export type ReportAccessActionState = {
  status: "idle" | "success" | "error";
  message: string;
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
  console.log("UNLOCK_COMPOSITE_ACTION_INPUT", {
    entries:
      formData instanceof FormData
        ? Array.from(formData.entries())
        : null,
  });

  const submittedTenantSlug = String(
    formData.get("tenantSlug") ?? "",
  ).trim();

  const tenantSlugs = Array.from(
    new Set(
      formData
        .getAll("tenantSlugs")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );

  const anchorTenantSlug =
    submittedTenantSlug || tenantSlugs[0] || "";

  if (
    anchorTenantSlug &&
    !tenantSlugs.includes(anchorTenantSlug)
  ) {
    tenantSlugs.unshift(anchorTenantSlug);
  }

  const reportTemplateVersionId = String(
    formData.get("reportTemplateVersionId") ?? "",
  ).trim();

  const rawSelectionMode = String(
    formData.get("selectionMode") ??
    "latest_completed",
  );

  const selectionMode:
    | "latest_completed"
    | "same_project"
    | "manual" =
    rawSelectionMode === "same_project" ||
      rawSelectionMode === "manual"
      ? rawSelectionMode
      : "latest_completed";

  if (
    tenantSlugs.length === 0 ||
    !reportTemplateVersionId
  ) {
    return {
      status: "error",
      message: "Brakuje danych raportu złożonego.",
    };
  }

  try {
    const offer =
      await getCompositeReportAccessOfferForCurrentUser({
        tenantSlug: anchorTenantSlug,
        tenantSlugs,
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
      | CompositeManualSelection
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
          tenantSlug: anchorTenantSlug,
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
            tenantSlugs,
            anchorTenantSlug,
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

          tenantSlug: anchorTenantSlug,
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
            tenantSlugs,
            anchorTenantSlug,
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
        anchorTenantSlug,
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
    tenantSlug: string;

    assessmentSessionId: string;
    assessmentProjectId: string | null;
    assessmentProjectName: string | null;

    projectQuestionnaireId: string | null;

    questionnaireId: string;
    questionnaireVersionId: string | null;

    snapshotId: string;

    completedAt: string | Date | null;
  }[];
};

type CompositeUnlockSourceSelection = {
  mode: "latest_completed" | "same_project" | "manual";
  manual?: CompositeManualSelection;
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
    const questionnaireName =
      typeof sourceRecord.questionnaireName === "string"
        ? sourceRecord.questionnaireName
        : candidateBySlot.get(slot)?.questionnaireName ?? null;
    let selectedCandidate:
      | CompositeUnlockSourceCandidate["candidates"][number]
      | null = null;

    if (sourceSelection.mode === "manual") {
      const manualCandidate =
        sourceSelection.manual?.bySlot?.[slot] ??
        (questionnaireId
          ? sourceSelection.manual?.byQuestionnaireId?.[
          questionnaireId
          ]
          : undefined) ??
        null;

      if (manualCandidate) {
        selectedCandidate =
          candidates.find((candidate) => {
            return (
              candidate.tenantSlug ===
              manualCandidate.tenantSlug &&
              candidate.assessmentSessionId ===
              manualCandidate.assessmentSessionId &&
              (
                !manualCandidate.projectQuestionnaireId ||
                candidate.projectQuestionnaireId ===
                manualCandidate.projectQuestionnaireId
              ) &&
              (
                !manualCandidate.questionnaireVersionId ||
                candidate.questionnaireVersionId ===
                manualCandidate.questionnaireVersionId
              )
            );
          }) ?? null;
      }
    }

    if (!selectedCandidate) {
      selectedCandidate = candidates[0] ?? null;
    }

    const available = Boolean(selectedCandidate);

    return {
      slot,
      required,
      available,

      tenantSlug:
        selectedCandidate?.tenantSlug ?? null,

      questionnaireId:
        selectedCandidate?.questionnaireId ??
        questionnaireId,

      questionnaireCode,

      questionnaireName,

      questionnaireVersionId:
        selectedCandidate?.questionnaireVersionId ??
        null,

      assessmentSessionId:
        selectedCandidate?.assessmentSessionId ??
        null,

      assessmentProjectId:
        selectedCandidate?.assessmentProjectId ??
        null,

      assessmentProjectName:
        selectedCandidate?.assessmentProjectName ??
        null,

      projectQuestionnaireId:
        selectedCandidate?.projectQuestionnaireId ??
        null,

      assessmentResultSnapshotId:
        selectedCandidate?.snapshotId ?? null,

      completedAt:
        selectedCandidate?.completedAt ?? null,
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

        tenantSlug: source.tenantSlug,

        questionnaireId: source.questionnaireId,
        questionnaireCode: source.questionnaireCode,
        questionnaireName: source.questionnaireName,
        questionnaireVersionId:
          source.questionnaireVersionId,

        assessmentSessionId:
          source.assessmentSessionId,

        assessmentProjectId:
          source.assessmentProjectId,

        assessmentProjectName:
          source.assessmentProjectName,

        projectQuestionnaireId:
          source.projectQuestionnaireId,

        assessmentResultSnapshotId:
          source.assessmentResultSnapshotId,

        completedAt: source.completedAt,
      })),
  };

  return {
    eligibility,
    frozenSelection,
    selectedSources,
  };
}

function normalizeOptionalString(
  value: FormDataEntryValue | null,
) {
  const normalized = String(value ?? "").trim();

  return normalized || null;
}

function normalizeAccessCode(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function hashAccessCode(code: string) {
  return createHash("sha256")
    .update(code)
    .digest("hex");
}

function asRecord(
  value: unknown,
): Record<string, any> {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<string, any>
    : {};
}

function moneyToCents(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue)
    ? Math.round(numberValue * 100)
    : 0;
}

function centsToMoneyString(value: number) {
  return (
    Math.max(value, 0) / 100
  ).toFixed(2);
}

function calculateDiscountedTotals({
  originalNet,
  originalGross,
  finalGrossCents,
}: {
  originalNet: unknown;
  originalGross: unknown;
  finalGrossCents: number;
}) {
  const originalNetCents =
    moneyToCents(originalNet);

  const originalGrossCents =
    moneyToCents(originalGross);

  if (
    originalGrossCents <= 0 ||
    finalGrossCents <= 0
  ) {
    return {
      totalNet: "0.00",
      totalVat: "0.00",
      totalGross: "0.00",
    };
  }

  const finalNetCents = Math.min(
    finalGrossCents,
    Math.round(
      originalNetCents *
      finalGrossCents /
      originalGrossCents,
    ),
  );

  const finalVatCents = Math.max(
    finalGrossCents - finalNetCents,
    0,
  );

  return {
    totalNet:
      centsToMoneyString(finalNetCents),

    totalVat:
      centsToMoneyString(finalVatCents),

    totalGross:
      centsToMoneyString(finalGrossCents),
  };
}

function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function buildCompositePaymentReturnUrl({
  orderId,
}: {
  orderId: string;
}) {
  return (
    `${withoutTrailingSlash(env.APP_URL)}` +
    `/my/payments/${encodeURIComponent(orderId)}/return`
  );
}

function buildCompositePaymentStatusUrl() {
  return (
    `${withoutTrailingSlash(env.APP_URL)}` +
    "/api/webhooks/przelewy24"
  );
}

function buildCompositeGrantHref({
  tenantSlug,
  grantId,
}: {
  tenantSlug: string;
  grantId: string;
}) {
  return (
    `/my/reports/composite/grants/${grantId}` +
    `?tenant=${encodeURIComponent(tenantSlug)}`
  );
}

function readCompositeUnlockTenantSlugs(
  formData: FormData,
) {
  const submittedTenantSlug = String(
    formData.get("tenantSlug") ?? "",
  ).trim();

  const tenantSlugs = Array.from(
    new Set(
      formData
        .getAll("tenantSlugs")
        .map((value) =>
          String(value).trim(),
        )
        .filter(Boolean),
    ),
  );

  if (
    submittedTenantSlug &&
    !tenantSlugs.includes(
      submittedTenantSlug,
    )
  ) {
    tenantSlugs.unshift(
      submittedTenantSlug,
    );
  }

  return tenantSlugs;
}

function readCompositeSelectionMode(
  formData: FormData,
):
  | "latest_completed"
  | "same_project"
  | "manual" {
  const value = String(
    formData.get("selectionMode") ??
    "latest_completed",
  );

  if (
    value === "same_project" ||
    value === "manual"
  ) {
    return value;
  }

  return "latest_completed";
}

function readCompositeManualSelection(
  formData: FormData,
  selectionMode:
    | "latest_completed"
    | "same_project"
    | "manual",
): CompositeManualSelection | undefined {
  if (selectionMode !== "manual") {
    return undefined;
  }

  const raw = String(
    formData.get("manualSelection") ?? "{}",
  );

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed as CompositeManualSelection;
    }

    return {};
  } catch {
    throw new Error(
      "Nieprawidłowy format ręcznego wyboru źródeł raportu.",
    );
  }
}

async function resolveCompositeUnlockContext(
  formData: FormData,
) {
  const authSession = await requireSession();

  const actorUserId =
    authSession.user.id;

  const actorEmail =
    authSession.user.email
      ?.trim()
      .toLowerCase() ?? null;

  if (!actorUserId || !actorEmail) {
    throw new Error(
      "Musisz być zalogowany, aby odblokować raport.",
    );
  }

  const tenantSlugs =
    readCompositeUnlockTenantSlugs(
      formData,
    );

  const reportTemplateVersionId =
    String(
      formData.get(
        "reportTemplateVersionId",
      ) ?? "",
    ).trim();

  if (
    tenantSlugs.length === 0 ||
    !reportTemplateVersionId
  ) {
    throw new Error(
      "Brakuje danych raportu złożonego.",
    );
  }

  const selectionMode =
    readCompositeSelectionMode(
      formData,
    );

  const manualSelection =
    readCompositeManualSelection(
      formData,
      selectionMode,
    );

  const offer =
    await getCompositeReportAccessOfferForCurrentUser({
      tenantSlug: tenantSlugs[0],
      tenantSlugs,
      reportTemplateVersionId,
    });

  if (!offer.ok) {
    throw new Error(offer.message);
  }

  if (offer.existingGrant) {
    redirect(
      buildCompositeGrantHref({
        tenantSlug:
          offer.existingGrantTenantSlug ??
          offer.tenantSlug,

        grantId:
          offer.existingGrant.id,
      }),
    );
  }

  if (!offer.eligibility.canRender) {
    throw new Error(
      "Nie można odblokować raportu, ponieważ brakuje wymaganych ukończonych kwestionariuszy.",
    );
  }

  if (!offer.product) {
    throw new Error(
      "Nie znaleziono aktywnego produktu sprzedażowego dla tego raportu.",
    );
  }

  const selectionResult =
    buildFrozenCompositeSelectionForUserUnlock({
      respondentId:
        offer.respondent.id,

      reportTemplateVersionId,

      assessmentProjectId: null,

      configuredSources:
        offer.eligibility.configuredSources,

      sourceCandidates:
        offer.sourceCandidates ?? [],

      sourceSelection: {
        mode: selectionMode,
        manual: manualSelection,
      },
    });

  if (
    !selectionResult.eligibility.canRender
  ) {
    throw new Error(
      "Nie można utworzyć raportu dla wybranego zestawu źródeł.",
    );
  }

  const frozenSelection =
    selectionResult.frozenSelection;

  if (!frozenSelection) {
    throw new Error(
      "Nie udało się zamrozić źródeł raportu.",
    );
  }

  const anchorTenantSlug =
    offer.tenantSlug;

  const resolvedTenantSlugs =
    Array.from(
      new Set([
        anchorTenantSlug,
        ...tenantSlugs,
      ]),
    );

  return {
  authSession,
  actorUserId,
  actorEmail,

  offer,
  product: offer.product,

    anchorTenantSlug,
    tenantSlugs:
      resolvedTenantSlugs,

    reportTemplateVersionId,
    selectionMode,
    selectionResult,
    frozenSelection,
  };
}

export async function unlockCompositeReportAccessAction(
  _previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  try {
    const context =
      await resolveCompositeUnlockContext(
        formData,
      );

const {
  authSession,
  actorUserId,
  actorEmail,

  offer,
  product,
  anchorTenantSlug,
      tenantSlugs,
      selectionMode,
      selectionResult,
      frozenSelection,
    } = context;

    const currency = String(
      product.currency ?? "PLN",
    ).toUpperCase();

    if (currency !== "PLN") {
      throw new Error(
        "Płatność online jest obecnie dostępna wyłącznie w PLN.",
      );
    }

    const discountCode =
      normalizeOptionalString(
        formData.get("discountCode"),
      );

    const originalGrossCents =
      moneyToCents(
        product.priceGross,
      );

    let discountRedemptionId:
      | string
      | null = null;

    let discountAmountCents = 0;
    let finalGrossCents =
      originalGrossCents;

    let isFullyDiscounted = false;

    if (discountCode) {
      const discount =
        await redeemDiscountForCheckout({
          code: discountCode,
          context: "report_unlock",
          originalAmountCents:
            originalGrossCents,
          currency: "PLN",
          userId:
            actorUserId,
          tenantId: null,
          assessmentSessionId: null,
        });

      if (!discount.ok) {
        throw new Error(
          discount.message,
        );
      }

      discountRedemptionId =
        discount.redemptionId;

      discountAmountCents =
        discount.discountAmountCents;

      finalGrossCents =
        discount.finalAmountCents;

      isFullyDiscounted =
        discount.isFullyDiscounted;
    }

    const {
      totalNet,
      totalVat,
      totalGross,
    } = calculateDiscountedTotals({
      originalNet: product.priceNet,
      originalGross:
        product.priceGross,
      finalGrossCents,
    });

    const originalNet =
      toMoneyString(
        product.priceNet,
      );

    const originalGross =
      toMoneyString(
        product.priceGross,
      );

    const originalVat =
      calculateVat({
        gross: product.priceGross,
        net: product.priceNet,
      });

    const now = new Date();

    const validUntil =
      typeof product.validityDays ===
        "number" &&
      product.validityDays > 0
        ? new Date(
            now.getTime() +
            product.validityDays *
              24 *
              60 *
              60 *
              1000,
          )
        : null;

    const orderMetadata = {
      paidByDiscount:
        isFullyDiscounted,

      tenantSlug:
        anchorTenantSlug,

      tenantSlugs,
      anchorTenantSlug,

      reportKind:
        "personal_composite",

      subjectType:
        "respondent",

      subjectId:
        offer.respondent.id,

      respondentId:
        offer.respondent.id,

      reportTemplateId:
        offer.reportVersion
          .reportTemplateId,

      reportTemplateVersionId:
        offer.reportVersion
          .reportTemplateVersionId,

      productId: product.id,
      productCode: product.code,
      productName: product.name,

      compositeSelection:
        frozenSelection,

      compositeSelectionMode:
        selectionMode,

      eligibility:
        selectionResult.eligibility,

      discount:
        discountRedemptionId
          ? {
              redemptionId:
                discountRedemptionId,

              originalGrossCents,
              discountAmountCents,
              finalGrossCents,
            }
          : null,
    };

    if (isFullyDiscounted) {
      const result =
        await controlDb.transaction(
          async (tx) => {
            const [order] =
              await tx
                .insert(
                  reportAccessOrders,
                )
                .values({
                  buyerType: "user",

                  tenantSlug:
                    anchorTenantSlug,

                  buyerUserId:
                    actorUserId,

                  status: "paid",

                  paymentProvider:
                    "discount",

                  paymentProviderOrderId:
                    `discount:${randomUUID()}`,

                  paymentProviderSessionId:
                    null,

                  currency,

                  totalNet,
                  totalVat,
                  totalGross,

                  invoiceRequested: false,
                  billingSnapshot: {},

                  metadata:
                    orderMetadata,

                  paidAt: now,

                  createdAt: now,
                  updatedAt: now,

                  createdBy:
                    actorUserId,

                  updatedBy:
                    actorUserId,
                })
                .returning({
                  id:
                    reportAccessOrders.id,
                });

            if (!order) {
              throw new Error(
                "Nie udało się utworzyć zamówienia.",
              );
            }

            await tx
              .insert(
                reportAccessOrderItems,
              )
              .values({
                orderId: order.id,
                productId:
                  product.id,

                quantity: 1,

                unitNet:
                  originalNet,

                unitVat:
                  originalVat,

                unitGross:
                  originalGross,

                totalNet,
                totalVat,
                totalGross,

                createdAt: now,
                updatedAt: now,
              });

            const [grant] =
              await tx
                .insert(
                  reportAccessGrants,
                )
                .values({
                  source: "discount",
                  status: "active",

                  productId:
                    product.id,

                  orderId:
                    order.id,

                  reportTemplateId:
                    offer.reportVersion
                      .reportTemplateId,

                  reportTemplateVersionId:
                    offer.reportVersion
                      .reportTemplateVersionId,

                  tenantSlug:
                    anchorTenantSlug,

                  userId:
                    actorUserId,

                  email:
                    actorEmail,

                  subjectType:
                    "respondent",

                  subjectId:
                    offer.respondent.id,

                  assessmentProjectId:
                    null,

                  assessmentSessionId:
                    null,

                  assessmentAccessLinkId:
                    null,

                  validFrom: now,
                  validUntil,

                  metadata: {
                    ...orderMetadata,

                    paymentProvider:
                      "discount",

                    orderId:
                      order.id,
                  },

                  createdAt: now,
                  updatedAt: now,

                  createdBy:
                    actorUserId,

                  updatedBy:
                    actorUserId,
                })
                .returning({
                  id:
                    reportAccessGrants.id,
                });

            if (!grant) {
              throw new Error(
                "Nie udało się utworzyć dostępu do raportu.",
              );
            }

            return {
              grantId: grant.id,
            };
          },
        );

      revalidatePath(
        "/my/assessment",
      );

      redirect(
        buildCompositeGrantHref({
          tenantSlug:
            anchorTenantSlug,

          grantId:
            result.grantId,
        }),
      );
    }

    const paymentSessionId =
      `humanet:composite:${randomUUID()}`;

    const [order] =
      await controlDb.transaction(
        async (tx) => {
          const [createdOrder] =
            await tx
              .insert(
                reportAccessOrders,
              )
              .values({
                buyerType: "user",

                tenantSlug:
                  anchorTenantSlug,

                buyerUserId:
                  actorUserId,

                status:
                  "pending_payment",

                paymentProvider:
                  "przelewy24",

                paymentProviderOrderId:
                  null,

                paymentProviderSessionId:
                  paymentSessionId,

                currency,

                totalNet,
                totalVat,
                totalGross,

                invoiceRequested: false,
                billingSnapshot: {},

                metadata:
                  orderMetadata,

                paidAt: null,

                createdAt: now,
                updatedAt: now,

                createdBy:
                  actorUserId,

                updatedBy:
                  actorUserId,
              })
              .returning({
                id:
                  reportAccessOrders.id,
              });

          if (!createdOrder) {
            throw new Error(
              "Nie udało się utworzyć zamówienia.",
            );
          }

          await tx
            .insert(
              reportAccessOrderItems,
            )
            .values({
              orderId:
                createdOrder.id,

              productId:
                product.id,

              quantity: 1,

              unitNet:
                originalNet,

              unitVat:
                originalVat,

              unitGross:
                originalGross,

              totalNet,
              totalVat,
              totalGross,

              createdAt: now,
              updatedAt: now,
            });

          return [
            createdOrder,
          ] as const;
        },
      );

    try {
      const registration =
        await registerPrzelewy24Transaction({
          sessionId:
            paymentSessionId,

          amount:
            finalGrossCents,

          currency,

          description:
            `HUMANET — ${product.name}`,

          email:
            actorEmail,

          client:
            authSession.user.name ??
            actorEmail,

          country: "PL",
          language: "pl",

          urlReturn:
            buildCompositePaymentReturnUrl({
              orderId: order.id,
            }),

          urlStatus:
            buildCompositePaymentStatusUrl(),
        });

      await controlDb
        .update(
          reportAccessOrders,
        )
        .set({
          updatedAt:
            new Date(),

          updatedBy:
            actorUserId,

          metadata: {
            ...orderMetadata,

            payment: {
              status:
                "registered",

              provider:
                "przelewy24",

              token:
                registration.token,

              registeredAt:
                new Date().toISOString(),
            },
          },
        })
        .where(
          eq(
            reportAccessOrders.id,
            order.id,
          ),
        );

      redirect(
        buildPrzelewy24PaymentUrl(
          registration.token,
        ),
      );
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      await controlDb
        .update(
          reportAccessOrders,
        )
        .set({
          status: "failed",

          updatedAt:
            new Date(),

          updatedBy:
            actorUserId,

          metadata: {
            ...orderMetadata,

            payment: {
              status:
                "registration_failed",

              failedAt:
                new Date().toISOString(),

              message:
                error instanceof Error
                  ? error.message
                  : null,
            },
          },
        })
        .where(
          eq(
            reportAccessOrders.id,
            order.id,
          ),
        );

      throw new Error(
        "Nie udało się rozpocząć płatności. Spróbuj ponownie.",
      );
    }
  } catch (error) {
    return fail(error);
  }
}

export async function redeemCompositeReportAccessCodeAction(
  _previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  try {
    const context =
      await resolveCompositeUnlockContext(
        formData,
      );

const {
  authSession,
  actorUserId,
  actorEmail,

  offer,
  anchorTenantSlug,
      tenantSlugs,
      selectionMode,
      selectionResult,
      frozenSelection,
    } = context;

    const accessCodeValue =
      normalizeAccessCode(
        formData.get("accessCode"),
      );

    if (!accessCodeValue) {
      throw new Error(
        "Wpisz kod dostępu.",
      );
    }

    const codeHash =
      hashAccessCode(
        accessCodeValue,
      );

    const accessCode =
      await controlDb.query
        .reportAccessCodes
        .findFirst({
          where: and(
            eq(
              reportAccessCodes.codeHash,
              codeHash,
            ),
            isNull(
              reportAccessCodes.deletedAt,
            ),
          ),
        });

    if (!accessCode) {
      throw new Error(
        "Nie znaleziono takiego kodu dostępu.",
      );
    }

    if (
      accessCode.status !==
        "available" &&
      accessCode.status !==
        "assigned"
    ) {
      throw new Error(
        "Ten kod został już wykorzystany albo nie jest aktywny.",
      );
    }

    if (
      accessCode.tenantSlug &&
      !tenantSlugs.includes(
        accessCode.tenantSlug,
      )
    ) {
      throw new Error(
        "Ten kod nie jest przypisany do organizacji źródłowej tego raportu.",
      );
    }

    const now = new Date();

    if (
      accessCode.validFrom &&
      accessCode.validFrom > now
    ) {
      throw new Error(
        "Ten kod nie jest jeszcze aktywny.",
      );
    }

    if (
      accessCode.validUntil &&
      accessCode.validUntil < now
    ) {
      throw new Error(
        "Ten kod wygasł.",
      );
    }

    if (
      accessCode.assignedToUserId &&
      accessCode.assignedToUserId !==
        actorUserId
    ) {
      throw new Error(
        "Ten kod jest przypisany do innego konta.",
      );
    }

    if (
      accessCode.assignedToEmail &&
      accessCode.assignedToEmail
        .trim()
        .toLowerCase() !==
      actorEmail
        .trim()
        .toLowerCase()
    ) {
      throw new Error(
        "Ten kod jest przypisany do innego adresu e-mail.",
      );
    }

    const codeProduct =
      await controlDb.query
        .reportAccessProducts
        .findFirst({
          where: and(
            eq(
              reportAccessProducts.id,
              accessCode.productId,
            ),
            eq(
              reportAccessProducts.status,
              "active",
            ),
            isNull(
              reportAccessProducts.deletedAt,
            ),
          ),
        });

    if (!codeProduct) {
      throw new Error(
        "Produkt przypisany do kodu nie jest aktywny.",
      );
    }

    if (
      codeProduct.reportTemplateId !==
      offer.reportVersion
        .reportTemplateId
    ) {
      throw new Error(
        "Ten kod dotyczy innego raportu.",
      );
    }

    const validUntil =
      typeof codeProduct.validityDays ===
        "number" &&
      codeProduct.validityDays > 0
        ? new Date(
            now.getTime() +
            codeProduct.validityDays *
              24 *
              60 *
              60 *
              1000,
          )
        : null;

    const result =
      await controlDb.transaction(
        async (tx) => {
          const [claimedCode] =
            await tx
              .update(
                reportAccessCodes,
              )
              .set({
                status: "redeemed",

                redeemedByUserId:
                  actorUserId,

                redeemedAt: now,

                updatedAt: now,

                updatedBy:
                  actorUserId,

                metadata: {
                  ...asRecord(
                    accessCode.metadata,
                  ),

                  redeemedFrom:
                    "my_composite_report_unlock",

                  redeemedAt:
                    now.toISOString(),

                  reportKind:
                    "personal_composite",

                  reportTemplateVersionId:
                    offer.reportVersion
                      .reportTemplateVersionId,
                },
              })
              .where(
                and(
                  eq(
                    reportAccessCodes.id,
                    accessCode.id,
                  ),

                  inArray(
                    reportAccessCodes.status,
                    [
                      "available",
                      "assigned",
                    ],
                  ),

                  isNull(
                    reportAccessCodes.deletedAt,
                  ),
                ),
              )
              .returning({
                id:
                  reportAccessCodes.id,
              });

          if (!claimedCode) {
            throw new Error(
              "Kod został wykorzystany przez inną operację.",
            );
          }

          const [grant] =
            await tx
              .insert(
                reportAccessGrants,
              )
              .values({
                source:
                  "access_code",

                status:
                  "active",

                productId:
                  codeProduct.id,

                accessCodeId:
                  accessCode.id,

                reportTemplateId:
                  offer.reportVersion
                    .reportTemplateId,

                reportTemplateVersionId:
                  offer.reportVersion
                    .reportTemplateVersionId,

                tenantSlug:
                  anchorTenantSlug,

                userId:
                  actorUserId,

                email:
                  actorEmail,

                subjectType:
                  "respondent",

                subjectId:
                  offer.respondent.id,

                assessmentProjectId:
                  null,

                assessmentSessionId:
                  null,

                assessmentAccessLinkId:
                  null,

                validFrom: now,
                validUntil,

                metadata: {
                  reportKind:
                    "personal_composite",

                  respondentId:
                    offer.respondent.id,

                  accessCodePreview:
                    accessCode.codePreview,

                  productCode:
                    codeProduct.code,

                  productName:
                    codeProduct.name,

                  compositeSelection:
                    frozenSelection,

                  compositeSelectionMode:
                    selectionMode,

                  tenantSlugs,
                  anchorTenantSlug,

                  eligibility:
                    selectionResult.eligibility,

                  unlockedFrom:
                    "my_composite_report_unlock",

                  unlockedAt:
                    now.toISOString(),
                },

                createdAt: now,
                updatedAt: now,

                createdBy:
                  actorUserId,

                updatedBy:
                  actorUserId,
              })
              .returning({
                id:
                  reportAccessGrants.id,
              });

          if (!grant) {
            throw new Error(
              "Nie udało się utworzyć dostępu do raportu.",
            );
          }

          await tx
            .update(
              reportAccessCodes,
            )
            .set({
              metadata: {
                ...asRecord(
                  accessCode.metadata,
                ),

                redeemedFrom:
                  "my_composite_report_unlock",

                redeemedAt:
                  now.toISOString(),

                grantId:
                  grant.id,

                reportKind:
                  "personal_composite",

                reportTemplateVersionId:
                  offer.reportVersion
                    .reportTemplateVersionId,
              },

              updatedAt: now,

              updatedBy:
                actorUserId,
            })
            .where(
              eq(
                reportAccessCodes.id,
                accessCode.id,
              ),
            );

          return {
            grantId: grant.id,
          };
        },
      );

    revalidatePath(
      "/my/assessment",
    );

    redirect(
      buildCompositeGrantHref({
        tenantSlug:
          anchorTenantSlug,

        grantId:
          result.grantId,
      }),
    );
  } catch (error) {
    return fail(error);
  }
}