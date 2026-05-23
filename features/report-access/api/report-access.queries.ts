// features/report-access/api/report-access.queries.ts
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  reportAccessGrants,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";

import {
  assessmentProjectQuestionnaires,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

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
    tenantId: connection.tenantId,
    tenantSlug: connection.tenantSlug,
    db: getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    }),
  };
}

export async function resolveCompletedSessionForCurrentUser({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  if (!email) {
    return {
      ok: false as const,
      message: "Konto użytkownika nie ma adresu e-mail.",
    };
  }

  const tenant = await getTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return {
      ok: false as const,
      message: "Nie znaleziono tenanta badania.",
    };
  }

  const rows = await tenant.db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      assessmentAccessLinkId: assessmentSessions.accessLinkId,
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
        eq(assessmentSessions.id, sessionId),
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);

  const session = rows[0];

  if (!session) {
    return {
      ok: false as const,
      message: "Nie znaleziono sesji badania.",
    };
  }

  if (normalizeEmail(session.respondentEmail) !== email) {
    return {
      ok: false as const,
      message: "Ta sesja badania nie należy do zalogowanego użytkownika.",
    };
  }

  if (session.sessionStatus !== "completed") {
    return {
      ok: false as const,
      message: "Raport można odblokować dopiero po zakończeniu badania.",
    };
  }

  return {
    ok: true as const,
    tenant,
    actorUserId: authSession.user.id,
    actorEmail: email,
    session,
  };
}

/**
 * Zwraca wersje kwestionariuszy aktywne w projekcie sesji.
 */
export async function getSessionQuestionnaireVersionIds({
  db,
  assessmentProjectId,
}: {
  db: any;
  assessmentProjectId: string;
}) {
  const rows = await db
    .select({
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(assessmentProjectQuestionnaires.assessmentProjectId, assessmentProjectId),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    );

  return rows.map((row: any) => row.questionnaireVersionId).filter(Boolean);
}

/**
 * Znajduje aktywną wersję raportu dla danej sesji.
 *
 * Logika:
 * 1. Najpierw aktywny binding do wersji kwestionariusza.
 * 2. Potem fallback do aktywnej/defaultowej wersji raportu po questionnaireVersionId.
 *
 * To jest moment zamrożenia: ta wersja trafi później do reportAccessGrant.
 */
export async function resolveCurrentActiveReportTemplateVersionForSession({
  questionnaireVersionIds,
}: {
  questionnaireVersionIds: string[];
}) {
  if (questionnaireVersionIds.length === 0) {
    return null;
  }

  const bindingRows = await controlDb
    .select({
      reportTemplateVersionId:
        questionnaireReportTemplateBindings.reportTemplateVersionId,
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
      reportTemplateVersionStatus: reportTemplateVersions.status,

      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,

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
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        inArray(
          questionnaireReportTemplateBindings.questionnaireVersionId,
          questionnaireVersionIds,
        ),
        eq(questionnaireReportTemplateBindings.status, "active"),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        isNull(questionnaireReportTemplateBindings.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .orderBy(desc(questionnaireReportTemplateBindings.isDefault), desc(questionnaireReportTemplateBindings.updatedAt));

  const bound = bindingRows[0];

  if (bound) {
    return {
      reportTemplateId: bound.reportTemplateId,
      reportTemplateVersionId: bound.reportTemplateVersionId,
      reportTemplateName: bound.reportTemplateName,
      reportTemplateCode: bound.reportTemplateCode,
      reportTemplateVersionName: bound.reportTemplateVersionName,
      reportTemplateVersion: bound.reportTemplateVersion,
    };
  }

  const directRows = await controlDb
    .select({
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
      isDefault: reportTemplateVersions.isDefault,
      updatedAt: reportTemplateVersions.updatedAt,

      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        inArray(reportTemplateVersions.questionnaireVersionId, questionnaireVersionIds),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .orderBy(desc(reportTemplateVersions.isDefault), desc(reportTemplateVersions.updatedAt));

  const direct = directRows[0];

  if (!direct) {
    return null;
  }

  return {
    reportTemplateId: direct.reportTemplateId,
    reportTemplateVersionId: direct.reportTemplateVersionId,
    reportTemplateName: direct.reportTemplateName,
    reportTemplateCode: direct.reportTemplateCode,
    reportTemplateVersionName: direct.reportTemplateVersionName,
    reportTemplateVersion: direct.reportTemplateVersion,
  };
}

export async function getActiveReportAccessGrantForSession({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  userId,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  userId?: string | null;
}) {
  const grants = await controlDb
    .select()
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, sessionId),
        eq(reportAccessGrants.reportTemplateVersionId, reportTemplateVersionId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .limit(10);

  const now = new Date();

  return (
    grants.find((grant) => {
      if (userId && grant.userId && grant.userId !== userId) {
        return false;
      }

      if (grant.validFrom && grant.validFrom > now) {
        return false;
      }

      if (grant.validUntil && grant.validUntil < now) {
        return false;
      }

      return true;
    }) ?? null
  );
}

export async function getReportAccessOfferForCompletedSession({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const resolved = await resolveCompletedSessionForCurrentUser({
    tenantSlug,
    sessionId,
  });

  if (!resolved.ok) {
    return {
      ok: false as const,
      message: resolved.message,
    };
  }

  const questionnaireVersionIds = await getSessionQuestionnaireVersionIds({
    db: resolved.tenant.db,
    assessmentProjectId: resolved.session.assessmentProjectId,
  });

  const reportVersion =
    await resolveCurrentActiveReportTemplateVersionForSession({
      questionnaireVersionIds,
    });

  if (!reportVersion) {
    return {
      ok: false as const,
      message: "Dla tego badania nie ma aktywnego template’u raportu.",
    };
  }

  const existingGrant = await getActiveReportAccessGrantForSession({
    tenantSlug,
    sessionId,
    reportTemplateVersionId: reportVersion.reportTemplateVersionId,
    userId: resolved.actorUserId,
  });

  const product = await controlDb.query.reportAccessProducts.findFirst({
    where: and(
      eq(reportAccessProducts.reportTemplateId, reportVersion.reportTemplateId),
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  });

  return {
    ok: true as const,
    tenantSlug,
    sessionId,
    actorUserId: resolved.actorUserId,
    actorEmail: resolved.actorEmail,
    session: resolved.session,
    reportVersion,
    product: product ?? null,
    existingGrant,
    hasAccess: Boolean(existingGrant),
  };
}