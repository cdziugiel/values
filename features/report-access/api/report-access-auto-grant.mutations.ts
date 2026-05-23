import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessProducts,
  reportTemplateVersions,
} from "@/drizzle/schema";

import {
  assessmentProjectQuestionnaires,
  assessmentResponses,
  assessmentSessions,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";

type TenantDb = any;

type AutoGrantReportAccessInput = {
  db: TenantDb;
  tenantSlug: string;
  sessionId: string;
  actorUserId: string | null;
  actorEmail?: string | null;

  /**
   * Wersja kwestionariusza kończona w tym requestcie.
   * Nie jest źródłem prawdy dla auto-grantu, ale służy do dodatkowej walidacji
   * względem zapisanych odpowiedzi.
   */
  questionnaireVersionId?: string | null;

  /**
   * Projektowe przypisanie kwestionariusza kończone w tym requestcie.
   * Służy do sprawdzenia, czy wersja kwestionariusza należy do projektu.
   */
  projectQuestionnaireId?: string | null;
};

type AutoGrantReportAccessResult =
  | {
      ok: true;
      granted: boolean;
      message: string;
      grantId?: string;
      reportTemplateVersionId?: string;
      accessCodeId?: string;
    }
  | {
      ok: false;
      granted: false;
      message: string;
    };

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function isCodeCurrentlyValid(code: {
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  const now = new Date();

  if (code.validFrom && code.validFrom > now) {
    return false;
  }

  if (code.validUntil && code.validUntil < now) {
    return false;
  }

  return true;
}
function uniqueNonEmpty(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

async function resolveCompletedQuestionnaireVersionId({
  db,
  sessionId,
  expectedQuestionnaireVersionId,
}: {
  db: TenantDb;
  sessionId: string;
  expectedQuestionnaireVersionId?: string | null;
}) {
  const responseRows = await db
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

  const responseQuestionnaireVersionIds = uniqueNonEmpty(
    responseRows.map((row: any) => row.questionnaireVersionId),
  );

  if (responseQuestionnaireVersionIds.length === 0) {
    return {
      ok: false as const,
      message:
        "Nie znaleziono odpowiedzi przypisanych do wersji kwestionariusza.",
    };
  }

  if (responseQuestionnaireVersionIds.length > 1) {
    return {
      ok: false as const,
      message:
        "Sesja zawiera odpowiedzi z więcej niż jednej wersji kwestionariusza. Auto-grant raportu został zablokowany.",
      questionnaireVersionIds: responseQuestionnaireVersionIds,
    };
  }

  const completedQuestionnaireVersionId = responseQuestionnaireVersionIds[0];

  if (
    expectedQuestionnaireVersionId &&
    completedQuestionnaireVersionId !== expectedQuestionnaireVersionId
  ) {
    return {
      ok: false as const,
      message:
        "Wersja kwestionariusza z formularza nie zgadza się z wersją zapisaną w odpowiedziach. Auto-grant raportu został zablokowany.",
      questionnaireVersionIds: responseQuestionnaireVersionIds,
    };
  }

  return {
    ok: true as const,
    questionnaireVersionId: completedQuestionnaireVersionId,
  };
}
function buildCodeScopeConditions({
  tenantSlug,
  sessionId,
  assessmentProjectId,
  assessmentAccessLinkId,
  actorUserId,
  actorEmail,
}: {
  tenantSlug: string;
  sessionId: string;
  assessmentProjectId: string;
  assessmentAccessLinkId: string | null;
  actorUserId: string | null;
  actorEmail: string | null;
}) {
  const conditions = [
    eq(reportAccessCodes.assessmentSessionId, sessionId),
    eq(reportAccessCodes.assessmentProjectId, assessmentProjectId),
  ];

  if (assessmentAccessLinkId) {
    conditions.push(eq(reportAccessCodes.assessmentAccessLinkId, assessmentAccessLinkId));
  }

  if (actorUserId) {
    conditions.push(eq(reportAccessCodes.assignedToUserId, actorUserId));
    conditions.push(eq(reportAccessCodes.ownerUserId, actorUserId));
  }

  if (actorEmail) {
    conditions.push(eq(reportAccessCodes.assignedToEmail, actorEmail));
  }

  return and(
    or(isNull(reportAccessCodes.tenantSlug), eq(reportAccessCodes.tenantSlug, tenantSlug)),
    or(...conditions),
    isNull(reportAccessCodes.deletedAt),
  );
}

export async function autoGrantReportAccessForCompletedSession({
  db,
  tenantSlug,
  sessionId,
  actorUserId,
  actorEmail,
  questionnaireVersionId,
  projectQuestionnaireId,
}: AutoGrantReportAccessInput): Promise<AutoGrantReportAccessResult> {
  if (!tenantSlug || !sessionId) {
    return {
      ok: false,
      granted: false,
      message: "Brakuje tenanta albo sesji.",
    };
  }

  const normalizedEmail = normalizeEmail(actorEmail);

  const session = await db.query.assessmentSessions.findFirst({
    where: and(
      eq(assessmentSessions.id, sessionId),
      isNull(assessmentSessions.deletedAt),
    ),
    columns: {
      id: true,
      status: true,
      assessmentProjectId: true,
      accessLinkId: true,
    },
  });

  if (!session) {
    return {
      ok: false,
      granted: false,
      message: "Nie znaleziono sesji badania.",
    };
  }

  if (session.status !== "completed") {
    return {
      ok: false,
      granted: false,
      message: "Sesja nie jest zakończona.",
    };
  }

  const completedQuestionnaire = await resolveCompletedQuestionnaireVersionId({
    db,
    sessionId,
    expectedQuestionnaireVersionId: questionnaireVersionId,
  });

  if (!completedQuestionnaire.ok) {
    return {
      ok: false,
      granted: false,
      message: completedQuestionnaire.message,
    };
  }

  const completedQuestionnaireVersionId =
    completedQuestionnaire.questionnaireVersionId;

  const activeProjectQuestionnaireConditions = [
    eq(
      assessmentProjectQuestionnaires.assessmentProjectId,
      session.assessmentProjectId,
    ),
    eq(
      assessmentProjectQuestionnaires.questionnaireVersionId,
      completedQuestionnaireVersionId,
    ),
    eq(assessmentProjectQuestionnaires.status, "active"),
    isNull(assessmentProjectQuestionnaires.deletedAt),
  ];

  if (projectQuestionnaireId) {
    activeProjectQuestionnaireConditions.push(
      eq(assessmentProjectQuestionnaires.id, projectQuestionnaireId),
    );
  }

  const activeProjectQuestionnaireRows = await db
    .select({
      id: assessmentProjectQuestionnaires.id,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
    })
    .from(assessmentProjectQuestionnaires)
    .where(and(...activeProjectQuestionnaireConditions))
    .limit(1);

  const activeProjectQuestionnaire = activeProjectQuestionnaireRows[0] ?? null;

  if (!activeProjectQuestionnaire) {
    return {
      ok: false,
      granted: false,
      message:
        "Wersja kwestionariusza z odpowiedzi nie jest aktywnym kwestionariuszem tego projektu.",
    };
  }
  
  const codeCandidates = await controlDb
    .select({
      id: reportAccessCodes.id,
      productId: reportAccessCodes.productId,
      status: reportAccessCodes.status,

      tenantSlug: reportAccessCodes.tenantSlug,

      assignedToEmail: reportAccessCodes.assignedToEmail,
      assignedToUserId: reportAccessCodes.assignedToUserId,

      assessmentProjectId: reportAccessCodes.assessmentProjectId,
      assessmentSessionId: reportAccessCodes.assessmentSessionId,
      assessmentAccessLinkId: reportAccessCodes.assessmentAccessLinkId,

      validFrom: reportAccessCodes.validFrom,
      validUntil: reportAccessCodes.validUntil,

      createdAt: reportAccessCodes.createdAt,
    })
    .from(reportAccessCodes)
    .where(
      and(
        inArray(reportAccessCodes.status, ["available", "assigned"]),
        buildCodeScopeConditions({
          tenantSlug,
          sessionId,
          assessmentProjectId: session.assessmentProjectId,
          assessmentAccessLinkId: session.accessLinkId,
          actorUserId,
          actorEmail: normalizedEmail,
        }),
      ),
    )
    .orderBy(desc(reportAccessCodes.createdAt));

  const validCode = codeCandidates.find((code) => {
    if (!isCodeCurrentlyValid(code)) {
      return false;
    }

    if (
      code.assignedToEmail &&
      normalizedEmail &&
      normalizeEmail(code.assignedToEmail) !== normalizedEmail
    ) {
      return false;
    }

    if (
      code.assignedToUserId &&
      actorUserId &&
      code.assignedToUserId !== actorUserId
    ) {
      return false;
    }

    return true;
  });  const validCodeCandidates = codeCandidates.filter((code) => {
    if (!isCodeCurrentlyValid(code)) {
      return false;
    }

    if (
      code.assignedToEmail &&
      normalizedEmail &&
      normalizeEmail(code.assignedToEmail) !== normalizedEmail
    ) {
      return false;
    }

    if (
      code.assignedToUserId &&
      actorUserId &&
      code.assignedToUserId !== actorUserId
    ) {
      return false;
    }

    return true;
  });

  if (validCodeCandidates.length === 0) {
    return {
      ok: true,
      granted: false,
      message: "Nie znaleziono przypisanego aktywnego kodu dostępu.",
    };
  }

  for (const validCode of validCodeCandidates) {
    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, validCode.productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      continue;
    }

    const reportVersion =
      await controlDb.query.reportTemplateVersions.findFirst({
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
      continue;
    }

    const existingGrant = await controlDb.query.reportAccessGrants.findFirst({
      where: and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, sessionId),
        eq(reportAccessGrants.reportTemplateId, product.reportTemplateId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    });

    if (existingGrant) {
      return {
        ok: true,
        granted: false,
        message: "Dostęp do tego typu raportu już istnieje.",
        grantId: existingGrant.id,
        reportTemplateVersionId: existingGrant.reportTemplateVersionId,
        accessCodeId: validCode.id,
      };
    }

    const now = new Date();

    const grantValidUntil =
      typeof product.validityDays === "number" && product.validityDays > 0
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

    const [grant] = await controlDb
      .insert(reportAccessGrants)
      .values({
        source: "invitation",
        status: "active",

        productId: product.id,
        accessCodeId: validCode.id,

        reportTemplateId: product.reportTemplateId,
        reportTemplateVersionId: reportVersion.id,

        tenantSlug,
        userId: actorUserId,
        email: normalizedEmail,

        assessmentProjectId: session.assessmentProjectId,
        assessmentSessionId: sessionId,
        assessmentAccessLinkId: session.accessLinkId,

        validFrom: now,
        validUntil: grantValidUntil,

        metadata: {
          autoGranted: true,
          accessCodeId: validCode.id,
          productCode: product.code,
          productName: product.name,
          questionnaireVersionId: completedQuestionnaireVersionId,
          projectQuestionnaireId: activeProjectQuestionnaire.id,
        },

        createdAt: now,
        updatedAt: now,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning({
        id: reportAccessGrants.id,
        reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
      });

    await controlDb
      .update(reportAccessCodes)
      .set({
        status: "redeemed",
        redeemedByUserId: actorUserId,
        redeemedAt: now,
        assessmentSessionId: sessionId,
        updatedAt: now,
        updatedBy: actorUserId,
      })
      .where(eq(reportAccessCodes.id, validCode.id));

    return {
      ok: true,
      granted: true,
      message: "Automatycznie nadano dostęp do raportu.",
      grantId: grant.id,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      accessCodeId: validCode.id,
    };
  }

  return {
    ok: true,
    granted: false,
    message:
      "Nie znaleziono aktywnego kodu dostępu z raportem pasującym do ukończonego kwestionariusza.",
  };
}