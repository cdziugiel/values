// features/my-assessment/api/my-assessment.queries.ts


import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  assessmentInvitationIndex,
  questionnaireVersions,
  questionnaires,
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

import type {
  MyAssessment,
  MyAssessmentQuestionnaire,
  MyAssessmentQuestionnaireStatus,
} from "../types/my-assessment.types";

const DEFAULT_PUBLIC_TENANT_SLUG = "humanet";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function mapSessionStatusToCardStatus(
  status: string | null,
): MyAssessmentQuestionnaireStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  if (status === "not_started") return "available";

  return "available";
}



function buildMyQuestionnaireHref({
  tenantSlug,
  sessionId,
  projectQuestionnaireId,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId: string;
}) {
  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  return (
    `/my/assessment/sessions/${encodeURIComponent(sessionId)}` +
    `/questionnaire/${encodeURIComponent(projectQuestionnaireId)}` +
    `?${params.toString()}`
  );
}

function buildInvitationStartHref({
  invitationId,
}: {
  invitationId: string;
}) {
  return `/my/assessment/invitations/${encodeURIComponent(invitationId)}`;
}
async function getPublicTenantConnection() {
  const rows = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
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
        eq(tenants.slug, DEFAULT_PUBLIC_TENANT_SLUG),
        eq(tenants.status, "active"),
        isNull(tenants.deletedAt),
        eq(tenantDatabaseConnections.migrationStatus, "success"),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

function getTenantDbFromConnection(connection: {
  tenantId: string;
  databaseName: string;
  databaseUrlEncrypted: string;
  schemaVersion: number | string | null;
}) {
  const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

  return getTenantDbByConnection({
    tenantId: connection.tenantId,
    databaseName: connection.databaseName,
    schemaVersion: Number(connection.schemaVersion ?? 0),
    databaseUrl,
  });
}


export async function getMyAssessments(): Promise<MyAssessment> {
  const session = await requireSession();
  const email = normalizeEmail(session.user.email);

  const publicVersionRows = await controlDb
    .select({
      questionnaireId: questionnaires.id,
      questionnaireCode: questionnaires.code,
      questionnaireName: questionnaires.name,
      questionnaireDescription: questionnaires.description,
      questionnaireStatus: questionnaires.status,

      questionnaireVersionId: questionnaireVersions.id,
      questionnaireVersionName: questionnaireVersions.name,
      questionnaireVersion: questionnaireVersions.version,
      questionnaireVersionStatus: questionnaireVersions.status,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        eq(questionnaireVersions.isPublic, true),
        eq(questionnaireVersions.status, "active"),
        eq(questionnaires.status, "active"),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .orderBy(asc(questionnaires.name), desc(questionnaireVersions.updatedAt));

  const publicVersionIds = publicVersionRows.map(
    (row) => row.questionnaireVersionId,
  );

  const invitedQuestionnaires: MyAssessmentQuestionnaire[] = [];


  const activePublicSessionByVersionId = new Map<
    string,
    {
      tenantSlug: string;
      sessionId: string;
      projectQuestionnaireId: string;
      sessionStatus: string;
      updatedAt: Date | null;
      completedAt: Date | null;
    }
  >();

  const completedPublicSessionCards: MyAssessmentQuestionnaire[] = [];
  if (email && publicVersionIds.length > 0) {
    const publicTenantConnection = await getPublicTenantConnection();

    if (publicTenantConnection) {
      const db = getTenantDbFromConnection(publicTenantConnection);

      const publicSessionRows = await db
        .select({
          sessionId: assessmentSessions.id,
          sessionStatus: assessmentSessions.status,
          startedAt: assessmentSessions.startedAt,
          completedAt: assessmentSessions.completedAt,
          updatedAt: assessmentSessions.updatedAt,

          projectQuestionnaireId: assessmentProjectQuestionnaires.id,
          questionnaireVersionId:
            assessmentProjectQuestionnaires.questionnaireVersionId,
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
        .innerJoin(
          assessmentProjectQuestionnaires,
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            assessmentSessions.assessmentProjectId,
          ),
        )
        .where(
          and(
            sql`lower(trim(${respondentIdentities.email})) = ${email}`,
            inArray(
              assessmentProjectQuestionnaires.questionnaireVersionId,
              publicVersionIds,
            ),
            isNull(assessmentSessions.deletedAt),
            isNull(assessmentSessions.respondentArchivedAt),
            isNull(respondents.deletedAt),
            isNull(respondentIdentities.deletedAt),
            isNull(assessmentProjectQuestionnaires.deletedAt),
          ),
        )
        .orderBy(desc(assessmentSessions.updatedAt));
      const completedPublicSessionIds = new Set<string>();
      for (const row of publicSessionRows) {
        if (
          row.sessionStatus === "in_progress" &&
          !row.completedAt &&
          !activePublicSessionByVersionId.has(row.questionnaireVersionId)
        ) {
          activePublicSessionByVersionId.set(row.questionnaireVersionId, {
            tenantSlug: publicTenantConnection.tenantSlug,
            sessionId: row.sessionId,
            projectQuestionnaireId: row.projectQuestionnaireId,
            sessionStatus: row.sessionStatus,
            updatedAt: row.updatedAt,
            completedAt: row.completedAt,
          });

          continue;
        }

        if (row.sessionStatus === "completed" && row.completedAt) {
          if (completedPublicSessionIds.has(row.sessionId)) {
            continue;
          }

          completedPublicSessionIds.add(row.sessionId);

          const version = publicVersionRows.find(
            (item) =>
              item.questionnaireVersionId === row.questionnaireVersionId,
          );


          if (!version) {
            continue;
          }

          completedPublicSessionCards.push({
            id: `public-completed:${row.sessionId}`,
            source: "public",
            code: version.questionnaireCode,
            name: version.questionnaireName,
            description: version.questionnaireDescription,
            status: "completed",
            estimatedMinutes: null,

            questionnaireId: version.questionnaireId,
            questionnaireVersionId: version.questionnaireVersionId,
            questionnaireVersionName: version.questionnaireVersionName,

            tenantSlug: publicTenantConnection.tenantSlug,
            sessionId: row.sessionId,
            sessionStatus: "completed",

            updatedAt: row.updatedAt,
            completedAt: row.completedAt,
            projectQuestionnaireId: row.projectQuestionnaireId,
            actionHref:
              `/my/assessment/sessions/${encodeURIComponent(row.sessionId)}` +
              `/completed?tenant=${encodeURIComponent(
                publicTenantConnection.tenantSlug,
              )}`,
          });
        }
      }
    }
  }

  const publicBaseQuestionnaires: MyAssessmentQuestionnaire[] =
    publicVersionRows.map((row) => {
      const activeSession = activePublicSessionByVersionId.get(
        row.questionnaireVersionId,
      );

      if (activeSession) {
        return {
          id: `public-active:${row.questionnaireVersionId}`,
          source: "public",
          code: row.questionnaireCode,
          name: row.questionnaireName,
          description: row.questionnaireDescription,
          status: mapSessionStatusToCardStatus(activeSession.sessionStatus),
          estimatedMinutes: null,

          questionnaireId: row.questionnaireId,
          questionnaireVersionId: row.questionnaireVersionId,
          questionnaireVersionName: row.questionnaireVersionName,

          tenantSlug: activeSession.tenantSlug,
          sessionId: activeSession.sessionId,
          sessionStatus: activeSession.sessionStatus,

          updatedAt: activeSession.updatedAt,
          completedAt: activeSession.completedAt,

          actionHref: buildMyQuestionnaireHref({
            tenantSlug: activeSession.tenantSlug,
            sessionId: activeSession.sessionId,
            projectQuestionnaireId: activeSession.projectQuestionnaireId,
          }),
        };
      }

      return {
        id: `public-available:${row.questionnaireVersionId}`,
        source: "public",
        code: row.questionnaireCode,
        name: row.questionnaireName,
        description: row.questionnaireDescription,
        status: "available",
        estimatedMinutes: null,

        questionnaireId: row.questionnaireId,
        questionnaireVersionId: row.questionnaireVersionId,
        questionnaireVersionName: row.questionnaireVersionName,

        tenantSlug: DEFAULT_PUBLIC_TENANT_SLUG,
        sessionId: null,
        sessionStatus: null,

        actionHref: `/my/assessment/public/${row.questionnaireVersionId}?mode=new`,
      };
    });




  const publicQuestionnaires: MyAssessmentQuestionnaire[] = [
    ...publicBaseQuestionnaires,
    ...completedPublicSessionCards,
  ];
  const invitationRows = email
    ? await controlDb
      .select({
        id: assessmentInvitationIndex.id,

        tenantSlug: assessmentInvitationIndex.tenantSlug,
        tenantName: assessmentInvitationIndex.tenantName,
        tenantProjectId: assessmentInvitationIndex.tenantProjectId,
        tenantProjectRespondentId:
          assessmentInvitationIndex.tenantProjectRespondentId,
        tenantProjectQuestionnaireId:
          assessmentInvitationIndex.tenantProjectQuestionnaireId,
        tenantSessionId: assessmentInvitationIndex.tenantSessionId,
        tenantAccessLinkId: assessmentInvitationIndex.tenantAccessLinkId,

        questionnaireId: assessmentInvitationIndex.questionnaireId,
        questionnaireVersionId:
          assessmentInvitationIndex.questionnaireVersionId,

        projectNameSnapshot: assessmentInvitationIndex.projectNameSnapshot,
        questionnaireNameSnapshot:
          assessmentInvitationIndex.questionnaireNameSnapshot,
        questionnaireVersionNameSnapshot:
          assessmentInvitationIndex.questionnaireVersionNameSnapshot,

        status: assessmentInvitationIndex.status,

        invitedAt: assessmentInvitationIndex.invitedAt,
        startedAt: assessmentInvitationIndex.startedAt,
        completedAt: assessmentInvitationIndex.completedAt,
        updatedAt: assessmentInvitationIndex.updatedAt,
      })
      .from(assessmentInvitationIndex)
      .where(
        and(
          eq(assessmentInvitationIndex.respondentEmailNormalized, email),
          isNull(assessmentInvitationIndex.deletedAt),
          inArray(assessmentInvitationIndex.status, [
            "invited",
            "opened",
            "in_progress",
            "completed",
          ]),
        ),
      )
      .orderBy(desc(assessmentInvitationIndex.updatedAt))
    : [];
  for (const row of invitationRows) {
    const projectNameSnapshot = row.projectNameSnapshot?.trim() ?? "";

    const looksLikePublicMirror =
      projectNameSnapshot.startsWith("PUBLIC") &&
      !row.tenantAccessLinkId &&
      !row.invitedAt;
    if (looksLikePublicMirror) {
      continue;
    }
    const status: MyAssessmentQuestionnaireStatus =
      row.status === "completed"
        ? "completed"
        : row.status === "in_progress"
          ? "in_progress"
          : "available";

    const actionHref =
      row.status === "completed" && row.tenantSessionId
        ? `/my/assessment/sessions/${encodeURIComponent(row.tenantSessionId)}` +
        `/completed?tenant=${encodeURIComponent(row.tenantSlug)}`
        : row.status === "in_progress" && row.tenantSessionId
          ? buildMyQuestionnaireHref({
            tenantSlug: row.tenantSlug,
            sessionId: row.tenantSessionId,
            projectQuestionnaireId: row.tenantProjectQuestionnaireId,
          })
          : buildInvitationStartHref({
            invitationId: row.id,
          });

    invitedQuestionnaires.push({
      id: `invitation:${row.id}`,
      source: "invited",
      code: "INVITED",
      name:
        row.questionnaireNameSnapshot ??
        row.projectNameSnapshot ??
        "Zaproszenie do badania",

      description: row.projectNameSnapshot
        ? `Badanie: ${row.projectNameSnapshot}. Zapraszający: ${row.tenantName}.`
        : `Zaproszenie od: ${row.tenantName}.`,

      status,
      estimatedMinutes: null,

      questionnaireId: row.questionnaireId,
      questionnaireVersionId: row.questionnaireVersionId,
      questionnaireVersionName:
        row.questionnaireVersionNameSnapshot ?? "Wersja badania",

      tenantSlug: row.tenantSlug,
      projectId: row.tenantProjectId,
      projectName: row.projectNameSnapshot,
      projectQuestionnaireId: row.tenantProjectQuestionnaireId,
      sessionId:
        row.status === "in_progress" || row.status === "completed"
          ? row.tenantSessionId
          : null,

      sessionStatus:
        row.status === "completed"
          ? "completed"
          : row.status === "in_progress"
            ? "in_progress"
            : null,

      createdAt: row.invitedAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,

      actionHref,
    });
  }

  return {
    id: "my-assessments",
    code: "MY_ASSESSMENTS",
    name: "Moje badania",
    description:
      "W tym miejscu widzisz publiczne kwestionariusze oraz badania, do których jesteś zaproszony/a jako respondent.",
    publicQuestionnaires,
    invitedQuestionnaires,
  };
}