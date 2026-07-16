import { and, eq, isNull } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";

import {
  assessmentProjects,
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";


import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  return (
    [input.firstName, input.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    input.email ||
    input.externalCode ||
    "Respondent"
  );
}

export async function getSuperAdminBuilderPreviewReport(input: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const user = await requireSuperAdmin();

  const [connection] = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted:
        tenantDatabaseConnections.databaseUrlEncrypted,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .innerJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .where(
      and(
        eq(tenants.slug, input.tenantSlug),
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(
          tenantDatabaseConnections.migrationStatus,
          "success",
        ),
      ),
    )
    .limit(1);

  if (!connection) {
    return null;
  }

  const db = getTenantDbByConnection({
    tenantId: connection.tenantId,
    databaseName: connection.databaseName,
    schemaVersion: Number(connection.schemaVersion ?? 0),
    databaseUrl: decryptSecret(
      connection.databaseUrlEncrypted,
    ),
  });

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

      snapshotId: assessmentResultSnapshots.id,
      snapshotProjectQuestionnaireId:
        assessmentResultSnapshots.projectQuestionnaireId,
      snapshotQuestionnaireId:
        assessmentResultSnapshots.questionnaireId,
      snapshotQuestionnaireVersionId:
        assessmentResultSnapshots.questionnaireVersionId,
      snapshotPayload: assessmentResultSnapshots.payload,
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
      eq(respondents.id, assessmentSessions.respondentId),
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
        eq(assessmentSessions.id, input.sessionId),
        eq(assessmentSessions.status, "completed"),

        input.projectQuestionnaireId
          ? eq(
              assessmentResultSnapshots.projectQuestionnaireId,
              input.projectQuestionnaireId,
            )
          : undefined,

        input.questionnaireVersionId
          ? eq(
              assessmentResultSnapshots.questionnaireVersionId,
              input.questionnaireVersionId,
            )
          : undefined,

        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    )
    .limit(2);

  if (rows.length !== 1) {
    return null;
  }

  const row = rows[0];

  await db.insert(tenantAuditLog).values({
    actorUserId: user.id,
    actorRole: "SUPER_ADMIN",
    action: "report_viewed",
    entityType: "assessment_session",
    entityId: row.sessionId,
    after: {
      reportTemplateVersionId:
        input.reportTemplateVersionId,
      snapshotId: row.snapshotId,
      accessMode: "superadmin_builder_preview",
    },
  });

  return {
    tenant: {
      id: connection.tenantId,
      slug: connection.tenantSlug,
      name: connection.tenantName,
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
        row.snapshotQuestionnaireVersionId ?? null,
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
    reportTemplateVersionId:
      input.reportTemplateVersionId,
    payload: row.snapshotPayload,
  };
}
