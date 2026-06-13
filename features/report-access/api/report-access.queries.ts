// features/report-access/api/report-access.queries.ts
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";


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
  assessmentProjects,
  assessmentResultSnapshots,
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

export async function getCompletedSessionQuestionnaireVersionIds({
  db,
  assessmentProjectId,
  sessionId,
}: {
  db: any;
  assessmentProjectId: string;
  sessionId: string;
}) {
  
  const snapshotRows = await db
    .select({
      payload: assessmentResultSnapshots.payload,
    })
    .from(assessmentResultSnapshots)
    .where(
      and(
        eq(assessmentResultSnapshots.assessmentSessionId, sessionId),
        isNull(assessmentResultSnapshots.deletedAt),
      ),
    );

const questionnaireIds: string[] = Array.from(
  new Set<string>(
    snapshotRows
      .map((row: any) => getSnapshotQuestionnaireId(row.payload))
      .filter((value: unknown): value is string => {
        return typeof value === "string" && value.length > 0;
      }),
  ),
);

  if (questionnaireIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectId,
        ),
        inArray(
          assessmentProjectQuestionnaires.questionnaireId,
          questionnaireIds,
        ),
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
  expectedKind = "personal",
}: {
  questionnaireVersionIds: string[];
  expectedKind?: string;
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
      reportTemplateKind: reportTemplates.kind,
      reportTemplateQuestionnaireId: reportTemplates.questionnaireId,

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
        eq(reportTemplates.kind, expectedKind),
        isNull(questionnaireReportTemplateBindings.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .orderBy(
      desc(questionnaireReportTemplateBindings.isDefault),
      desc(questionnaireReportTemplateBindings.updatedAt),
    );

  const bound = bindingRows[0];

  if (bound) {
    return {
      reportTemplateId: bound.reportTemplateId,
      reportTemplateVersionId: bound.reportTemplateVersionId,
      reportTemplateName: bound.reportTemplateName,
      reportTemplateCode: bound.reportTemplateCode,
      reportTemplateKind: bound.reportTemplateKind,
      reportTemplateQuestionnaireId: bound.reportTemplateQuestionnaireId,
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
      reportTemplateKind: reportTemplates.kind,
      reportTemplateQuestionnaireId: reportTemplates.questionnaireId,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        inArray(
          reportTemplateVersions.questionnaireVersionId,
          questionnaireVersionIds,
        ),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        eq(reportTemplates.kind, expectedKind),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .orderBy(
      desc(reportTemplateVersions.isDefault),
      desc(reportTemplateVersions.updatedAt),
    );

  const direct = directRows[0];

  if (!direct) {
    return null;
  }

  return {
    reportTemplateId: direct.reportTemplateId,
    reportTemplateVersionId: direct.reportTemplateVersionId,
    reportTemplateName: direct.reportTemplateName,
    reportTemplateCode: direct.reportTemplateCode,
    reportTemplateKind: direct.reportTemplateKind,
    reportTemplateQuestionnaireId: direct.reportTemplateQuestionnaireId,
    reportTemplateVersionName: direct.reportTemplateVersionName,
    reportTemplateVersion: direct.reportTemplateVersion,
  };
}
function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readGrantProjectQuestionnaireId(metadata: unknown) {
  const record = asRecord(metadata);
  const scope = asRecord(record.reportScope);

  if (typeof record.projectQuestionnaireId === "string") {
    return record.projectQuestionnaireId;
  }

  if (typeof scope.projectQuestionnaireId === "string") {
    return scope.projectQuestionnaireId;
  }

  return null;
}

function readGrantQuestionnaireVersionId(metadata: unknown) {
  const record = asRecord(metadata);
  const scope = asRecord(record.reportScope);

  if (typeof record.questionnaireVersionId === "string") {
    return record.questionnaireVersionId;
  }

  if (typeof scope.questionnaireVersionId === "string") {
    return scope.questionnaireVersionId;
  }

  return null;
}

export async function getActiveReportAccessGrantForSession({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  userId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  userId?: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
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
    .limit(50);

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

      const grantProjectQuestionnaireId = readGrantProjectQuestionnaireId(
        grant.metadata,
      );

      const grantQuestionnaireVersionId = readGrantQuestionnaireVersionId(
        grant.metadata,
      );

      /**
       * Nowy model:
       * jedna assessment_session może mieć kilka ukończonych kwestionariuszy,
       * więc grant musi pasować do konkretnego projectQuestionnaireId
       * albo questionnaireVersionId.
       */
      if (projectQuestionnaireId) {
        return grantProjectQuestionnaireId === projectQuestionnaireId;
      }

      if (questionnaireVersionId) {
        return grantQuestionnaireVersionId === questionnaireVersionId;
      }

      /**
       * Legacy fallback:
       * bez scope uznajemy tylko stare granty, które same nie mają scope.
       * Dzięki temu grant dla jednego kwestionariusza nie odblokuje drugiego.
       */
      return !grantProjectQuestionnaireId && !grantQuestionnaireVersionId;
    }) ?? null
  );
}

export async function getReportAccessOfferForCompletedSession({
  tenantSlug,
  sessionId,
  expectedKind = "personal",
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  expectedKind?: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
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

  let questionnaireVersionIds: string[] = [];

  if (questionnaireVersionId) {
    questionnaireVersionIds = [questionnaireVersionId];
  } else if (projectQuestionnaireId) {
    const rows = await resolved.tenant.db
      .select({
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
      })
      .from(assessmentProjectQuestionnaires)
      .where(
        and(
          eq(assessmentProjectQuestionnaires.id, projectQuestionnaireId),
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            resolved.session.assessmentProjectId,
          ),
          eq(assessmentProjectQuestionnaires.status, "active"),
          isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
      )
      .limit(1);

    const row = rows[0];

    questionnaireVersionIds = row?.questionnaireVersionId
      ? [row.questionnaireVersionId]
      : [];
  } else {
    questionnaireVersionIds =
      await getCompletedSessionQuestionnaireVersionIds({
        db: resolved.tenant.db,
        assessmentProjectId: resolved.session.assessmentProjectId,
        sessionId: resolved.session.sessionId,
      });
  }

  if (questionnaireVersionIds.length === 0) {
    return {
      ok: false as const,
      message:
        "Nie udało się ustalić kwestionariusza dla odblokowywanego raportu.",
    };
  }

  const reportVersion =
    await resolveCurrentActiveReportTemplateVersionForSession({
      questionnaireVersionIds,
      expectedKind,
    });

  if (!reportVersion) {
    return {
      ok: false as const,
      message:
        expectedKind === "personal"
          ? "Dla tego badania nie ma aktywnego raportu indywidualnego do odblokowania."
          : "Dla tego badania nie ma aktywnego template’u raportu.",
    };
  }

  if (reportVersion.reportTemplateKind !== expectedKind) {
    return {
      ok: false as const,
      message: "Wybrany template raportu ma nieprawidłowy typ.",
    };
  }

const resolvedQuestionnaireVersionId =
  questionnaireVersionIds[0] ?? null;

const existingGrant = await getActiveReportAccessGrantForSession({
  tenantSlug,
  sessionId,
  reportTemplateVersionId: reportVersion.reportTemplateVersionId,
  userId: resolved.actorUserId,
  projectQuestionnaireId,
  questionnaireVersionId: resolvedQuestionnaireVersionId,
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
    projectQuestionnaireId,
    questionnaireVersionId: questionnaireVersionIds[0] ?? null,
  };
}



function readCompositeRequiredSources(dataBindings: unknown) {
  const bindings = asRecord(dataBindings);
  const sources = asRecord(bindings.sources);
  const personalReports = sources.personalReports;

  if (!Array.isArray(personalReports)) {
    return [];
  }

  return personalReports
    .map((item) => {
      const source = asRecord(item);

      return {
        slot: typeof source.slot === "string" ? source.slot : "",
        label: typeof source.label === "string" ? source.label : "",
        questionnaireId:
          typeof source.questionnaireId === "string"
            ? source.questionnaireId
            : "",
        questionnaireCode:
          typeof source.questionnaireCode === "string"
            ? source.questionnaireCode
            : "",
        questionnaireName:
          typeof source.questionnaireName === "string"
            ? source.questionnaireName
            : "",
        required: Boolean(source.required),
      };
    })
    .filter((source) => source.slot && source.questionnaireId);
}

function getSnapshotQuestionnaireId(payload: unknown) {
  const record = asRecord(payload);
  const questionnaires = Array.isArray(record.questionnaires)
    ? record.questionnaires
    : [];

  const first = asRecord(questionnaires[0]);

  if (typeof first.questionnaireId === "string") {
    return first.questionnaireId;
  }

  const questionnaire = asRecord(record.questionnaire);

  if (typeof questionnaire.id === "string") {
    return questionnaire.id;
  }

  if (typeof record.questionnaireId === "string") {
    return record.questionnaireId;
  }

  return null;
}

export async function getActiveReportAccessGrantForSubject({
  tenantSlug,
  subjectType,
  subjectId,
  reportTemplateVersionId,
  userId,
}: {
  tenantSlug: string;
  subjectType: string;
  subjectId: string;
  reportTemplateVersionId: string;
  userId?: string | null;
}) {
  const grants = await controlDb
    .select()
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.subjectType, subjectType),
        eq(reportAccessGrants.subjectId, subjectId),
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

export async function resolveRespondentForCurrentUser({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);
console.log("RESOLVE_RESPONDENT_FOR_CURRENT_USER_INPUT", {
  tenantSlug,
  actorUserId: authSession.user.id,
  actorEmail: authSession.user.email,
});
  if (!email) {
    return {
      ok: false as const,
      message: "Konto użytkownika nie ma adresu e-mail.",
    };
  }
console.log("RESOLVE_RESPONDENT_NORMALIZED_EMAIL", {
  rawEmail: authSession.user.email,
  email,
});
  const tenant = await getTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return {
      ok: false as const,
      message: "Nie znaleziono tenanta badania.",
    };
  }

  const rows = await tenant.db
    .select({
      respondentId: respondents.id,
      respondentEmail: respondentIdentities.email,
      respondentExternalCode: respondents.externalCode,
    })
    .from(respondents)
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .where(
      and(
        eq(respondentIdentities.email, email),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);
console.log("RESOLVE_RESPONDENT_TENANT_RESULT", {
  tenantSlug,
  email,
  rows: rows.map((row) => ({
    row
  })),
});
  const respondent = rows[0];

  if (!respondent) {
    return {
      ok: false as const,
      message:
        "Nie znaleziono respondenta powiązanego z adresem e-mail zalogowanego użytkownika.",
    };
  }

  return {
    ok: true as const,
    tenant,
    actorUserId: authSession.user.id,
    actorEmail: email,
    respondent: {
      id: respondent.respondentId,
      email: normalizeEmail(respondent.respondentEmail),
      externalCode: respondent.respondentExternalCode,
    },
  };
}

function resolveSnapshotQuestionnaireId(row: {
  questionnaireId?: string | null;
  payload?: unknown;
}) {
  const directQuestionnaireId = String(
    row.questionnaireId ?? "",
  ).trim();

  if (directQuestionnaireId) {
    return directQuestionnaireId;
  }

  return getSnapshotQuestionnaireId(row.payload);
}

export async function getCompositeReportAccessOfferForCurrentUser({
  tenantSlug,
  tenantSlugs,
  reportTemplateVersionId,
}: {
  /**
   * Legacy: pojedynczy tenant.
   */
  tenantSlug?: string | null;

  /**
   * Nowy wariant: wiele tenantów, z których mogą pochodzić źródła composite.
   */
  tenantSlugs?: string[] | null;

  reportTemplateVersionId: string;
}) {
  const normalizedTenantSlugs = Array.from(
    new Set(
      [
        ...(Array.isArray(tenantSlugs) ? tenantSlugs : []),
        tenantSlug ?? "",
      ]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (normalizedTenantSlugs.length === 0) {
    return {
      ok: false as const,
      message:
        "Brakuje kontekstu tenanta potrzebnego do wyszukania danych źródłowych raportu.",
    };
  }

  const [reportVersion] = await controlDb
    .select({
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
      reportTemplateVersionStatus: reportTemplateVersions.status,
      dataBindings: reportTemplateVersions.dataBindings,

      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
      reportTemplateKind: reportTemplates.kind,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        eq(reportTemplates.kind, "personal_composite"),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!reportVersion) {
    return {
      ok: false as const,
      message: "Nie znaleziono aktywnej wersji raportu złożonego.",
    };
  }

  const configuredSources = readCompositeRequiredSources(
    reportVersion.dataBindings,
  );

  if (configuredSources.length === 0) {
    return {
      ok: false as const,
      message:
        "Raport złożony nie ma skonfigurowanych kwestionariuszy źródłowych.",
    };
  }

  /**
   * Każdy tenant ma własną bazę respondents/sessions/snapshots.
   * Brak respondenta w jednym tenancie nie blokuje pozostałych tenantów.
   */
  const tenantContextResults = await Promise.all(
    normalizedTenantSlugs.map(async (currentTenantSlug) => {
      const resolved = await resolveRespondentForCurrentUser({
        tenantSlug: currentTenantSlug,
      });

      if (!resolved.ok) {
        return {
          ok: false as const,
          tenantSlug: currentTenantSlug,
          message: resolved.message,
        };
      }

      const rows = await resolved.tenant.db
        .select({
          sessionId: assessmentSessions.id,
          sessionStatus: assessmentSessions.status,
          sessionCompletedAt: assessmentSessions.completedAt,

          assessmentProjectId: assessmentProjects.id,
          assessmentProjectName: assessmentProjects.name,

          snapshotId: assessmentResultSnapshots.id,
          projectQuestionnaireId:
            assessmentResultSnapshots.projectQuestionnaireId,
          questionnaireId: assessmentResultSnapshots.questionnaireId,
          questionnaireVersionId:
            assessmentResultSnapshots.questionnaireVersionId,

          payload: assessmentResultSnapshots.payload,
          snapshotCreatedAt: assessmentResultSnapshots.createdAt,

          projectQuestionnaireQuestionnaireId:
            assessmentProjectQuestionnaires.questionnaireId,

          projectQuestionnaireVersionId:
            assessmentProjectQuestionnaires.questionnaireVersionId,
        })
        .from(assessmentResultSnapshots)
        .innerJoin(
          assessmentSessions,
          eq(
            assessmentSessions.id,
            assessmentResultSnapshots.assessmentSessionId,
          ),
        )
        .innerJoin(
          assessmentProjects,
          eq(
            assessmentProjects.id,
            assessmentSessions.assessmentProjectId,
          ),
        )
        .leftJoin(
          assessmentProjectQuestionnaires,
          eq(
            assessmentProjectQuestionnaires.id,
            assessmentResultSnapshots.projectQuestionnaireId,
          ),
        )
        .where(
          and(
            eq(assessmentSessions.respondentId, resolved.respondent.id),
            isNull(assessmentSessions.deletedAt),
            isNull(assessmentProjects.deletedAt),
            isNull(assessmentResultSnapshots.deletedAt),
          ),
        );

      return {
        ok: true as const,
        tenantSlug: currentTenantSlug,
        resolved,
        snapshotRows: rows,
      };
    }),
  );

  const availableTenantContexts = tenantContextResults.filter(
    (
      context,
    ): context is Extract<
      (typeof tenantContextResults)[number],
      { ok: true }
    > => context.ok,
  );

  if (availableTenantContexts.length === 0) {
    const messages = tenantContextResults
      .filter(
        (
          context,
        ): context is Extract<
          (typeof tenantContextResults)[number],
          { ok: false }
        > => !context.ok,
      )
      .map((context) => `${context.tenantSlug}: ${context.message}`);

    return {
      ok: false as const,
      message:
        "Nie znaleziono respondenta powiązanego z zalogowanym użytkownikiem w żadnym z dostępnych tenantów." +
        (messages.length > 0 ? ` ${messages.join(" ")}` : ""),
    };
  }

  /**
   * Zachowujemy tenant przy każdym snapshotcie.
   * UUID sesji nie wystarcza do identyfikacji źródła między tenantami.
   */
  const snapshotRows = availableTenantContexts.flatMap((context) =>
    context.snapshotRows.map((row) => ({
      ...row,
      tenantSlug: context.tenantSlug,
      respondentId: context.resolved.respondent.id,
    })),
  );

  console.log("COMPOSITE_SOURCE_SNAPSHOTS", {
    requestedTenantSlugs: normalizedTenantSlugs,

    availableTenantContexts: availableTenantContexts.map((context) => ({
      tenantSlug: context.tenantSlug,
      respondentId: context.resolved.respondent.id,
      snapshotsCount: context.snapshotRows.length,
    })),

    unavailableTenantContexts: tenantContextResults
      .filter((context) => !context.ok)
      .map((context) => ({
        tenantSlug: context.tenantSlug,
        message: context.message,
      })),

    configuredSources: configuredSources.map((source) => ({
      slot: source.slot,
      questionnaireId: source.questionnaireId,
      questionnaireCode: source.questionnaireCode,
      required: source.required,
    })),

    snapshots: snapshotRows.map((row) => ({
      tenantSlug: row.tenantSlug,
      respondentId: row.respondentId,
      snapshotId: row.snapshotId,
      sessionId: row.sessionId,
      assessmentProjectId: row.assessmentProjectId,
      projectQuestionnaireId: row.projectQuestionnaireId,

      snapshotQuestionnaireId: row.questionnaireId,
      snapshotQuestionnaireVersionId: row.questionnaireVersionId,

      projectQuestionnaireQuestionnaireId:
        row.projectQuestionnaireQuestionnaireId,

      projectQuestionnaireVersionId:
        row.projectQuestionnaireVersionId,

      questionnaireIdFromPayload:
        getSnapshotQuestionnaireId(row.payload),

      resolvedQuestionnaireId:
        resolveSnapshotQuestionnaireId(row),
    })),
  });

  const completedQuestionnaireIds = new Set(
    snapshotRows
      .map((row) => resolveSnapshotQuestionnaireId(row))
      .filter((value): value is string => Boolean(value)),
  );

  const missingRequiredSources = configuredSources.filter(
    (source) =>
      source.required &&
      !completedQuestionnaireIds.has(source.questionnaireId),
  );

  const missingOptionalSources = configuredSources.filter(
    (source) =>
      !source.required &&
      !completedQuestionnaireIds.has(source.questionnaireId),
  );

  const sourceCandidates = configuredSources.map((source, index) => {
    const sourceRecord = source as Record<string, any>;

    const questionnaireId = String(
      sourceRecord.questionnaireId ?? "",
    ).trim();

    const questionnaireCode = String(
      sourceRecord.questionnaireCode ?? "",
    ).trim();

    const slot = String(
      sourceRecord.slot ?? `source_${index + 1}`,
    ).trim();

const candidates = snapshotRows
  .filter(
    (row) =>
      resolveSnapshotQuestionnaireId(row) === questionnaireId,
  )
  .map((row) => ({
    tenantSlug: row.tenantSlug,

    assessmentSessionId: row.sessionId,
    assessmentProjectId: row.assessmentProjectId ?? null,
    assessmentProjectName: row.assessmentProjectName ?? null,

    projectQuestionnaireId:
      row.projectQuestionnaireId ?? null,

    // Kandydat został już odfiltrowany dla tego źródła,
    // więc używamy niepustego ID z konfiguracji źródła.
    questionnaireId,

    questionnaireVersionId:
      row.questionnaireVersionId ?? null,

    snapshotId: row.snapshotId,

    completedAt:
      row.snapshotCreatedAt ??
      row.sessionCompletedAt ??
      null,
  }));

    return {
      slot,

      label:
        String(sourceRecord.label ?? "").trim() ||
        questionnaireCode ||
        questionnaireId ||
        slot,

      questionnaireName:
        String(sourceRecord.questionnaireName ?? "").trim() ||
        questionnaireCode ||
        questionnaireId ||
        slot,

      questionnaireId,
      questionnaireCode,
      required: Boolean(sourceRecord.required),

      candidates,
    };
  });

  const eligibility = {
    status:
      missingRequiredSources.length > 0
        ? ("missing_required_sources" as const)
        : ("ready" as const),

    canRender: missingRequiredSources.length === 0,

    configuredSources,
    completedQuestionnaireIds: Array.from(
      completedQuestionnaireIds,
    ),

    missingRequiredSources,
    missingOptionalSources,
  };

  /**
   * Legacy i nowy model:
   *
   * Grant composite może być przypisany do respondenta znajdującego się
   * w dowolnym z tenantów źródłowych. Sprawdzamy każdy rozpoznany kontekst.
   */
  const grantCandidates = await Promise.all(
    availableTenantContexts.map(async (context) => {
      const grant = await getActiveReportAccessGrantForSubject({
        tenantSlug: context.tenantSlug,
        subjectType: "respondent",
        subjectId: context.resolved.respondent.id,
        reportTemplateVersionId,
        userId: context.resolved.actorUserId,
      });

      return {
        tenantSlug: context.tenantSlug,
        respondentId: context.resolved.respondent.id,
        grant,
      };
    }),
  );

  const existingGrantContext =
    grantCandidates.find((candidate) => Boolean(candidate.grant)) ??
    null;

  const existingGrant = existingGrantContext?.grant ?? null;

  const product =
    await controlDb.query.reportAccessProducts.findFirst({
      where: and(
        eq(
          reportAccessProducts.reportTemplateId,
          reportVersion.reportTemplateId,
        ),
        eq(reportAccessProducts.status, "active"),
        isNull(reportAccessProducts.deletedAt),
      ),
    });

  /**
   * Primary context zachowuje kompatybilność z kodem oczekującym:
   * tenantSlug, respondent, actorUserId i actorEmail.
   *
   * Pierwszeństwo:
   * 1. tenant z istniejącym grantem,
   * 2. legacy tenantSlug,
   * 3. pierwszy poprawnie rozpoznany tenant.
   */
  const preferredTenantSlug =
    existingGrantContext?.tenantSlug ??
    (tenantSlug &&
    availableTenantContexts.some(
      (context) => context.tenantSlug === tenantSlug,
    )
      ? tenantSlug
      : null) ??
    availableTenantContexts[0].tenantSlug;

  const primaryContext =
    availableTenantContexts.find(
      (context) => context.tenantSlug === preferredTenantSlug,
    ) ?? availableTenantContexts[0];

  return {
    ok: true as const,

    /**
     * Legacy — pojedynczy tenant kotwiczący ofertę/grant.
     */
    tenantSlug: primaryContext.tenantSlug,

    /**
     * Nowy model — wszystkie tenanty sprawdzone dla composite.
     */
    tenantSlugs: normalizedTenantSlugs,

    /**
     * Tenanty, w których faktycznie znaleziono respondenta.
     */
    availableTenantSlugs: availableTenantContexts.map(
      (context) => context.tenantSlug,
    ),

    actorUserId: primaryContext.resolved.actorUserId,
    actorEmail: primaryContext.resolved.actorEmail,

    /**
     * Legacy — główny respondent.
     */
    respondent: primaryContext.resolved.respondent,

    /**
     * Nowy model — respondent może mieć odrębne ID w każdym tenant DB.
     */
    respondentContexts: availableTenantContexts.map((context) => ({
      tenantSlug: context.tenantSlug,
      respondent: context.resolved.respondent,
    })),

    reportVersion,
    product: product ?? null,

    existingGrant,
    existingGrantTenantSlug:
      existingGrantContext?.tenantSlug ?? null,

    hasAccess: Boolean(existingGrant),

    eligibility,
    sourceCandidates,
  };
}


export async function getReportAccessOfferForCompletedSessionAndReportVersion({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  expectedKind,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  expectedKind?: string;
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

  const [reportVersion] = await controlDb
    .select({
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
      reportTemplateVersionStatus: reportTemplateVersions.status,

      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
      reportTemplateKind: reportTemplates.kind,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        eq(reportTemplateVersions.status, "active"),
        eq(reportTemplates.status, "active"),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!reportVersion) {
    return {
      ok: false as const,
      message: "Nie znaleziono aktywnej wersji raportu.",
    };
  }

  if (expectedKind && reportVersion.reportTemplateKind !== expectedKind) {
    return {
      ok: false as const,
      message: "Wybrany template raportu ma nieprawidłowy typ.",
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