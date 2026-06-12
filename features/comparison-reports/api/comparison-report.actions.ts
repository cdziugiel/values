// features/comparison-reports/api/comparison-report.actions.ts
"use server";

import { and, asc, desc, eq, isNull, or } from "drizzle-orm";

import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessProducts,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import { buildComparisonDeltaRows } from "../lib/comparison-deltas";
import { resolveComparisonToken } from "../lib/resolve-comparison-token";
import { resolveMySessionComparisonScores } from "../lib/resolve-my-session-comparison-scores";
import { getPeerComparisonReportData } from "./comparison-report.queries";
import { buildPeerComparisonReportData } from "../lib/build-comparison-report-data";
import {
  createPeerComparisonReportInputSchema,
  createProjectSubjectComparisonReportInputSchema,
  ProjectComparisonSubjectInput,
} from "../forms/comparison-report.schema";
import { createProjectSessionComparisonReportInputSchema } from "../forms/comparison-report.schema";



import {
  reportTemplates,
} from "@/drizzle/schema";

import {
  assessmentResponses,
  assessmentSessions,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";


function getSubjectLabelFallback(subject: ProjectComparisonSubjectInput) {
  switch (subject.subjectType) {
    case "organization":
      return "Organizacja";
    case "team":
      return "Zespół";
    case "respondent":
      return "Respondent";
    default:
      return "Obiekt";
  }
}

async function resolveProjectComparisonSubjectSessions({
  db,
  assessmentProjectId,
  subject,
}: {
  db: any;
  assessmentProjectId: string;
  subject: ProjectComparisonSubjectInput;
}) {
  const rows = await db
    .select({
      assessmentSessionId: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,
      completedAt: assessmentSessions.completedAt,
      questionnaireVersionId: assessmentResponses.questionnaireVersionId,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentResponses,
      eq(assessmentResponses.assessmentSessionId, assessmentSessions.id),
    )
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        eq(assessmentSessions.status, "completed"),
        eq(
          assessmentResponses.questionnaireVersionId,
          subject.questionnaireVersionId,
        ),

        subject.subjectType === "respondent"
          ? eq(assessmentSessions.respondentId, subject.subjectId)
          : undefined,

        subject.subjectType === "team"
          ? eq(respondents.clientUnitId, subject.subjectId)
          : undefined,

        subject.subjectType === "organization"
          ? eq(respondents.clientOrganizationId, subject.subjectId)
          : undefined,

        isNull(assessmentSessions.deletedAt),
        isNull(assessmentResponses.deletedAt),
        isNull(respondents.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt));

  /**
   * Jedna sesja ma wiele odpowiedzi, więc rows zawiera wiele rekordów
   * dla tej samej sesji. Najpierw grupujemy po:
   *
   * respondentId + questionnaireVersionId + assessmentSessionId
   */
  const sessionMap = new Map<
    string,
    {
      assessmentSessionId: string;
      respondentId: string;
      completedAt: Date | string | null;
      questionnaireVersionId: string;
    }
  >();

  for (const row of rows) {
    const key = [
      row.respondentId,
      row.questionnaireVersionId,
      row.assessmentSessionId,
    ].join(":");

    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        assessmentSessionId: row.assessmentSessionId,
        respondentId: row.respondentId,
        completedAt: row.completedAt,
        questionnaireVersionId: row.questionnaireVersionId,
      });
    }
  }

  /**
   * Potem bierzemy ostatnią ukończoną sesję dla:
   *
   * respondentId + questionnaireVersionId
   *
   * Dzięki temu C D / pracownik5, który ma kilka sesji, liczy się raz.
   */
  const latestByRespondent = new Map<
    string,
    {
      assessmentSessionId: string;
      respondentId: string;
      completedAt: Date | string | null;
      questionnaireVersionId: string;
    }
  >();

  for (const row of sessionMap.values()) {
    const key = `${row.respondentId}:${row.questionnaireVersionId}`;
    const existing = latestByRespondent.get(key);

    if (!existing) {
      latestByRespondent.set(key, row);
      continue;
    }

    const existingTime = existing.completedAt
      ? new Date(existing.completedAt).getTime()
      : 0;

    const rowTime = row.completedAt
      ? new Date(row.completedAt).getTime()
      : 0;

    if (rowTime > existingTime) {
      latestByRespondent.set(key, row);
    }
  }

  return Array.from(latestByRespondent.values()).map((row) => ({
    assessmentSessionId: row.assessmentSessionId,
    respondentId: row.respondentId,
    questionnaireVersionId: row.questionnaireVersionId,
  }));
}

function buildProjectSubjectComparisonDefinition({
  left,
  right,
  leftSessions,
  rightSessions,
}: {
  left: ProjectComparisonSubjectInput;
  right: ProjectComparisonSubjectInput;
  leftSessions: Array<{
    assessmentSessionId: string;
    respondentId: string;
    questionnaireVersionId: string;
  }>;
  rightSessions: Array<{
    assessmentSessionId: string;
    respondentId: string;
    questionnaireVersionId: string;
  }>;
}) {
  return {
    mode: "project_subjects",
    questionnaireVersionId: left.questionnaireVersionId,
    groups: [
      {
        key: "left",
        label: left.label || getSubjectLabelFallback(left),
        subjectType: left.subjectType,
        subjectId: left.subjectId,
        questionnaireVersionId: left.questionnaireVersionId,
        assessmentSessionId:
          left.subjectType === "respondent"
            ? leftSessions[0]?.assessmentSessionId ?? null
            : null,
        assessmentSessionIds: leftSessions.map(
          (session) => session.assessmentSessionId,
        ),
        respondentIds: leftSessions.map((session) => session.respondentId),
        n: leftSessions.length,
      },
      {
        key: "right",
        label: right.label || getSubjectLabelFallback(right),
        subjectType: right.subjectType,
        subjectId: right.subjectId,
        questionnaireVersionId: right.questionnaireVersionId,
        assessmentSessionId:
          right.subjectType === "respondent"
            ? rightSessions[0]?.assessmentSessionId ?? null
            : null,
        assessmentSessionIds: rightSessions.map(
          (session) => session.assessmentSessionId,
        ),
        respondentIds: rightSessions.map((session) => session.respondentId),
        n: rightSessions.length,
      },
    ],
  };
}

export async function createProjectSubjectComparisonReportAction(
  input: unknown,
) {
  try {
    const session = await requireSession();

    if (!session.user?.id) {
      throw new Error("Musisz być zalogowany, aby wygenerować raport.");
    }

    const parsed =
      createProjectSubjectComparisonReportInputSchema.safeParse(input);

    if (!parsed.success) {
      console.error("CREATE PROJECT SUBJECT COMPARISON INPUT ERROR", {
        input,
        issues: parsed.error.flatten(),
      });

      throw new Error("Nieprawidłowe dane raportu porównawczego.");
    }

    const {
      tenantSlug,
      assessmentProjectId,
      left,
      right,
      productId,
      reportTemplateVersionId,
    } = parsed.data;

    if (left.subjectType === right.subjectType && left.subjectId === right.subjectId) {
      throw new Error("Wybierz dwa różne obiekty do porównania.");
    }

    if (left.questionnaireVersionId !== right.questionnaireVersionId) {
      throw new Error(
        "Porównywane obiekty muszą dotyczyć tej samej wersji kwestionariusza.",
      );
    }

    const ctx = await requireTenantContext({tenantSlug});
    const db = await getTenantDb(ctx);

    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      throw new Error("Nie znaleziono aktywnego produktu raportowego.");
    }

    const reportTemplate = await controlDb.query.reportTemplates.findFirst({
      where: and(
        eq(reportTemplates.id, product.reportTemplateId),
        eq(reportTemplates.kind, "comparison"),
        eq(reportTemplates.status, "active"),
        isNull(reportTemplates.deletedAt),
      ),
    });

    if (!reportTemplate) {
      throw new Error("Produkt nie jest powiązany z aktywnym raportem porównawczym.");
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
      throw new Error("Nie znaleziono aktywnej wersji raportu porównawczego.");
    }

    const [leftSessions, rightSessions] = await Promise.all([
      resolveProjectComparisonSubjectSessions({
        db,
        assessmentProjectId,
        subject: left,
      }),
      resolveProjectComparisonSubjectSessions({
        db,
        assessmentProjectId,
        subject: right,
      }),
    ]);

    if (!leftSessions.length) {
      throw new Error(
        `Obiekt „${left.label}” nie ma ukończonych wyników dla tej wersji kwestionariusza.`,
      );
    }

    if (!rightSessions.length) {
      throw new Error(
        `Obiekt „${right.label}” nie ma ukończonych wyników dla tej wersji kwestionariusza.`,
      );
    }

    const comparisonDefinition = buildProjectSubjectComparisonDefinition({
      left,
      right,
      leftSessions,
      rightSessions,
    });

    const now = new Date();

    const [grant] = await controlDb
      .insert(reportAccessGrants)
      .values({
        tenantSlug,
        productId: product.id,
        reportTemplateId: product.reportTemplateId,
        reportTemplateVersionId: reportVersion.id,

        source: "placeholder_payment",
        status: "active",

        subjectType: "comparison",
        subjectId: left.subjectId,

        assessmentProjectId,
        assessmentSessionId: null,
        assessmentAccessLinkId: null,

        validFrom: now,
        validUntil: product.validityDays
          ? new Date(
              now.getTime() +
                Number(product.validityDays) * 24 * 60 * 60 * 1000,
            )
          : null,

        metadata: {
          reportKind: "comparison",
          mode: "project_subjects",
          generatedFrom: "tenant_project_comparison_configurator",
          generatedAt: now.toISOString(),
          comparisonDefinition,
        },

        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({
        id: reportAccessGrants.id,
      });

    if (!grant) {
      throw new Error("Nie udało się zapisać dostępu do raportu.");
    }

    return {
      ok: true as const,
      grantId: grant.id,
      reportHref: `/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/partner-reports/${grant.id}`,
      error: null,
    };
  } catch (error) {
    return {
      ok: false as const,
      grantId: null,
      reportHref: null,
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować raportu porównawczego.",
    };
  }
}

export async function compareMyResultWithTokenAction(input: unknown) {
  try {
    const data = await getPeerComparisonReportData(input);

    return {
      ok: true as const,
      data,
      error: null,
    };
  } catch (error) {
    return {
      ok: false as const,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się porównać wyników.",
    };
  }
}


function getRecordMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isUnusedComparisonGrant(grant: {
  metadata: unknown;
  validFrom: Date | string | null;
  validUntil: Date | string | null;
  status: string;
}) {
  if (grant.status !== "active") return false;

  const now = new Date();

  const validFrom = grant.validFrom ? new Date(grant.validFrom) : null;
  const validUntil = grant.validUntil ? new Date(grant.validUntil) : null;

  if (validFrom && validFrom > now) return false;
  if (validUntil && validUntil < now) return false;

  const metadata = getRecordMetadata(grant.metadata);

  if (metadata.creditStatus === "used") return false;
  if (metadata.comparisonDefinition) return false;

  return true;
}

export async function createMyComparisonReportWithTokenAction(input: unknown) {
  
  try {
    const session = await requireSession();

    if (!session.user?.id || !session.user?.email) {
      throw new Error("Musisz być zalogowany, aby wygenerować raport.");
    }

    const actorUserId = session.user.id;
    const actorEmail = session.user.email.toLowerCase();

    const parsed = createPeerComparisonReportInputSchema.safeParse(input);

    if (!parsed.success) {
      console.error("CREATE COMPARISON REPORT INPUT ERROR", {
        input,
        issues: parsed.error.flatten(),
      });

      throw new Error("Nieprawidłowe dane raportu porównawczego.");
    }

    const runtime = await getMyAssessmentRuntime({
      userId: actorUserId,
      tenantSlug: parsed.data.tenantSlug ?? null,
    });

    if (!runtime) {
      throw new Error("Nie udało się odnaleźć środowiska badania.");
    }

    const tenantSlug = runtime.tenantSlug;

    const assessmentProjectIdFromInput =
      "assessmentProjectId" in parsed.data
        ? parsed.data.assessmentProjectId ?? null
        : null;

    const {
      db,
      controlDb: runtimeControlDb,
      ctx,
    } = runtime;

    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, parsed.data.productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      throw new Error("Nie znaleziono aktywnego produktu raportowego.");
    }

    const reportVersion =
      await controlDb.query.reportTemplateVersions.findFirst({
        where: and(
          eq(reportTemplateVersions.id, parsed.data.reportTemplateVersionId),
          eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
          eq(reportTemplateVersions.status, "active"),
          isNull(reportTemplateVersions.deletedAt),
        ),
      });

    if (!reportVersion) {
      throw new Error("Nie znaleziono aktywnej wersji raportu porównawczego.");
    }

    const left = await resolveMySessionComparisonScores({
      db,
      controlDb: runtimeControlDb,
      assessmentSessionId: parsed.data.ownSessionId,
      questionnaireVersionId: parsed.data.ownQuestionnaireVersionId,
    });

    if (!left.visibility.canShow) {
      throw new Error("Nie można użyć wybranego wyniku do raportu.");
    }

    if (
      assessmentProjectIdFromInput &&
      left.assessmentProjectId !== assessmentProjectIdFromInput
    ) {
      throw new Error("Wybrany wynik nie należy do tego projektu badawczego.");
    }

    const assessmentProjectId = left.assessmentProjectId ?? null;

    if (!assessmentProjectId) {
      throw new Error("Nie udało się ustalić projektu badania dla raportu.");
    }

    /**
     * Najpierw sprawdzamy, czy użytkownik ma niewykorzystany zakupiony dostęp.
     * Robimy to PRZED resolveComparisonToken(), żeby nie zużyć tokenu,
     * jeśli użytkownik nie ma kredytu na raport.
     */
    const ownerCondition = or(
      eq(reportAccessGrants.userId, actorUserId),
      eq(reportAccessGrants.email, actorEmail),
    );

    const candidateGrants = await controlDb
      .select({
        id: reportAccessGrants.id,
        status: reportAccessGrants.status,
        tenantSlug: reportAccessGrants.tenantSlug,
        productId: reportAccessGrants.productId,
        reportTemplateId: reportAccessGrants.reportTemplateId,
        reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
        userId: reportAccessGrants.userId,
        email: reportAccessGrants.email,
        validFrom: reportAccessGrants.validFrom,
        validUntil: reportAccessGrants.validUntil,
        metadata: reportAccessGrants.metadata,
        createdAt: reportAccessGrants.createdAt,
      })
      .from(reportAccessGrants)
      .where(
        and(
          eq(reportAccessGrants.tenantSlug, tenantSlug),
          eq(reportAccessGrants.productId, product.id),
          eq(reportAccessGrants.reportTemplateId, product.reportTemplateId),
          eq(
            reportAccessGrants.reportTemplateVersionId,
            parsed.data.reportTemplateVersionId,
          ),
          eq(reportAccessGrants.status, "active"),
          isNull(reportAccessGrants.deletedAt),
          ownerCondition,
        ),
      )
      .orderBy(asc(reportAccessGrants.createdAt));

    const accessGrant = candidateGrants.find(isUnusedComparisonGrant);

    if (!accessGrant) {
      return {
        ok: false as const,
        reportHref: null,
        grantId: null,
        error:
          "Brak niewykorzystanego dostępu do raportu porównawczego. Kup kolejny raport, aby wykonać nowe porównanie.",
        reason: "missing_report_access" as const,
        purchaseRequired: true,
      };
    }

    /**
     * Dopiero teraz rozwiązujemy token.
     * Jeśli token jest jednorazowy, zostanie zużyty tylko wtedy,
     * gdy użytkownik faktycznie ma zakupiony kredyt raportowy.
     */
    const right = await resolveComparisonToken({
      db,
      controlDb: runtimeControlDb,
      ctx,
      token: parsed.data.otherToken,
    });

    if (!right.visibility.canShow) {
      throw new Error("Nie można użyć wyniku z tokenu do raportu.");
    }

    if (!right.assessmentSessionId || !right.respondentId) {
      throw new Error("Token nie zawiera pełnych danych wyniku do porównania.");
    }

    if (
      left.questionnaireId &&
      right.questionnaireId &&
      left.questionnaireId !== right.questionnaireId
    ) {
      throw new Error(
        "Nie można porównać wyników z różnych kwestionariuszy.",
      );
    }

    const rows = buildComparisonDeltaRows({
      leftScores: left.scores,
      rightScores: right.scores,
    });

    if (!rows.length) {
      throw new Error(
        "Nie znaleziono wspólnych wymiarów do porównania dla tych wyników.",
      );
    }

    const comparisonData = {
      mode: "peer" as const,
      left,
      right,
      rows,
      metadata: {
        generatedAt: new Date().toISOString(),
        minGroupSize: 1,
        warnings:
          left.questionnaireVersionId &&
          right.questionnaireVersionId &&
          left.questionnaireVersionId !== right.questionnaireVersionId
            ? [
                "Porównujesz wyniki tego samego kwestionariusza, ale z różnych wersji. Interpretuj różnice ostrożnie.",
              ]
            : [],
      },
    };

    if (
      !comparisonData.left.assessmentSessionId ||
      !comparisonData.left.respondentId ||
      !comparisonData.right.assessmentSessionId ||
      !comparisonData.right.respondentId
    ) {
      throw new Error(
        "Nie udało się ustalić pełnych danych porównywanych wyników.",
      );
    }

    const now = new Date();

    const comparisonDefinition = {
      mode: "user_vs_user",
      questionnaireId: comparisonData.left.questionnaireId,
      questionnaireVersionId: comparisonData.left.questionnaireVersionId,
      groups: [
        {
          key: "left",
          label: comparisonData.left.label || "Mój wynik",
          subjectType: "assessment_session",
          subjectId: comparisonData.left.assessmentSessionId,
          respondentId: comparisonData.left.respondentId,
          assessmentSessionId: comparisonData.left.assessmentSessionId,
        },
        {
          key: "right",
          label: comparisonData.right.label || "Udostępniony wynik",
          subjectType: "assessment_session",
          subjectId: comparisonData.right.assessmentSessionId,
          respondentId: comparisonData.right.respondentId,
          assessmentSessionId: comparisonData.right.assessmentSessionId,
        },
      ],
    };

    const result = await controlDb.transaction(async (tx) => {
      const existingMetadata = getRecordMetadata(accessGrant.metadata);

      const [updatedGrant] = await tx
        .update(reportAccessGrants)
        .set({
          subjectType: "comparison",
          subjectId: comparisonData.left.assessmentSessionId,

          assessmentProjectId,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          metadata: {
            ...existingMetadata,
            reportKind: "comparison",
            mode: "comparison",
            creditStatus: "used",
            usedAt: now.toISOString(),
            generatedFrom: "peer_token",
            comparisonDefinition,
          },

          updatedAt: now,
          updatedBy: actorUserId,
        })
        .where(eq(reportAccessGrants.id, accessGrant.id))
        .returning({
          id: reportAccessGrants.id,
        });

      if (!updatedGrant) {
        throw new Error(
          "Nie udało się oznaczyć dostępu do raportu jako wykorzystanego.",
        );
      }

      return {
        grantId: updatedGrant.id,
      };
    });

    await writeTenantAuditLog({
      db,
      ctx,
      action: "peer_comparison_report_generated",
      entityType: "report_access_grant",
      entityId: result.grantId,
      after: {
        assessmentProjectId,
        comparisonDefinition,
      },
    });

    const reportHref = `/my/assessment/comparison-reports/grants/${result.grantId}`;

    console.log("MY_COMPARISON_ACTION_RETURN_OK", {
      grantId: result.grantId,
      reportHref,
      assessmentProjectId,
      tenantSlug,
      audience: "my_user",
    });

    return {
      ok: true as const,
      reportHref,
      grantId: result.grantId,
      error: null,
    };
  } catch (error) {
    return {
      ok: false as const,
      reportHref: null,
      grantId: null,
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować raportu porównawczego.",
    };
  }
}

export async function createProjectSessionComparisonReportAction(input: unknown) {
  try {
    const session = await requireSession();

    if (!session.user?.id || !session.user?.email) {
      throw new Error("Musisz być zalogowany, aby wygenerować raport.");
    }

    const actorUserId = session.user.id;
    const actorEmail = session.user.email.toLowerCase();

    const parsed =
      createProjectSessionComparisonReportInputSchema.safeParse(input);

    if (!parsed.success) {
      console.error("CREATE PROJECT COMPARISON REPORT INPUT ERROR", {
        input,
        issues: parsed.error.flatten(),
      });

      throw new Error("Nieprawidłowe dane raportu porównawczego.");
    }

    const runtime = await getMyAssessmentRuntime({
      userId: actorUserId,
      tenantSlug: parsed.data.tenantSlug,
    });

    if (!runtime) {
      throw new Error("Nie udało się odnaleźć środowiska badania.");
    }

    const { db, controlDb: runtimeControlDb, ctx } = runtime;
    const tenantSlug = runtime.tenantSlug;
    const assessmentProjectId = parsed.data.assessmentProjectId;

    const product = await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(reportAccessProducts.id, parsed.data.productId),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

    if (!product) {
      throw new Error("Nie znaleziono aktywnego produktu raportowego.");
    }

    const reportVersion =
      await controlDb.query.reportTemplateVersions.findFirst({
        where: and(
          eq(reportTemplateVersions.id, parsed.data.reportTemplateVersionId),
          eq(reportTemplateVersions.reportTemplateId, product.reportTemplateId),
          eq(reportTemplateVersions.status, "active"),
          isNull(reportTemplateVersions.deletedAt),
        ),
      });

    if (!reportVersion) {
      throw new Error("Nie znaleziono aktywnej wersji raportu porównawczego.");
    }

    const [left, right] = await Promise.all([
      resolveMySessionComparisonScores({
        db,
        controlDb: runtimeControlDb,
        assessmentSessionId: parsed.data.leftSessionId,
        questionnaireVersionId: parsed.data.leftQuestionnaireVersionId,
      }),
      resolveMySessionComparisonScores({
        db,
        controlDb: runtimeControlDb,
        assessmentSessionId: parsed.data.rightSessionId,
        questionnaireVersionId: parsed.data.rightQuestionnaireVersionId,
      }),
    ]);

    if (!left.visibility.canShow) {
      throw new Error("Nie można użyć pierwszego wyniku do raportu.");
    }

    if (!right.visibility.canShow) {
      throw new Error("Nie można użyć drugiego wyniku do raportu.");
    }

    if (
      left.assessmentProjectId !== assessmentProjectId ||
      right.assessmentProjectId !== assessmentProjectId
    ) {
      throw new Error("Wybrane wyniki nie należą do tego projektu badawczego.");
    }

    if (
      left.questionnaireId &&
      right.questionnaireId &&
      left.questionnaireId !== right.questionnaireId
    ) {
      throw new Error(
        "Nie można porównać wyników z różnych kwestionariuszy.",
      );
    }

    const rows = buildComparisonDeltaRows({
      leftScores: left.scores,
      rightScores: right.scores,
    });

    if (!rows.length) {
      throw new Error(
        "Nie znaleziono wspólnych wymiarów do porównania dla tych wyników.",
      );
    }

    const accessCode = await controlDb.query.reportAccessCodes.findFirst({
      where: and(
        eq(reportAccessCodes.tenantSlug, tenantSlug),
        eq(reportAccessCodes.productId, product.id),
        eq(reportAccessCodes.status, "available"),
        or(
          isNull(reportAccessCodes.assessmentProjectId),
          eq(reportAccessCodes.assessmentProjectId, assessmentProjectId),
        ),
        isNull(reportAccessCodes.assessmentSessionId),
        isNull(reportAccessCodes.assessmentAccessLinkId),
        isNull(reportAccessCodes.deletedAt),
      ),
      orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    });

    if (!accessCode) {
      throw new Error("Brak wolnego dostępu do raportu porównawczego.");
    }

    const now = new Date();

    const validUntil =
      typeof product.validityDays === "number" && product.validityDays > 0
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

    const comparisonDefinition = {
      mode: "project_session_vs_session",
      questionnaireId: left.questionnaireId,
      questionnaireVersionId: left.questionnaireVersionId,
      groups: [
        {
          key: "left",
          label: left.label || "Pierwszy wynik",
          subjectType: "assessment_session",
          subjectId: left.assessmentSessionId,
          respondentId: left.respondentId,
          assessmentSessionId: left.assessmentSessionId,
        },
        {
          key: "right",
          label: right.label || "Drugi wynik",
          subjectType: "assessment_session",
          subjectId: right.assessmentSessionId,
          respondentId: right.respondentId,
          assessmentSessionId: right.assessmentSessionId,
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
          reportTemplateVersionId: parsed.data.reportTemplateVersionId,

          tenantSlug,
          userId: actorUserId,
          email: actorEmail,

          subjectType: "comparison",
          subjectId: assessmentProjectId,

          assessmentProjectId,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          validFrom: now,
          validUntil,

          metadata: {
            reportKind: "comparison",
            generatedFrom: "project_sessions",
            comparisonDefinition,
          },

          createdAt: now,
          updatedAt: now,
          createdBy: actorUserId,
          updatedBy: actorUserId,
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
          assignedToUserId: actorUserId,
          assignedToEmail: actorEmail,
          updatedAt: now,
          updatedBy: actorUserId,
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

    await writeTenantAuditLog({
      db,
      ctx,
      action: "project_comparison_report_generated",
      entityType: "report_access_grant",
      entityId: result.grantId,
      after: {
        assessmentProjectId,
        comparisonDefinition,
      },
    });

    return {
      ok: true as const,
      reportHref: `/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/partner-reports/${result.grantId}`,
      grantId: result.grantId,
      error: null,
    };
  } catch (error) {
    return {
      ok: false as const,
      reportHref: null,
      grantId: null,
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować raportu porównawczego.",
    };
  }
}