// features/assessment-projects/api/partner-report-access.actions.ts
"use server";

import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";


import crypto from "crypto";
import { and, desc, eq, isNull, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
  reportTemplateVersions,
  billingProfiles,
} from "@/drizzle/schema";

import {
  assessmentResultSnapshots,
  assessmentProjects,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

/* import { autoGrantReportAccessForCompletedSession } from "@/features/report-access/api/report-access-auto-grant.mutations"; */

function nullableString(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();
    return normalized || null;
}

function booleanValue(value: FormDataEntryValue | null) {
    return value === "on" || value === "true" || value === "1";
}

function buildBillingSnapshot(input: {
    invoiceRequested: boolean;
    billingType: string | null;
    companyName: string | null;
    taxId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    postalCode: string | null;
    city: string | null;
    street: string | null;
    buildingNumber: string | null;
    apartmentNumber: string | null;
    invoiceEmail: string | null;
}) {
    return {
        invoiceRequested: input.invoiceRequested,
        type: input.billingType ?? "company",

        companyName: input.companyName,
        taxId: input.taxId,

        firstName: input.firstName,
        lastName: input.lastName,

        email: input.email,
        phone: input.phone,

        address: {
            country: input.country ?? "PL",
            postalCode: input.postalCode,
            city: input.city,
            street: input.street,
            buildingNumber: input.buildingNumber,
            apartmentNumber: input.apartmentNumber,
        },

        invoiceEmail: input.invoiceEmail ?? input.email,
    };
}

export type PartnerGrantReportAccessState = {
    status: "idle" | "success" | "error";
    message: string;
};

function fail(message: string): PartnerGrantReportAccessState {
    return {
        status: "error",
        message,
    };
}

function success(message: string): PartnerGrantReportAccessState {
    return {
        status: "success",
        message,
    };
}

function normalizeString(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();

    return normalized || null;
}
function moneyNumber(value: unknown) {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
}

function moneyString(value: number) {
    return value.toFixed(2);
}

function multiplyMoney(unit: number, quantity: number) {
    return Number((unit * quantity).toFixed(2));
}

function createAccessCode() {
    const random = crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 16)
        .toUpperCase();

    return `HV-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(
        8,
        12,
    )}-${random.slice(12, 16)}`;
}

function hashAccessCode(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

function previewAccessCode(code: string) {
    const parts = code.split("-");

    if (parts.length >= 5) {
        return `${parts[0]}-${parts[1]}-****-****-${parts[4]}`;
    }

    return `${code.slice(0, 7)}…`;
}

async function createUniqueAccessCode() {
    let code = createAccessCode();
    let codeHash = hashAccessCode(code);

    let existing = await controlDb.query.reportAccessCodes.findFirst({
        where: and(
            eq(reportAccessCodes.codeHash, codeHash),
            isNull(reportAccessCodes.deletedAt),
        ),
    });

    while (existing) {
        code = createAccessCode();
        codeHash = hashAccessCode(code);

        existing = await controlDb.query.reportAccessCodes.findFirst({
            where: and(
                eq(reportAccessCodes.codeHash, codeHash),
                isNull(reportAccessCodes.deletedAt),
            ),
        });
    }

    return {
        code,
        codeHash,
        codePreview: previewAccessCode(code),
    };
}


type TenantDb = any;

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

async function resolveCompletedSessionQuestionnaireScope({
  db,
  sessionId,
  projectQuestionnaireId,
  questionnaireId,
  questionnaireVersionId,
}: {
  db: TenantDb;
  sessionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  /**
   * Nowy model: wskazano konkretny project questionnaire.
   * Źródłem prawdy jest scoped snapshot.
   */
  if (projectQuestionnaireId) {
    const snapshotRows = await db
      .select({
        snapshotId: assessmentResultSnapshots.id,
        projectQuestionnaireId:
          assessmentResultSnapshots.projectQuestionnaireId,
        questionnaireId: assessmentResultSnapshots.questionnaireId,
        questionnaireVersionId:
          assessmentResultSnapshots.questionnaireVersionId,
      })
      .from(assessmentResultSnapshots)
      .where(
        and(
          eq(
            assessmentResultSnapshots.assessmentSessionId,
            sessionId,
          ),
          eq(
            assessmentResultSnapshots.projectQuestionnaireId,
            projectQuestionnaireId,
          ),
          isNull(assessmentResultSnapshots.deletedAt),
        ),
      )
      .limit(1);

    const snapshot = snapshotRows[0] ?? null;

    if (!snapshot) {
      return {
        ok: false as const,
        message:
          "Nie znaleziono zapisanego wyniku dla wybranego kwestionariusza.",
      };
    }

    const resolvedQuestionnaireId =
      snapshot.questionnaireId ?? questionnaireId ?? null;

    const resolvedQuestionnaireVersionId =
      snapshot.questionnaireVersionId ??
      questionnaireVersionId ??
      null;

    if (!resolvedQuestionnaireId || !resolvedQuestionnaireVersionId) {
      return {
        ok: false as const,
        message:
          "Snapshot wybranego kwestionariusza nie zawiera pełnego zakresu wyniku.",
      };
    }

    /**
     * Nie ufamy bezwarunkowo hidden inputom.
     * Jeżeli je przesłano, muszą być zgodne ze snapshotem.
     */
    if (
      questionnaireId &&
      questionnaireId !== resolvedQuestionnaireId
    ) {
      return {
        ok: false as const,
        message:
          "Identyfikator kwestionariusza nie jest zgodny z zapisanym wynikiem.",
      };
    }

    if (
      questionnaireVersionId &&
      questionnaireVersionId !==
        resolvedQuestionnaireVersionId
    ) {
      return {
        ok: false as const,
        message:
          "Wersja kwestionariusza nie jest zgodna z zapisanym wynikiem.",
      };
    }

    return {
      ok: true as const,
      snapshotId: snapshot.snapshotId,
      projectQuestionnaireId:
        snapshot.projectQuestionnaireId,
      questionnaireId: resolvedQuestionnaireId,
      questionnaireVersionId:
        resolvedQuestionnaireVersionId,
    };
  }

  /**
   * Legacy: brak projectQuestionnaireId.
   * Działa tylko wtedy, gdy cała sesja zawiera jedną wersję.
   */
  const legacy = await resolveCompletedSessionQuestionnaireVersionId({
    db,
    sessionId,
  });

  if (!legacy.ok) {
    return legacy;
  }

  return {
    ok: true as const,
    snapshotId: null,
    projectQuestionnaireId: null,
    questionnaireId: questionnaireId ?? null,
    questionnaireVersionId: legacy.questionnaireVersionId,
  };
}

async function resolveCompletedSessionQuestionnaireVersionId({
  db,
  sessionId,
}: {
  db: TenantDb;
  sessionId: string;
}) {
  const rows = await db
    .select({
      questionnaireVersionId: assessmentResponses.questionnaireVersionId,
    })
    .from(assessmentResponses)
    .where(
      and(
        eq(assessmentResponses.assessmentSessionId, sessionId),
        isNull(assessmentResponses.deletedAt),
      ),
    );

  const questionnaireVersionIds = uniqueNonEmpty(
    rows.map((row: any) => row.questionnaireVersionId),
  );

  if (questionnaireVersionIds.length === 0) {
    return {
      ok: false as const,
      message:
        "Nie znaleziono odpowiedzi powiązanych z wersją kwestionariusza.",
    };
  }

  if (questionnaireVersionIds.length > 1) {
    return {
      ok: false as const,
      message:
        "Sesja zawiera odpowiedzi z więcej niż jednej wersji kwestionariusza. Nie można bezpiecznie nadać raportu.",
    };
  }

  return {
    ok: true as const,
    questionnaireVersionId: questionnaireVersionIds[0],
  };
}
export async function grantReportAccessToCompletedSessionAction(
  _previousState: PartnerGrantReportAccessState,
  formData: FormData,
): Promise<PartnerGrantReportAccessState> {
  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const sessionId = normalizeString(formData.get("sessionId"));
  const productId = normalizeString(formData.get("productId"));

const projectQuestionnaireId = normalizeString(
  formData.get("projectQuestionnaireId"),
);

const questionnaireId = normalizeString(
  formData.get("questionnaireId"),
);

const questionnaireVersionId = normalizeString(
  formData.get("questionnaireVersionId"),
);

console.log("PARTNER_SESSION_GRANT_SCOPE_INPUT", {
  tenantSlug,
  sessionId,
  productId,
  projectQuestionnaireId,
  questionnaireId,
  questionnaireVersionId,
});

  if (!tenantSlug || !sessionId || !productId) {
    return fail("Brakuje tenanta, sesji albo produktu dostępu.");
  }

  const authSession = await requireSession();

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "assessment_project:update");

  const db = await getTenantDb(ctx);

const sessionRows = await db
  .select({
    id: assessmentSessions.id,
    status: assessmentSessions.status,
    assessmentProjectId: assessmentSessions.assessmentProjectId,
    accessLinkId: assessmentSessions.accessLinkId,
    respondentId: assessmentSessions.respondentId,
    respondentEmail: respondentIdentities.email,
  })
  .from(assessmentSessions)
  .innerJoin(
    respondents,
    eq(respondents.id, assessmentSessions.respondentId),
  )
  .innerJoin(
    respondentIdentities,
    eq(respondentIdentities.respondentId, respondents.id),
  )
  .where(
    and(
      eq(assessmentSessions.id, sessionId),
      isNull(assessmentSessions.deletedAt),
      isNull(respondents.deletedAt),
      isNull(respondentIdentities.deletedAt),
    ),
  )
  .limit(1);

const session = sessionRows[0] ?? null;

if (!session) {
  return fail("Nie znaleziono sesji badania.");
}

  if (session.status !== "completed") {
    return fail("Dostęp do raportu można nadać dopiero po zakończeniu sesji.");
  }
const respondentEmail = normalizeString(session.respondentEmail)?.toLowerCase();

if (!respondentEmail) {
  return fail(
    "Nie można nadać dostępu do raportu, bo respondent nie ma adresu e-mail.",
  );
}
const completedQuestionnaire =
  await resolveCompletedSessionQuestionnaireScope({
    db,
    sessionId: session.id,
    projectQuestionnaireId,
    questionnaireId,
    questionnaireVersionId,
  });

if (!completedQuestionnaire.ok) {
  return fail(completedQuestionnaire.message);
}

const completedProjectQuestionnaireId =
  completedQuestionnaire.projectQuestionnaireId;

const completedQuestionnaireId =
  completedQuestionnaire.questionnaireId;

const completedQuestionnaireVersionId =
  completedQuestionnaire.questionnaireVersionId;

console.log("PARTNER_SESSION_GRANT_SCOPE_RESOLVED", {
  sessionId: session.id,
  snapshotId: completedQuestionnaire.snapshotId,
  projectQuestionnaireId:
    completedProjectQuestionnaireId,
  questionnaireId: completedQuestionnaireId,
  questionnaireVersionId:
    completedQuestionnaireVersionId,
});

  const product = await controlDb.query.reportAccessProducts.findFirst({
    where: and(
      eq(reportAccessProducts.id, productId),
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  });

  if (!product) {
    return fail("Nie znaleziono aktywnego produktu dostępu.");
  }

  const reportVersion = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
      eq(
        reportTemplateVersions.questionnaireVersionId,
        completedQuestionnaireVersionId,
      ),
      eq(reportTemplateVersions.status, "active"),
      isNull(reportTemplateVersions.deletedAt),
    ),
    orderBy: desc(reportTemplateVersions.updatedAt),
  });

  if (!reportVersion) {
    return fail(
      "Nie znaleziono aktywnej wersji raportu pasującej do ukończonego kwestionariusza. Dostęp nie został zużyty.",
    );
  }

const existingGrantCandidates =
  await controlDb.query.reportAccessGrants.findMany({
    where: and(
      eq(reportAccessGrants.tenantSlug, tenantSlug),
      eq(reportAccessGrants.assessmentSessionId, session.id),
      eq(
        reportAccessGrants.reportTemplateId,
        product.reportTemplateId,
      ),
      eq(reportAccessGrants.status, "active"),
      isNull(reportAccessGrants.deletedAt),
    ),
  });

const existingGrant =
  existingGrantCandidates.find((grant) => {
    const metadata =
      grant.metadata &&
      typeof grant.metadata === "object" &&
      !Array.isArray(grant.metadata)
        ? (grant.metadata as Record<string, any>)
        : {};

    const reportScope =
      metadata.reportScope &&
      typeof metadata.reportScope === "object" &&
      !Array.isArray(metadata.reportScope)
        ? (metadata.reportScope as Record<string, any>)
        : {};

    const grantProjectQuestionnaireId =
      typeof metadata.projectQuestionnaireId === "string"
        ? metadata.projectQuestionnaireId
        : typeof reportScope.projectQuestionnaireId === "string"
          ? reportScope.projectQuestionnaireId
          : null;

    const grantQuestionnaireVersionId =
      typeof metadata.questionnaireVersionId === "string"
        ? metadata.questionnaireVersionId
        : typeof reportScope.questionnaireVersionId === "string"
          ? reportScope.questionnaireVersionId
          : null;

    if (completedProjectQuestionnaireId) {
      return (
        grantProjectQuestionnaireId ===
        completedProjectQuestionnaireId
      );
    }

    return (
      grantQuestionnaireVersionId ===
      completedQuestionnaireVersionId
    );
  }) ?? null;

  if (existingGrant) {
    revalidatePath(
      `/dashboard/partner-assessment/${tenantSlug}/projects/${session.assessmentProjectId}`,
    );

    return success(
      "Ten kwestionariusz ma już aktywny dostęp do tego typu raportu.",
    );
  }

  const now = new Date();

  const grantValidUntil =
    typeof product.validityDays === "number" && product.validityDays > 0
      ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
      : null;

  try {
    const result = await controlDb.transaction(async (tx) => {
      const availableCodeRows = await tx
        .select({
          id: reportAccessCodes.id,
          metadata: reportAccessCodes.metadata,
        })
        .from(reportAccessCodes)
        .where(
          and(
            eq(reportAccessCodes.tenantSlug, tenantSlug),
            eq(reportAccessCodes.productId, product.id),
            eq(reportAccessCodes.status, "available"),

            or(
              isNull(reportAccessCodes.assessmentProjectId),
              eq(
                reportAccessCodes.assessmentProjectId,
                session.assessmentProjectId,
              ),
            ),

            isNull(reportAccessCodes.assessmentSessionId),
            isNull(reportAccessCodes.assessmentAccessLinkId),
            isNull(reportAccessCodes.assignedToEmail),
            isNull(reportAccessCodes.assignedToUserId),
            isNull(reportAccessCodes.deletedAt),
          ),
        )
        .orderBy(reportAccessCodes.createdAt)
        .limit(1);

      const availableCode = availableCodeRows[0] ?? null;

      if (!availableCode) {
        throw new Error(
          "Brak dostępnych dostępów w puli dla tego produktu. Najpierw wygeneruj lub kup dostęp dla tenanta.",
        );
      }

      const [grant] = await tx
  .insert(reportAccessGrants)
  .values({
    source: "admin_grant",
    status: "active",

    productId: product.id,
    accessCodeId: availableCode.id,

    reportTemplateId: product.reportTemplateId,
    reportTemplateVersionId: reportVersion.id,

    tenantSlug,

    // TO JEST KLUCZOWE:
userId: null,
email: respondentEmail,

    assessmentProjectId: session.assessmentProjectId,
    assessmentSessionId: session.id,
    assessmentAccessLinkId: session.accessLinkId,

    validFrom: now,
    validUntil: grantValidUntil,

metadata: {
  manuallyGranted: true,
  accessCodeId: availableCode.id,
  productCode: product.code,
  productName: product.name,

  projectQuestionnaireId:
    completedProjectQuestionnaireId,
  questionnaireId: completedQuestionnaireId,
  questionnaireVersionId:
    completedQuestionnaireVersionId,

  reportScope: {
    type: "project_questionnaire",
    projectQuestionnaireId:
      completedProjectQuestionnaireId,
    questionnaireId: completedQuestionnaireId,
    questionnaireVersionId:
      completedQuestionnaireVersionId,
  },

  grantedByUserId: authSession.user.id,
  grantedAt: now.toISOString(),
},

    createdAt: now,
    updatedAt: now,
    createdBy: authSession.user.id,
    updatedBy: authSession.user.id,
  })
  .returning({
    id: reportAccessGrants.id,
    reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
  });

      await tx
        .update(reportAccessCodes)
        .set({
          status: "redeemed",

          assessmentProjectId: session.assessmentProjectId,
          assessmentSessionId: session.id,
          assessmentAccessLinkId: session.accessLinkId,

          redeemedByUserId: authSession.user.id,
          redeemedAt: now,

          metadata: {
            ...(typeof availableCode.metadata === "object" &&
            availableCode.metadata !== null &&
            !Array.isArray(availableCode.metadata)
              ? availableCode.metadata
              : {}),
            redeemedFrom: "partner_assessment_project_session",
            redeemedByUserId: authSession.user.id,
            redeemedAt: now.toISOString(),
            grantId: grant.id,
            questionnaireVersionId: completedQuestionnaireVersionId,
            projectQuestionnaireId:
              completedProjectQuestionnaireId,
            questionnaireId: completedQuestionnaireId,

            reportScope: {
              type: "project_questionnaire",
              projectQuestionnaireId:
                completedProjectQuestionnaireId,
              questionnaireId: completedQuestionnaireId,
              questionnaireVersionId:
                completedQuestionnaireVersionId,
            },
          },

          updatedAt: now,
          updatedBy: authSession.user.id,
        })
        .where(
          and(
            eq(reportAccessCodes.id, availableCode.id),
            eq(reportAccessCodes.status, "available"),
          ),
        );

      return {
        grantId: grant.id,
        reportTemplateVersionId: grant.reportTemplateVersionId,
        accessCodeId: availableCode.id,
      };
    });

    revalidatePath(
      `/dashboard/partner-assessment/${tenantSlug}/projects/${session.assessmentProjectId}`,
    );

    return success(
      "Nadano dostęp do raportu dla wybranego kwestionariusza.",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się nadać dostępu do raportu.";

    return fail(message);
  }
}

export async function bulkGrantReportAccessToCompletedSessionsAction(
  _previousState: PartnerGrantReportAccessState,
  formData: FormData,
): Promise<PartnerGrantReportAccessState> {
  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const projectId = normalizeString(formData.get("projectId"));
  const productId = normalizeString(formData.get("productId"));

  const rawSessionIds = formData.getAll("sessionIds");
  const sessionIds = Array.from(
    new Set(
      rawSessionIds
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!tenantSlug || !projectId || !productId) {
    return fail("Brakuje tenanta, projektu albo produktu dostępu.");
  }

  if (sessionIds.length === 0) {
    return fail("Nie zaznaczono żadnej sesji.");
  }

  const authSession = await requireSession();

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "assessment_project:update");

  const db = await getTenantDb(ctx);

  const product = await controlDb.query.reportAccessProducts.findFirst({
    where: and(
      eq(reportAccessProducts.id, productId),
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  });

  if (!product) {
    return fail("Nie znaleziono aktywnego produktu dostępu.");
  }

  const sessions = await db
  .select({
    id: assessmentSessions.id,
    status: assessmentSessions.status,
    assessmentProjectId: assessmentSessions.assessmentProjectId,
    accessLinkId: assessmentSessions.accessLinkId,
    respondentId: assessmentSessions.respondentId,
    respondentEmail: respondentIdentities.email,
  })
  .from(assessmentSessions)
  .innerJoin(respondents, eq(respondents.id, assessmentSessions.respondentId))
  .innerJoin(
    respondentIdentities,
    eq(respondentIdentities.respondentId, respondents.id),
  )
  .where(
    and(
      inArray(assessmentSessions.id, sessionIds),
      eq(assessmentSessions.assessmentProjectId, projectId),
      eq(assessmentSessions.status, "completed"),
      isNull(assessmentSessions.deletedAt),
      isNull(respondents.deletedAt),
      isNull(respondentIdentities.deletedAt),
    ),
  );
  if (sessions.length === 0) {
    return fail("Nie znaleziono zakończonych sesji do nadania dostępu.");
  }

  if (sessions.length !== sessionIds.length) {
    return fail(
      "Część zaznaczonych sesji nie istnieje, nie należy do projektu albo nie jest zakończona.",
    );
  }

type EligibleSession = {
  session: (typeof sessions)[number];
  questionnaireVersionId: string;
  reportTemplateVersionId: string;
  respondentEmail: string;
};

  const eligibleSessions: EligibleSession[] = [];
  let skippedExistingGrantCount = 0;
  let skippedIncompatibleReportCount = 0;
  let skippedInvalidQuestionnaireCount = 0;

  const errors: string[] = [];

  for (const session of sessions) {
    const existingGrant = await controlDb.query.reportAccessGrants.findFirst({
      where: and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, session.id),
        eq(reportAccessGrants.reportTemplateId, product.reportTemplateId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    });

    if (existingGrant) {
      skippedExistingGrantCount += 1;
      continue;
    }

    const completedQuestionnaire =
      await resolveCompletedSessionQuestionnaireVersionId({
        db,
        sessionId: session.id,
      });

    if (!completedQuestionnaire.ok) {
      skippedInvalidQuestionnaireCount += 1;
      errors.push(`Sesja ${session.id}: ${completedQuestionnaire.message}`);
      continue;
    }

    const reportVersion =
      await controlDb.query.reportTemplateVersions.findFirst({
        where: and(
          eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
          eq(
            reportTemplateVersions.questionnaireVersionId,
            completedQuestionnaire.questionnaireVersionId,
          ),
          eq(reportTemplateVersions.status, "active"),
          isNull(reportTemplateVersions.deletedAt),
        ),
        orderBy: desc(reportTemplateVersions.updatedAt),
      });

    if (!reportVersion) {
      skippedIncompatibleReportCount += 1;
      continue;
    }

const respondentEmail = normalizeString(session.respondentEmail)?.toLowerCase();

if (!respondentEmail) {
  skippedInvalidQuestionnaireCount += 1;
  errors.push(`Sesja ${session.id}: respondent nie ma adresu e-mail.`);
  continue;
}

eligibleSessions.push({
  session,
  questionnaireVersionId: completedQuestionnaire.questionnaireVersionId,
  reportTemplateVersionId: reportVersion.id,
  respondentEmail,
});
  }

  if (eligibleSessions.length === 0) {
    return fail(
      [
        "Nie znaleziono żadnej sesji, dla której można bezpiecznie nadać wybrany raport.",
        `Pominięto istniejące dostępy: ${skippedExistingGrantCount}.`,
        `Pominięto niepasujący raport: ${skippedIncompatibleReportCount}.`,
        `Pominięto błędne/niejednoznaczne sesje: ${skippedInvalidQuestionnaireCount}.`,
        errors.length > 0 ? `Szczegóły: ${errors.slice(0, 3).join("; ")}` : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  const availableCodes = await controlDb.query.reportAccessCodes.findMany({
    where: and(
      eq(reportAccessCodes.tenantSlug, tenantSlug),
      eq(reportAccessCodes.productId, product.id),
      eq(reportAccessCodes.status, "available"),

      or(
        isNull(reportAccessCodes.assessmentProjectId),
        eq(reportAccessCodes.assessmentProjectId, projectId),
      ),

      isNull(reportAccessCodes.assessmentSessionId),
      isNull(reportAccessCodes.assessmentAccessLinkId),
      isNull(reportAccessCodes.assignedToEmail),
      isNull(reportAccessCodes.assignedToUserId),
      isNull(reportAccessCodes.deletedAt),
    ),
    orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    limit: eligibleSessions.length,
  });

  if (availableCodes.length < eligibleSessions.length) {
    return fail(
      `Brakuje wolnych dostępów w puli dla sesji zgodnych z wybranym raportem. Potrzebne: ${eligibleSessions.length}, dostępne: ${availableCodes.length}. Dostępy nie zostały zużyte.`,
    );
  }

  const now = new Date();

  const grantValidUntil =
    typeof product.validityDays === "number" && product.validityDays > 0
      ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
      : null;

  try {
    const result = await controlDb.transaction(async (tx) => {
      let grantedCount = 0;

      for (let index = 0; index < eligibleSessions.length; index += 1) {
        const eligible = eligibleSessions[index];
        const availableCode = availableCodes[index];

        const [grant] = await tx
          .insert(reportAccessGrants)
          .values({
            source: "admin_bulk_grant",
            status: "active",

            productId: product.id,
            accessCodeId: availableCode.id,

            reportTemplateId: product.reportTemplateId,
            reportTemplateVersionId: eligible.reportTemplateVersionId,

            tenantSlug,
            userId: null,
            email: null,

            assessmentProjectId: eligible.session.assessmentProjectId,
            assessmentSessionId: eligible.session.id,
            assessmentAccessLinkId: eligible.session.accessLinkId,

            validFrom: now,
            validUntil: grantValidUntil,

            metadata: {
              manuallyGranted: true,
              bulkGranted: true,
              accessCodeId: availableCode.id,
              productCode: product.code,
              productName: product.name,
              questionnaireVersionId: eligible.questionnaireVersionId,
              grantedByUserId: authSession.user.id,
              grantedAt: now.toISOString(),
            },

            createdAt: now,
            updatedAt: now,
            createdBy: authSession.user.id,
            updatedBy: authSession.user.id,
          })
          .returning({
            id: reportAccessGrants.id,
            reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
          });

        await tx
          .update(reportAccessCodes)
          .set({
            status: "redeemed",

            assessmentProjectId: eligible.session.assessmentProjectId,
            assessmentSessionId: eligible.session.id,
            assessmentAccessLinkId: eligible.session.accessLinkId,

            redeemedByUserId: authSession.user.id,
            redeemedAt: now,

            metadata: {
              ...(typeof availableCode.metadata === "object" &&
              availableCode.metadata !== null &&
              !Array.isArray(availableCode.metadata)
                ? availableCode.metadata
                : {}),
              redeemedFrom: "partner_assessment_project_bulk",
              redeemedByUserId: authSession.user.id,
              redeemedAt: now.toISOString(),
              grantId: grant.id,
              questionnaireVersionId: eligible.questionnaireVersionId,
            },

            updatedAt: now,
            updatedBy: authSession.user.id,
          })
          .where(
            and(
              eq(reportAccessCodes.id, availableCode.id),
              eq(reportAccessCodes.status, "available"),
            ),
          );

        grantedCount += 1;
      }

      return {
        grantedCount,
      };
    });

    revalidatePath(
      `/dashboard/partner-assessment/${tenantSlug}/projects/${projectId}`,
    );

    const skippedCount =
      skippedExistingGrantCount +
      skippedIncompatibleReportCount +
      skippedInvalidQuestionnaireCount;

    return success(
      [
        `Nadano dostęp do raportu dla ${result.grantedCount} sesji.`,
        `Pominięto: ${skippedCount}.`,
        skippedExistingGrantCount > 0
          ? `Istniejący dostęp: ${skippedExistingGrantCount}.`
          : null,
        skippedIncompatibleReportCount > 0
          ? `Raport niepasujący do ukończonego kwestionariusza: ${skippedIncompatibleReportCount}.`
          : null,
        skippedInvalidQuestionnaireCount > 0
          ? `Sesje niejednoznaczne lub bez odpowiedzi: ${skippedInvalidQuestionnaireCount}.`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nie udało się masowo nadać dostępu do raportu.";

    return fail(message);
  }
}



export async function generateProjectReportAccessPoolAction(
    _previousState: PartnerGrantReportAccessState,
    formData: FormData,
): Promise<PartnerGrantReportAccessState> {
    const tenantSlug = normalizeString(formData.get("tenantSlug"));
    const projectId = normalizeString(formData.get("projectId"));
    const productId = normalizeString(formData.get("productId"));

    const quantityRaw = Number(formData.get("quantity") ?? 0);
    const quantity = Number.isFinite(quantityRaw)
        ? Math.min(Math.max(Math.floor(quantityRaw), 1), 500)
        : 0;

    if (!tenantSlug || !projectId || !productId) {
        return fail("Brakuje tenanta, projektu albo produktu dostępu.");
    }

    if (quantity < 1) {
        return fail("Podaj liczbę dostępów większą od zera.");
    }

    const invoiceRequested = booleanValue(formData.get("invoiceRequested"));
    const saveBillingProfile = booleanValue(formData.get("saveBillingProfile"));

    const billingType = nullableString(formData.get("billingType")) ?? "company";

    const companyName = nullableString(formData.get("companyName"));
    const taxId = nullableString(formData.get("taxId"));

    const firstName = nullableString(formData.get("firstName"));
    const lastName = nullableString(formData.get("lastName"));

    const billingEmail = nullableString(formData.get("billingEmail"));
    const phone = nullableString(formData.get("phone"));

    const country = nullableString(formData.get("country")) ?? "PL";
    const postalCode = nullableString(formData.get("postalCode"));
    const city = nullableString(formData.get("city"));
    const street = nullableString(formData.get("street"));
    const buildingNumber = nullableString(formData.get("buildingNumber"));
    const apartmentNumber = nullableString(formData.get("apartmentNumber"));

    const invoiceEmail = nullableString(formData.get("invoiceEmail"));

    const authSession = await requireSession();

    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    const project = await db.query.assessmentProjects.findFirst({
        where: and(
            eq(assessmentProjects.id, projectId),
            isNull(assessmentProjects.deletedAt),
        ),
        columns: {
            id: true,
        },
    });

    if (invoiceRequested) {
        if (billingType === "company" && (!companyName || !taxId)) {
            return fail("Dla faktury firmowej podaj nazwę firmy i NIP.");
        }

        if (billingType === "individual" && (!firstName || !lastName)) {
            return fail("Dla faktury osoby fizycznej podaj imię i nazwisko.");
        }

        if (!billingEmail && !invoiceEmail) {
            return fail("Podaj e-mail do danych rozliczeniowych lub e-mail do faktury.");
        }

        if (!city || !street || !postalCode) {
            return fail("Podaj pełny adres do faktury: kod pocztowy, miasto i ulicę.");
        }
    }

    if (!project) {
        return fail("Nie znaleziono projektu badawczego.");
    }

    const product = await controlDb.query.reportAccessProducts.findFirst({
        where: and(
            eq(reportAccessProducts.id, productId),
            eq(reportAccessProducts.status, "active"),
            isNull(reportAccessProducts.deletedAt),
        ),
    });

    if (!product) {
        return fail("Nie znaleziono aktywnego produktu dostępu.");
    }

    const now = new Date();

    const unitNet = moneyNumber(product.priceNet);
    const unitGross = moneyNumber(product.priceGross);
    const unitVat = Math.max(0, Number((unitGross - unitNet).toFixed(2)));

    const totalNet = multiplyMoney(unitNet, quantity);
    const totalVat = multiplyMoney(unitVat, quantity);
    const totalGross = multiplyMoney(unitGross, quantity);

    const validUntil =
        typeof product.validityDays === "number" && product.validityDays > 0
            ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
            : null;

    const billingSnapshot = buildBillingSnapshot({
        invoiceRequested,
        billingType,
        companyName,
        taxId,
        firstName,
        lastName,
        email: billingEmail,
        phone,
        country,
        postalCode,
        city,
        street,
        buildingNumber,
        apartmentNumber,
        invoiceEmail,
    });


    const orderResult = await controlDb.transaction(async (tx) => {

        let billingProfileId: string | null = null;

        if (invoiceRequested && saveBillingProfile) {
            const [profile] = await tx
                .insert(billingProfiles)
                .values({
                    ownerType: "tenant",

                    tenantSlug,
                    tenantId: ctx.tenantId,
                    userId: authSession.user.id,

                    type: billingType,

                    companyName,
                    taxId,

                    firstName,
                    lastName,

                    email: billingEmail,
                    phone,

                    country,
                    postalCode,
                    city,
                    street,
                    buildingNumber,
                    apartmentNumber,

                    invoiceEmail: invoiceEmail ?? billingEmail,

                    createdAt: now,
                    updatedAt: now,
                    createdBy: authSession.user.id,
                    updatedBy: authSession.user.id,
                })
                .returning({
                    id: billingProfiles.id,
                });

            billingProfileId = profile.id;
        }

        const [order] = await tx
            .insert(reportAccessOrders)
            .values({
                buyerType: "tenant",

                tenantSlug,
                tenantId: ctx.tenantId,
                buyerUserId: authSession.user.id,

                status: "paid",
                paymentProvider: "placeholder",
                paymentProviderOrderId: `placeholder:${crypto.randomUUID()}`,

                currency: product.currency,

                totalNet: moneyString(totalNet),
                totalVat: moneyString(totalVat),
                totalGross: moneyString(totalGross),

                invoiceRequested,
                billingProfileId,
                billingSnapshot,

                metadata: {
                    source: "partner_assessment_project_pool",
                    projectId,
                    productId: product.id,
                    quantity,
                    placeholderPayment: true,
                },

                paidAt: now,

                createdAt: now,
                updatedAt: now,
                createdBy: authSession.user.id,
                updatedBy: authSession.user.id,
            })
            .returning({
                id: reportAccessOrders.id,
            });

        await tx.insert(reportAccessOrderItems).values({
            orderId: order.id,
            productId: product.id,

            quantity,

            unitNet: moneyString(unitNet),
            unitVat: moneyString(unitVat),
            unitGross: moneyString(unitGross),

            totalNet: moneyString(totalNet),
            totalVat: moneyString(totalVat),
            totalGross: moneyString(totalGross),

            createdAt: now,
            updatedAt: now,
        });

        const codeValues = [];

        for (let index = 0; index < quantity; index += 1) {
            const accessCode = await createUniqueAccessCode();

            codeValues.push({
                tenantSlug,
                tenantId: ctx.tenantId,

                productId: product.id,
                orderId: order.id,

                codeHash: accessCode.codeHash,
                codePreview: accessCode.codePreview,

                status: "available",

                assessmentProjectId: projectId,

                validFrom: now,
                validUntil,

                metadata: {
                    generatedFrom: "partner_assessment_project_pool_order",
                    generatedByUserId: authSession.user.id,
                    projectId,
                    orderId: order.id,
                    productCode: product.code,
                    productName: product.name,
                },

                createdAt: now,
                updatedAt: now,
                createdBy: authSession.user.id,
                updatedBy: authSession.user.id,
            });
        }

        if (codeValues.length > 0) {
            await tx.insert(reportAccessCodes).values(codeValues);
        }

        return {
            orderId: order.id,
        };
    });

    revalidatePath(
        `/dashboard/partner-assessment/${tenantSlug}/projects/${projectId}`,
    );

    return success(
        `Utworzono zamówienie placeholder i wygenerowano ${quantity} dostępów do puli projektu. ID zamówienia: ${orderResult.orderId}`,
    );
}


export async function grantCompositeReportAccessToRespondentAction(
  _previousState: PartnerGrantReportAccessState,
  formData: FormData,
): Promise<PartnerGrantReportAccessState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const assessmentProjectId = String(formData.get("assessmentProjectId") ?? "");
  const respondentId = String(formData.get("respondentId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const reportTemplateVersionId = String(
    formData.get("reportTemplateVersionId") ?? "",
  );

  if (
    !tenantSlug ||
    !assessmentProjectId ||
    !respondentId ||
    !productId ||
    !reportTemplateVersionId
  ) {
    return {
      status: "error",
      message: "Brakuje danych do nadania raportu złożonego.",
    };
  }

  try {
    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "report:generate");

    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      return {
        status: "error",
        message: "Nie znaleziono aktywnego produktu raportowego.",
      };
    }

    const reportVersion = await controlDb.query.reportTemplateVersions.findFirst({
      where: and(
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
        eq(reportTemplateVersions.status, "active"),
        isNull(reportTemplateVersions.deletedAt),
      ),
    });

    if (!reportVersion) {
      return {
        status: "error",
        message: "Nie znaleziono aktywnej wersji raportu złożonego.",
      };
    }

    const compositeData = await getPersonalCompositeReport({
      tenantSlug,
      assessmentProjectId,
      respondentId,
      reportTemplateVersionId,
      previewMode: true,
      sourceSelection: {
        mode: "same_project",
        assessmentProjectId,
      },
    });

    if (!compositeData || !compositeData.eligibility.canRender) {
      return {
        status: "error",
        message:
          "Nie można nadać raportu złożonego, ponieważ brakuje wymaganych źródeł w tym projekcie.",
      };
    }

    const frozenSelection = compositeData.payload?.composite?.selection?.frozen;

    if (!frozenSelection) {
      return {
        status: "error",
        message: "Nie udało się zamrozić źródeł raportu złożonego.",
      };
    }

    const existingGrant = await controlDb.query.reportAccessGrants.findFirst({
      where: and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.subjectType, "respondent"),
        eq(reportAccessGrants.subjectId, respondentId),
        eq(reportAccessGrants.assessmentProjectId, assessmentProjectId),
        eq(reportAccessGrants.reportTemplateVersionId, reportTemplateVersionId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    });

    if (existingGrant) {
      return {
        status: "success",
        message: "Ten raport złożony został już nadany respondentowi.",
      };
    }

    const accessCode = await controlDb.query.reportAccessCodes.findFirst({
      where: and(
        eq(reportAccessCodes.tenantSlug, tenantSlug),
        eq(reportAccessCodes.productId, productId),
        eq(reportAccessCodes.status, "available"),
        or(
          isNull(reportAccessCodes.assessmentProjectId),
          eq(reportAccessCodes.assessmentProjectId, assessmentProjectId),
        ),
        isNull(reportAccessCodes.deletedAt),
      ),
      orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    });

    if (!accessCode) {
      return {
        status: "error",
        message: "Brak wolnych dostępów w puli dla tego raportu.",
      };
    }

    const now = new Date();

    const validUntil =
      typeof product.validityDays === "number" && product.validityDays > 0
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

    await controlDb.transaction(async (tx) => {
      const [grant] = await tx
        .insert(reportAccessGrants)
        .values({
          source: "admin_grant",
          status: "active",

          productId: product.id,
          accessCodeId: accessCode.id,

          reportTemplateId: product.reportTemplateId,
          reportTemplateVersionId,

          tenantSlug,
          userId: null,
          email: null,

          subjectType: "respondent",
          subjectId: respondentId,

          assessmentProjectId,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          validFrom: now,
          validUntil,

          metadata: {
            reportKind: "personal_composite",
            partnerGranted: true,
            assessmentProjectId,
            respondentId,
            compositeSelection: frozenSelection,
            compositeSelectionMode: "same_project",
          },

          createdAt: now,
          updatedAt: now,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning({
          id: reportAccessGrants.id,
        });

      await tx
        .update(reportAccessCodes)
        .set({
          status: "redeemed",
          redeemedAt: now,
          assessmentProjectId,
          updatedAt: now,
          updatedBy: ctx.userId,
          metadata: {
            grantId: grant.id,
            respondentId,
            reportKind: "personal_composite",
          },
        })
        .where(eq(reportAccessCodes.id, accessCode.id));
    });

    revalidatePath(
      `/dashboard/partner-assessment/${tenantSlug}/projects/${assessmentProjectId}`,
    );

    return {
      status: "success",
      message: "Nadano dostęp do raportu złożonego.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się nadać raportu złożonego.",
    };
  }
}

export async function grantPartnerReportAccessAction(
  _previousState: PartnerGrantReportAccessState,
  formData: FormData,
): Promise<PartnerGrantReportAccessState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const assessmentProjectId = String(formData.get("assessmentProjectId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const reportTemplateVersionId = String(
    formData.get("reportTemplateVersionId") ?? "",
  );
  const reportTemplateKind = String(formData.get("reportTemplateKind") ?? "");
  const subjectType = String(formData.get("subjectType") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "");

  if (
    !tenantSlug ||
    !assessmentProjectId ||
    !productId ||
    !reportTemplateVersionId ||
    !reportTemplateKind ||
    !subjectType ||
    !subjectId
  ) {
    return {
      status: "error",
      message: "Brakuje danych do użycia dostępu raportu partnera.",
    };
  }
if (reportTemplateKind === "comparison") {
  return {
    status: "error",
    message:
      "Raport dopasowania wymaga najpierw konfiguracji porównywanych obiektów.",
  };
}
  try {
    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "report:generate");

    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      return {
        status: "error",
        message: "Nie znaleziono aktywnego produktu raportowego.",
      };
    }

    const reportVersion =
      await controlDb.query.reportTemplateVersions.findFirst({
        where: and(
          eq(reportTemplateVersions.id, reportTemplateVersionId),
          eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
          eq(reportTemplateVersions.status, "active"),
          isNull(reportTemplateVersions.deletedAt),
        ),
      });

    if (!reportVersion) {
      return {
        status: "error",
        message: "Nie znaleziono aktywnej wersji raportu partnera.",
      };
    }

    const existingGrant = await controlDb.query.reportAccessGrants.findFirst({
      where: and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.subjectType, subjectType),
        eq(reportAccessGrants.subjectId, subjectId),
        eq(reportAccessGrants.assessmentProjectId, assessmentProjectId),
        eq(reportAccessGrants.reportTemplateVersionId, reportTemplateVersionId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    });

    if (existingGrant) {
      return {
        status: "success",
        message: "Ten raport partnera ma już aktywny dostęp.",
      };
    }

    const accessCode = await controlDb.query.reportAccessCodes.findFirst({
      where: and(
        eq(reportAccessCodes.tenantSlug, tenantSlug),
        eq(reportAccessCodes.productId, productId),
        eq(reportAccessCodes.status, "available"),
        or(
          isNull(reportAccessCodes.assessmentProjectId),
          eq(reportAccessCodes.assessmentProjectId, assessmentProjectId),
        ),
        isNull(reportAccessCodes.deletedAt),
      ),
      orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    });

    if (!accessCode) {
      return {
        status: "error",
        message: "Brak wolnych dostępów w puli dla tego raportu partnera.",
      };
    }

    const now = new Date();

    const validUntil =
      typeof product.validityDays === "number" && product.validityDays > 0
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

    await controlDb.transaction(async (tx) => {
      const [grant] = await tx
        .insert(reportAccessGrants)
        .values({
          source: "admin_grant",
          status: "active",

          productId: product.id,
          accessCodeId: accessCode.id,

          reportTemplateId: product.reportTemplateId,
          reportTemplateVersionId,

          tenantSlug,
          userId: null,
          email: null,

          subjectType,
          subjectId,

          assessmentProjectId,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          validFrom: now,
          validUntil,

          metadata: {
            reportKind: reportTemplateKind,
            partnerGranted: true,
            assessmentProjectId,
            subjectType,
            subjectId,
          },

          createdAt: now,
          updatedAt: now,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning({
          id: reportAccessGrants.id,
        });

      await tx
        .update(reportAccessCodes)
        .set({
          status: "redeemed",
          redeemedAt: now,
          assessmentProjectId,
          updatedAt: now,
          updatedBy: ctx.userId,
          metadata: {
            grantId: grant.id,
            reportKind: reportTemplateKind,
            subjectType,
            subjectId,
          },
        })
        .where(eq(reportAccessCodes.id, accessCode.id));
    });

    revalidatePath(
      `/dashboard/partner-assessment/${tenantSlug}/projects/${assessmentProjectId}`,
    );

    revalidatePath(
      `/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/respondents`,
    );

    return {
      status: "success",
      message: "Aktywowano dostęp do raportu partnera.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się aktywować dostępu do raportu partnera.",
    };
  }
}

export async function grantComparisonReportAccessAction(
  _previousState: PartnerGrantReportAccessState,
  formData: FormData,
): Promise<PartnerGrantReportAccessState> {
  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const assessmentProjectId = normalizeString(formData.get("assessmentProjectId"));
  const productId = normalizeString(formData.get("productId"));
  const reportTemplateVersionId = normalizeString(
    formData.get("reportTemplateVersionId"),
  );

  const leftRespondentId = normalizeString(formData.get("leftRespondentId"));
  const rightRespondentId = normalizeString(formData.get("rightRespondentId"));

  const leftLabel =
    normalizeString(formData.get("leftLabel")) ?? "Osoba A";
  const rightLabel =
    normalizeString(formData.get("rightLabel")) ?? "Osoba B";

  if (
    !tenantSlug ||
    !assessmentProjectId ||
    !productId ||
    !reportTemplateVersionId ||
    !leftRespondentId ||
    !rightRespondentId
  ) {
    return fail("Brakuje danych do utworzenia raportu porównawczego.");
  }

  if (leftRespondentId === rightRespondentId) {
    return fail("Nie można porównać respondenta z samym sobą.");
  }

  try {
    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "report:generate");

    const db = await getTenantDb(ctx);

    const project = await db.query.assessmentProjects.findFirst({
      where: and(
        eq(assessmentProjects.id, assessmentProjectId),
        isNull(assessmentProjects.deletedAt),
      ),
      columns: {
        id: true,
        clientOrganizationId: true,
        name: true,
      },
    });

    if (!project) {
      return fail("Nie znaleziono projektu badawczego.");
    }

    const selectedRespondents = await db
      .select({
        id: respondents.id,
        email: respondentIdentities.email,
      })
      .from(respondents)
      .innerJoin(
        respondentIdentities,
        eq(respondentIdentities.respondentId, respondents.id),
      )
      .where(
        and(
          inArray(respondents.id, [leftRespondentId, rightRespondentId]),
          isNull(respondents.deletedAt),
          isNull(respondentIdentities.deletedAt),
        ),
      );

    const selectedRespondentIds = new Set(
      selectedRespondents.map((respondent) => respondent.id),
    );

    if (
      !selectedRespondentIds.has(leftRespondentId) ||
      !selectedRespondentIds.has(rightRespondentId)
    ) {
      return fail("Nie znaleziono jednego z porównywanych respondentów.");
    }

    const completedSessionRows = await db
      .select({
        respondentId: assessmentSessions.respondentId,
        sessionId: assessmentSessions.id,
      })
      .from(assessmentSessions)
      .where(
        and(
          eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
          inArray(assessmentSessions.respondentId, [
            leftRespondentId,
            rightRespondentId,
          ]),
          eq(assessmentSessions.status, "completed"),
          isNull(assessmentSessions.deletedAt),
        ),
      );

    const respondentsWithCompletedSessions = new Set(
      completedSessionRows.map((row) => row.respondentId),
    );

    if (
      !respondentsWithCompletedSessions.has(leftRespondentId) ||
      !respondentsWithCompletedSessions.has(rightRespondentId)
    ) {
      return fail(
        "Obaj respondenci muszą mieć ukończone sesje w tym projekcie.",
      );
    }

    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      return fail("Nie znaleziono aktywnego produktu raportu porównawczego.");
    }

    const reportVersion =
      await controlDb.query.reportTemplateVersions.findFirst({
        where: and(
          eq(reportTemplateVersions.id, reportTemplateVersionId),
          eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
          eq(reportTemplateVersions.status, "active"),
          isNull(reportTemplateVersions.deletedAt),
        ),
      });

    if (!reportVersion) {
      return fail("Nie znaleziono aktywnej wersji raportu porównawczego.");
    }

    const accessCode = await controlDb.query.reportAccessCodes.findFirst({
      where: and(
        eq(reportAccessCodes.tenantSlug, tenantSlug),
        eq(reportAccessCodes.productId, productId),
        eq(reportAccessCodes.status, "available"),
        or(
          isNull(reportAccessCodes.assessmentProjectId),
          eq(reportAccessCodes.assessmentProjectId, assessmentProjectId),
        ),
        isNull(reportAccessCodes.assessmentSessionId),
        isNull(reportAccessCodes.assessmentAccessLinkId),
        isNull(reportAccessCodes.assignedToEmail),
        isNull(reportAccessCodes.assignedToUserId),
        isNull(reportAccessCodes.deletedAt),
      ),
      orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    });

    if (!accessCode) {
      return fail("Brak wolnych dostępów w puli dla raportu porównawczego.");
    }

    const now = new Date();

    const validUntil =
      typeof product.validityDays === "number" && product.validityDays > 0
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

    const comparisonDefinition = {
      mode: "user_vs_user",
      groups: [
        {
          key: "left",
          label: leftLabel,
          subjectType: "respondent",
          subjectId: leftRespondentId,
        },
        {
          key: "right",
          label: rightLabel,
          subjectType: "respondent",
          subjectId: rightRespondentId,
        },
      ],
    };

    const result = await controlDb.transaction(async (tx) => {
      const [grant] = await tx
        .insert(reportAccessGrants)
        .values({
          source: "admin_grant",
          status: "active",

          productId: product.id,
          accessCodeId: accessCode.id,

          reportTemplateId: product.reportTemplateId,
          reportTemplateVersionId,

          tenantSlug,
          userId: null,
          email: null,

          subjectType: "comparison",
          subjectId: assessmentProjectId,

          assessmentProjectId,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          validFrom: now,
          validUntil,

          metadata: {
            reportKind: "comparison",
            partnerGranted: true,
            assessmentProjectId,
            comparisonDefinition,
          },

          createdAt: now,
          updatedAt: now,
          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        })
        .returning({
          id: reportAccessGrants.id,
        });

      await tx
        .update(reportAccessCodes)
        .set({
          status: "redeemed",
          redeemedAt: now,
          assessmentProjectId,
          updatedAt: now,
          updatedBy: ctx.userId,
          metadata: {
            grantId: grant.id,
            reportKind: "comparison",
            comparisonDefinition,
          },
        })
        .where(eq(reportAccessCodes.id, accessCode.id));

      return {
        grantId: grant.id,
      };
    });

    revalidatePath(
      `/dashboard/partner-assessment/${tenantSlug}/projects/${assessmentProjectId}`,
    );

    revalidatePath(
      `/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/respondents`,
    );

    redirect(
      `/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/partner-reports/${result.grantId}`,
    );
  } catch (error) {
    throw error;
  }
}