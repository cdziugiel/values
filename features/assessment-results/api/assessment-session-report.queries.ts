import { and, desc, eq, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  reportAccessGrants,
  reportTemplateVersions,
} from "@/drizzle/schema";

import {
  assessmentProjectQuestionnaires,
  assessmentProjects,
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

export type TenantAssessmentSessionReportData = {
  tenant: {
    id: string;
    slug: string;
    name: string | null;
  };
  project: {
    id: string;
    name: string;
    description: string | null;
  };
  session: {
    id: string;
    status: string;
    completedAt: Date | null;
  };
  questionnaire: {
    projectQuestionnaireId: string | null;
    questionnaireId: string | null;
    questionnaireVersionId: string | null;
    snapshotId: string;
  };
  respondent: {
    id: string;
    displayName: string;
    email: string | null;
    externalCode: string | null;
  };
  reportTemplateVersionId: string;
  payload: any;
};

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const fullName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    input.email ||
    input.externalCode ||
    "Respondent"
  );
}

function asRecord(value: unknown): Record<string, any> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, any>;
}

function getGrantScope(metadataValue: unknown) {
  const metadata = asRecord(metadataValue);
  const reportScope = asRecord(metadata.reportScope);

  return {
    projectQuestionnaireId:
      typeof metadata.projectQuestionnaireId === "string"
        ? metadata.projectQuestionnaireId
        : typeof reportScope.projectQuestionnaireId === "string"
          ? reportScope.projectQuestionnaireId
          : null,

    questionnaireId:
      typeof metadata.questionnaireId === "string"
        ? metadata.questionnaireId
        : typeof reportScope.questionnaireId === "string"
          ? reportScope.questionnaireId
          : null,

    questionnaireVersionId:
      typeof metadata.questionnaireVersionId === "string"
        ? metadata.questionnaireVersionId
        : typeof reportScope.questionnaireVersionId === "string"
          ? reportScope.questionnaireVersionId
          : null,
  };
}

function isGrantCurrentlyActive(input: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (input.status !== "active") {
    return false;
  }

  const now = new Date();

  if (input.validFrom && input.validFrom > now) {
    return false;
  }

  if (input.validUntil && input.validUntil < now) {
    return false;
  }

  return true;
}

function grantMatchesQuestionnaireScope({
  metadata,
  projectQuestionnaireId,
  questionnaireId,
  questionnaireVersionId,
}: {
  metadata: unknown;
  projectQuestionnaireId: string | null;
  questionnaireId: string | null;
  questionnaireVersionId: string | null;
}) {
  const scope = getGrantScope(metadata);

  /**
   * Najbardziej precyzyjne dopasowanie.
   */
  if (projectQuestionnaireId) {
    return (
      scope.projectQuestionnaireId ===
      projectQuestionnaireId
    );
  }

  /**
   * Fallback dla grantów utworzonych przed dodaniem
   * projectQuestionnaireId.
   */
  if (questionnaireVersionId) {
    return (
      scope.questionnaireVersionId ===
      questionnaireVersionId
    );
  }

  if (questionnaireId) {
    return scope.questionnaireId === questionnaireId;
  }

  return false;
}

async function resolveSnapshotScope({
  db,
  sessionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  db: Awaited<ReturnType<typeof getTenantDb>>;
  sessionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const snapshotRows = await db
    .select({
      snapshotId: assessmentResultSnapshots.id,

      projectQuestionnaireId:
        assessmentResultSnapshots.projectQuestionnaireId,

      questionnaireId:
        assessmentResultSnapshots.questionnaireId,

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

        projectQuestionnaireId
          ? eq(
              assessmentResultSnapshots.projectQuestionnaireId,
              projectQuestionnaireId,
            )
          : undefined,

        questionnaireVersionId
          ? eq(
              assessmentResultSnapshots.questionnaireVersionId,
              questionnaireVersionId,
            )
          : undefined,

        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .limit(2);

  /**
   * Brak snapshotu albo niejednoznaczna sesja bez scope.
   */
  if (snapshotRows.length !== 1) {
    return null;
  }

  const snapshot = snapshotRows[0];

  let resolvedQuestionnaireVersionId =
    snapshot.questionnaireVersionId ?? null;

  /**
   * Legacy fallback: starszy snapshot może nie mieć
   * questionnaireVersionId, ale ma projectQuestionnaireId.
   */
  if (
    !resolvedQuestionnaireVersionId &&
    snapshot.projectQuestionnaireId
  ) {
    const projectQuestionnaire =
      await db.query.assessmentProjectQuestionnaires.findFirst({
        where: and(
          eq(
            assessmentProjectQuestionnaires.id,
            snapshot.projectQuestionnaireId,
          ),
          isNull(
            assessmentProjectQuestionnaires.deletedAt,
          ),
        ),
        columns: {
          questionnaireVersionId: true,
        },
      });

    resolvedQuestionnaireVersionId =
      projectQuestionnaire?.questionnaireVersionId ??
      null;
  }

  if (!resolvedQuestionnaireVersionId) {
    return null;
  }

  return {
    snapshotId: snapshot.snapshotId,

    projectQuestionnaireId:
      snapshot.projectQuestionnaireId ?? null,

    questionnaireId:
      snapshot.questionnaireId ?? null,

    questionnaireVersionId:
      resolvedQuestionnaireVersionId,
  };
}

export async function resolveAssessmentSessionReportTemplateVersionId({
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
  if (!tenantSlug || !sessionId) {
    return null;
  }

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "report:read");

  const db = await getTenantDb(ctx);

  const session =
    await db.query.assessmentSessions.findFirst({
      where: and(
        eq(assessmentSessions.id, sessionId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
      ),
      columns: {
        id: true,
      },
    });

  if (!session) {
    return null;
  }

  const snapshotScope = await resolveSnapshotScope({
    db,
    sessionId,
    projectQuestionnaireId:
      projectQuestionnaireId?.trim() || null,
    questionnaireVersionId:
      questionnaireVersionId?.trim() || null,
  });

  if (!snapshotScope) {
    return null;
  }

  const bindingRows = await ctx.controlDb
    .select({
      reportTemplateVersionId:
        questionnaireReportTemplateBindings
          .reportTemplateVersionId,

      isDefault:
        questionnaireReportTemplateBindings.isDefault,

      updatedAt:
        questionnaireReportTemplateBindings.updatedAt,
    })
    .from(questionnaireReportTemplateBindings)
    .innerJoin(
      reportTemplateVersions,
      eq(
        reportTemplateVersions.id,
        questionnaireReportTemplateBindings
          .reportTemplateVersionId,
      ),
    )
    .where(
      and(
        eq(
          questionnaireReportTemplateBindings
            .questionnaireVersionId,
          snapshotScope.questionnaireVersionId,
        ),
        eq(
          questionnaireReportTemplateBindings.status,
          "active",
        ),
        eq(reportTemplateVersions.status, "active"),
        isNull(
          questionnaireReportTemplateBindings.deletedAt,
        ),
        isNull(reportTemplateVersions.deletedAt),
      ),
    )
    .orderBy(
      desc(
        questionnaireReportTemplateBindings.isDefault,
      ),
      desc(
        questionnaireReportTemplateBindings.updatedAt,
      ),
    );

  const binding =
    bindingRows.find((row) => row.isDefault) ??
    bindingRows[0];

  if (binding?.reportTemplateVersionId) {
    return binding.reportTemplateVersionId;
  }

  const defaultTemplateVersion =
    await ctx.controlDb.query.reportTemplateVersions.findFirst({
      where: and(
        eq(
          reportTemplateVersions.questionnaireVersionId,
          snapshotScope.questionnaireVersionId,
        ),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplateVersions.isDefault, true),
        isNull(reportTemplateVersions.deletedAt),
      ),
      orderBy: desc(reportTemplateVersions.updatedAt),
    });

  if (defaultTemplateVersion) {
    return defaultTemplateVersion.id;
  }

  const anyActiveTemplateVersion =
    await ctx.controlDb.query.reportTemplateVersions.findFirst({
      where: and(
        eq(
          reportTemplateVersions.questionnaireVersionId,
          snapshotScope.questionnaireVersionId,
        ),
        eq(reportTemplateVersions.status, "active"),
        isNull(reportTemplateVersions.deletedAt),
      ),
      orderBy: desc(reportTemplateVersions.updatedAt),
    });

  return anyActiveTemplateVersion?.id ?? null;
}

export async function getAssessmentSessionReportHref({
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
  const reportTemplateVersionId =
    await resolveAssessmentSessionReportTemplateVersionId({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

  if (!reportTemplateVersionId) {
    return null;
  }

  const searchParams = new URLSearchParams();

  if (projectQuestionnaireId) {
    searchParams.set(
      "projectQuestionnaireId",
      projectQuestionnaireId,
    );
  }

  if (questionnaireVersionId) {
    searchParams.set(
      "questionnaireVersionId",
      questionnaireVersionId,
    );
  }

  const query = searchParams.toString();

  return (
    `/t/${tenantSlug}/assessment-sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}` +
    (query ? `?${query}` : "")
  );
}

export async function getTenantAssessmentSessionReport({
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
}): Promise<TenantAssessmentSessionReportData | null> {
  if (
    !tenantSlug ||
    !sessionId ||
    !reportTemplateVersionId
  ) {
    return null;
  }

  const normalizedProjectQuestionnaireId =
    projectQuestionnaireId?.trim() || null;

  const normalizedQuestionnaireVersionId =
    questionnaireVersionId?.trim() || null;

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "report:read");

  const db = await getTenantDb(ctx);

  const rows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionCompletedAt:
        assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription:
        assessmentProjects.description,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,

      respondentEmail: respondentIdentities.email,
      respondentFirstName:
        respondentIdentities.firstName,
      respondentLastName:
        respondentIdentities.lastName,

      snapshotId: assessmentResultSnapshots.id,

      snapshotProjectQuestionnaireId:
        assessmentResultSnapshots.projectQuestionnaireId,

      snapshotQuestionnaireId:
        assessmentResultSnapshots.questionnaireId,

      snapshotQuestionnaireVersionId:
        assessmentResultSnapshots.questionnaireVersionId,

      snapshotPayload:
        assessmentResultSnapshots.payload,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentProjects,
      eq(
        assessmentProjects.id,
        assessmentSessions.assessmentProjectId,
      ),
    )
    .innerJoin(
      respondents,
      eq(
        respondents.id,
        assessmentSessions.respondentId,
      ),
    )
    .leftJoin(
      respondentIdentities,
      and(
        eq(
          respondentIdentities.respondentId,
          respondents.id,
        ),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .innerJoin(
      assessmentResultSnapshots,
      eq(
        assessmentResultSnapshots.assessmentSessionId,
        assessmentSessions.id,
      ),
    )
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        eq(assessmentSessions.status, "completed"),

        normalizedProjectQuestionnaireId
          ? eq(
              assessmentResultSnapshots
                .projectQuestionnaireId,
              normalizedProjectQuestionnaireId,
            )
          : undefined,

        normalizedQuestionnaireVersionId
          ? eq(
              assessmentResultSnapshots
                .questionnaireVersionId,
              normalizedQuestionnaireVersionId,
            )
          : undefined,

        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .limit(2);

  /**
   * Bez scope sesja wielokwestionariuszowa nie może
   * arbitralnie wybrać pierwszego snapshotu.
   */
  if (rows.length !== 1) {
    console.log(
      "TENANT_SESSION_REPORT_SNAPSHOT_AMBIGUOUS",
      {
        tenantSlug,
        sessionId,
        reportTemplateVersionId,
        projectQuestionnaireId:
          normalizedProjectQuestionnaireId,
        questionnaireVersionId:
          normalizedQuestionnaireVersionId,
        matchedRowsCount: rows.length,
      },
    );

    return null;
  }

  const row = rows[0];

  const resolvedQuestionnaireVersionId =
    row.snapshotQuestionnaireVersionId ??
    normalizedQuestionnaireVersionId;

  if (!resolvedQuestionnaireVersionId) {
    return null;
  }

  /**
   * Partner może zobaczyć tylko raport, do którego istnieje
   * aktywny grant dla tego konkretnego kwestionariusza.
   */
  const grantCandidates = await ctx.controlDb
    .select({
      id: reportAccessGrants.id,
      status: reportAccessGrants.status,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      metadata: reportAccessGrants.metadata,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(
          reportAccessGrants.tenantSlug,
          tenantSlug,
        ),
        eq(
          reportAccessGrants.assessmentSessionId,
          sessionId,
        ),
        eq(
          reportAccessGrants.reportTemplateVersionId,
          reportTemplateVersionId,
        ),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    );

  const matchingGrant =
    grantCandidates.find((grant) => {
      if (!isGrantCurrentlyActive(grant)) {
        return false;
      }

      return grantMatchesQuestionnaireScope({
        metadata: grant.metadata,

        projectQuestionnaireId:
          row.snapshotProjectQuestionnaireId ??
          normalizedProjectQuestionnaireId,

        questionnaireId:
          row.snapshotQuestionnaireId ?? null,

        questionnaireVersionId:
          resolvedQuestionnaireVersionId,
      });
    }) ?? null;

  if (!matchingGrant) {
    console.log(
      "TENANT_SESSION_REPORT_SCOPED_GRANT_NOT_FOUND",
      {
        tenantSlug,
        sessionId,
        reportTemplateVersionId,

        projectQuestionnaireId:
          row.snapshotProjectQuestionnaireId ??
          normalizedProjectQuestionnaireId,

        questionnaireId:
          row.snapshotQuestionnaireId ?? null,

        questionnaireVersionId:
          resolvedQuestionnaireVersionId,

        candidateGrantIds:
          grantCandidates.map((grant) => grant.id),
      },
    );

    return null;
  }

  await writeTenantAuditLog({
    db,
    ctx,
    action: "report_viewed",
    entityType: "assessment_session",
    entityId: row.sessionId,
    after: {
      assessmentProjectId: row.projectId,
      reportTemplateVersionId,

      projectQuestionnaireId:
        row.snapshotProjectQuestionnaireId ?? null,

      questionnaireId:
        row.snapshotQuestionnaireId ?? null,

      questionnaireVersionId:
        resolvedQuestionnaireVersionId,

      snapshotId: row.snapshotId,
      reportAccessGrantId: matchingGrant.id,
      accessMode: "tenant_partner",
    },
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name:
        "tenantName" in ctx
          ? String(ctx.tenantName ?? "")
          : null,
    },

    project: {
      id: row.projectId,
      name: row.projectName,
      description: row.projectDescription,
    },

    session: {
      id: row.sessionId,
      status: row.sessionStatus,
      completedAt: row.sessionCompletedAt,
    },

    questionnaire: {
      projectQuestionnaireId:
        row.snapshotProjectQuestionnaireId ?? null,

      questionnaireId:
        row.snapshotQuestionnaireId ?? null,

      questionnaireVersionId:
        resolvedQuestionnaireVersionId,

      snapshotId: row.snapshotId,
    },

    respondent: {
      id: row.respondentId,
      email: row.respondentEmail,
      externalCode: row.respondentExternalCode,

      displayName: getDisplayName({
        firstName: row.respondentFirstName,
        lastName: row.respondentLastName,
        email: row.respondentEmail,
        externalCode: row.respondentExternalCode,
      }),
    },

    reportTemplateVersionId,
    payload: row.snapshotPayload,
  };
}