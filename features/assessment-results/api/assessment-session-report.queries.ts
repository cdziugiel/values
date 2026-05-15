import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
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

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";

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
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return fullName || input.email || input.externalCode || "Respondent";
}

export async function resolveAssessmentSessionReportTemplateVersionId({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  if (!tenantSlug || !sessionId) {
    return null;
  }

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "report:read");

  const db = await getTenantDb(ctx);

  const session = await db.query.assessmentSessions.findFirst({
    where: and(
      eq(assessmentSessions.id, sessionId),
      eq(assessmentSessions.status, "completed"),
      isNull(assessmentSessions.deletedAt),
    ),
    columns: {
      id: true,
      assessmentProjectId: true,
    },
  });

  if (!session) {
    return null;
  }

  const snapshot = await db.query.assessmentResultSnapshots.findFirst({
    where: and(
      eq(assessmentResultSnapshots.assessmentSessionId, sessionId),
      isNull(assessmentResultSnapshots.deletedAt),
    ),
    columns: {
      id: true,
    },
  });

  if (!snapshot) {
    return null;
  }

  const projectQuestionnaires = await db
    .select({
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          session.assessmentProjectId,
        ),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    );

  const questionnaireVersionIds = projectQuestionnaires
    .map((row) => row.questionnaireVersionId)
    .filter(Boolean);

  if (questionnaireVersionIds.length === 0) {
    return null;
  }

  const bindingRows = await ctx.controlDb
    .select({
      reportTemplateVersionId:
        questionnaireReportTemplateBindings.reportTemplateVersionId,
      isDefault: questionnaireReportTemplateBindings.isDefault,
      updatedAt: questionnaireReportTemplateBindings.updatedAt,
    })
    .from(questionnaireReportTemplateBindings)
    .innerJoin(
      reportTemplateVersions,
      eq(
        reportTemplateVersions.id,
        questionnaireReportTemplateBindings.reportTemplateVersionId,
      ),
    )
    .where(
      and(
        inArray(
          questionnaireReportTemplateBindings.questionnaireVersionId,
          questionnaireVersionIds,
        ),
        eq(questionnaireReportTemplateBindings.status, "active"),
        eq(reportTemplateVersions.status, "active"),
        isNull(questionnaireReportTemplateBindings.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
      ),
    )
    .orderBy(
      desc(questionnaireReportTemplateBindings.isDefault),
      desc(questionnaireReportTemplateBindings.updatedAt),
    );

  const binding = bindingRows.find((row) => row.isDefault) ?? bindingRows[0];

  if (binding?.reportTemplateVersionId) {
    return binding.reportTemplateVersionId;
  }

  const defaultTemplateVersion =
    await ctx.controlDb.query.reportTemplateVersions.findFirst({
      where: and(
        inArray(
          reportTemplateVersions.questionnaireVersionId,
          questionnaireVersionIds,
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
        inArray(
          reportTemplateVersions.questionnaireVersionId,
          questionnaireVersionIds,
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
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const reportTemplateVersionId =
    await resolveAssessmentSessionReportTemplateVersionId({
      tenantSlug,
      sessionId,
    });

  if (!reportTemplateVersionId) {
    return null;
  }

  return `/t/${tenantSlug}/assessment-sessions/${sessionId}/report/${reportTemplateVersionId}`;
}

export async function getTenantAssessmentSessionReport({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
}): Promise<TenantAssessmentSessionReportData | null> {
  if (!tenantSlug || !sessionId || !reportTemplateVersionId) {
    return null;
  }

  const ctx = await requireTenantContext({ tenantSlug });
  requirePermission(ctx, "report:read");

  const db = await getTenantDb(ctx);

  const rows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionCompletedAt: assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,

      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,

      snapshotPayload: assessmentResultSnapshots.payload,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .innerJoin(respondents, eq(respondents.id, assessmentSessions.respondentId))
    .leftJoin(
      respondentIdentities,
      and(
        eq(respondentIdentities.respondentId, respondents.id),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .innerJoin(
      assessmentResultSnapshots,
      eq(assessmentResultSnapshots.assessmentSessionId, assessmentSessions.id),
    )
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
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
      accessMode: "tenant_partner",
    },
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: "tenantName" in ctx ? String(ctx.tenantName ?? "") : null,
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