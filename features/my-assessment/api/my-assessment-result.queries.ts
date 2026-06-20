// features/my-assessment/api/my-assessment-result.queries.ts

import { and, desc, eq, isNull } from "drizzle-orm";

import {
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
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
    tenantSlug: connection.tenantSlug,
    db: getTenantDbByConnection({
      tenantId: connection.tenantId,
      databaseName: connection.databaseName,
      schemaVersion: Number(connection.schemaVersion ?? 0),
      databaseUrl,
    }),
  };
}

export async function getMyAssessmentCompletedResult({
  tenantSlug,
  sessionId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  if (!email) {
    throw new Error("Konto użytkownika nie ma adresu e-mail.");
  }

  const tenant = await getTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return null;
  }

  const ownershipRows = await tenant.db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
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

  const ownership = ownershipRows[0];

  if (!ownership) {
    return null;
  }

  if (normalizeEmail(ownership.respondentEmail) !== email) {
    throw new Error("Ta sesja badania nie należy do zalogowanego użytkownika.");
  }

  const snapshotRows = await tenant.db
    .select({
      id: assessmentResultSnapshots.id,

      projectQuestionnaireId:
        assessmentResultSnapshots.projectQuestionnaireId,

      questionnaireId:
        assessmentResultSnapshots.questionnaireId,

      questionnaireVersionId:
        assessmentResultSnapshots.questionnaireVersionId,

      payload: assessmentResultSnapshots.payload,
      createdAt: assessmentResultSnapshots.createdAt,
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
    .orderBy(desc(assessmentResultSnapshots.createdAt))
    .limit(2);

  console.log("MY_ASSESSMENT_COMPLETED_RESULT_SNAPSHOTS", {
    tenantSlug,
    sessionId,

    requestedProjectQuestionnaireId:
      projectQuestionnaireId,
    requestedQuestionnaireVersionId:
      questionnaireVersionId,

    snapshots: snapshotRows.map((snapshot) => ({
      snapshotId: snapshot.id,
      projectQuestionnaireId:
        snapshot.projectQuestionnaireId,
      questionnaireId: snapshot.questionnaireId,
      questionnaireVersionId:
        snapshot.questionnaireVersionId,
      createdAt: snapshot.createdAt,
    })),
  });

  if (
    !projectQuestionnaireId &&
    !questionnaireVersionId &&
    snapshotRows.length > 1
  ) {
    console.error(
      "MY_ASSESSMENT_COMPLETED_RESULT_AMBIGUOUS",
      {
        tenantSlug,
        sessionId,
        reason:
          "multiple_snapshots_without_questionnaire_scope",
        snapshots: snapshotRows.map((snapshot) => ({
          snapshotId: snapshot.id,
          projectQuestionnaireId:
            snapshot.projectQuestionnaireId,
          questionnaireId: snapshot.questionnaireId,
          questionnaireVersionId:
            snapshot.questionnaireVersionId,
        })),
      },
    );

    return null;
  }

  const snapshot = snapshotRows[0] ?? null;
  /**
   * Po zmianie modelu jedna assessment_session może obejmować kilka
   * kwestionariuszy. Dlatego sesja może być nadal "in_progress",
   * mimo że jeden z kwestionariuszy ma już snapshot i może mieć raport.
   */
  if (!snapshot) {
    if (ownership.sessionStatus !== "completed") {
      throw new Error("Ta sesja nie została jeszcze zakończona.");
    }

    return {
      tenantSlug: tenant.tenantSlug,
      sessionId,

      snapshotId: null,
      projectQuestionnaireId: null,
      questionnaireId: null,
      questionnaireVersionId: null,

      snapshot: null,
      payload: null,
    };
  }

  return {
    tenantSlug: tenant.tenantSlug,
    sessionId,

    snapshotId: snapshot.id,

    projectQuestionnaireId:
      snapshot.projectQuestionnaireId ?? null,

    questionnaireId:
      snapshot.questionnaireId ?? null,

    questionnaireVersionId:
      snapshot.questionnaireVersionId ?? null,

    snapshot,
    payload: snapshot.payload as any,
  };
}