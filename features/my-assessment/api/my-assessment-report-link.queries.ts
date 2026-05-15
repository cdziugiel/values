import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  reportTemplateVersions,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";

import {
  assessmentProjectQuestionnaires,
  assessmentSessions,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

async function getTenantDbBySlug(tenantSlug: string) {
  const rows = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      schemaVersion: tenantDatabaseConnections.schemaVersion,
    })
    .from(tenants)
    .innerJoin(
      tenantDatabaseConnections,
      eq(tenantDatabaseConnections.tenantId, tenants.id),
    )
    .where(
      and(
        eq(tenants.slug, tenantSlug),
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(tenantDatabaseConnections.migrationStatus, "success"),
      ),
    )
    .limit(1);

  const connection = rows[0];

  if (!connection) {
    return null;
  }

  const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

  return {
    tenantSlug: connection.tenantSlug,
    db: getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    }),
  };
}

export async function getMyAssessmentReportHref({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  if (!tenantSlug || !sessionId) {
    return null;
  }

  const tenant = await getTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return null;
  }

  const session = await tenant.db.query.assessmentSessions.findFirst({
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

  const projectQuestionnaires = await tenant.db
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

  /**
   * Najpierw szukamy bindingu jawnie przypiętego do wersji kwestionariusza.
   */
  const bindingRows = await controlDb
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
    );

  const defaultBinding =
    bindingRows.find((row) => row.isDefault) ?? bindingRows[0];

  if (defaultBinding?.reportTemplateVersionId) {
    return `/my/assessment/sessions/${sessionId}/report/${defaultBinding.reportTemplateVersionId}?tenant=${tenantSlug}`;
  }

  /**
   * Fallback: jeśli nie ma bindingu, bierzemy aktywny/defaultowy template
   * bezpośrednio po questionnaireVersionId.
   */
  const directTemplate = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      inArray(reportTemplateVersions.questionnaireVersionId, questionnaireVersionIds),
      eq(reportTemplateVersions.status, "active"),
      eq(reportTemplateVersions.isDefault, true),
      isNull(reportTemplateVersions.deletedAt),
    ),
  });

  if (directTemplate) {
    return `/my/assessment/sessions/${sessionId}/report/${directTemplate.id}?tenant=${tenantSlug}`;
  }

  const anyActiveTemplate = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      inArray(reportTemplateVersions.questionnaireVersionId, questionnaireVersionIds),
      eq(reportTemplateVersions.status, "active"),
      isNull(reportTemplateVersions.deletedAt),
    ),
  });

  if (!anyActiveTemplate) {
    return null;
  }

  return `/my/assessment/sessions/${sessionId}/report/${anyActiveTemplate.id}?tenant=${tenantSlug}`;
}