// features/my-assessment/api/my-assessment.queries.ts

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireVersions,
  questionnaires,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectQuestionnaires,
  assessmentProjects,
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
    .orderBy(asc(questionnaires.name), desc(questionnaireVersions.updatedAt))

  const publicQuestionnaires: MyAssessmentQuestionnaire[] =
    publicVersionRows.map((row) => ({
      id: `public:${row.questionnaireVersionId}`,
      source: "public",
      code: row.questionnaireCode,
      name: row.questionnaireName,
      description: row.questionnaireDescription,
      status: "available",
      estimatedMinutes: null,

      questionnaireId: row.questionnaireId,
      questionnaireVersionId: row.questionnaireVersionId,
      questionnaireVersionName: row.questionnaireVersionName,

      actionHref: `/my/assessment/public/${row.questionnaireVersionId}`,
    }));

  const invitedQuestionnaires: MyAssessmentQuestionnaire[] = [];

  if (email) {
    const activeTenantConnections = await controlDb
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
          eq(tenants.status, "active"),
          isNull(tenants.deletedAt),
          eq(tenantDatabaseConnections.migrationStatus, "success"),
        ),
      );

    for (const connection of activeTenantConnections) {
      let databaseUrl: string;

      try {
        databaseUrl = decryptSecret(connection.databaseUrlEncrypted);
      } catch {
        continue;
      }

      const db = getTenantDbByConnection({
        tenantId: connection.tenantId,
        databaseName: connection.databaseName,
        schemaVersion: Number(connection.schemaVersion ?? 0),
        databaseUrl,
      });

      const rows = await db
        .select({
          projectId: assessmentProjects.id,
          projectName: assessmentProjects.name,
          projectDescription: assessmentProjects.description,

          sessionId: assessmentSessions.id,
          sessionStatus: assessmentSessions.status,

          questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
          questionnaireVersionId:
            assessmentProjectQuestionnaires.questionnaireVersionId,

          accessLinkId: assessmentAccessLinks.id,
          accessLinkStatus: assessmentAccessLinks.status,
          accessLinkExpiresAt: assessmentAccessLinks.expiresAt,

          respondentId: respondents.id,
          respondentEmail: respondentIdentities.email,
        })
        .from(respondentIdentities)
        .innerJoin(
          respondents,
          eq(respondents.id, respondentIdentities.respondentId),
        )
        .innerJoin(
          assessmentSessions,
          eq(assessmentSessions.respondentId, respondents.id),
        )
        .innerJoin(
          assessmentProjects,
          eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
        )
        .innerJoin(
          assessmentProjectQuestionnaires,
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            assessmentProjects.id,
          ),
        )
        .leftJoin(
          assessmentAccessLinks,
          and(
            eq(assessmentAccessLinks.id, assessmentSessions.accessLinkId),
            isNull(assessmentAccessLinks.deletedAt),
          ),
        )
        .where(
          and(
            eq(respondentIdentities.email, email),
            eq(assessmentProjectQuestionnaires.status, "active"),
            isNull(respondentIdentities.deletedAt),
            isNull(respondents.deletedAt),
            isNull(assessmentSessions.deletedAt),
            isNull(assessmentProjects.deletedAt),
            isNull(assessmentProjectQuestionnaires.deletedAt),
          ),
        );

      const questionnaireVersionIds = Array.from(
        new Set(rows.map((row) => row.questionnaireVersionId)),
      );

      const versionRows =
        questionnaireVersionIds.length > 0
          ? await controlDb
              .select({
                questionnaireId: questionnaires.id,
                questionnaireCode: questionnaires.code,
                questionnaireName: questionnaires.name,
                questionnaireDescription: questionnaires.description,
                questionnaireVersionId: questionnaireVersions.id,
                questionnaireVersionName: questionnaireVersions.name,
              })
              .from(questionnaireVersions)
              .innerJoin(
                questionnaires,
                eq(questionnaires.id, questionnaireVersions.questionnaireId),
              )
              .where(
                and(
                  inArray(questionnaireVersions.id, questionnaireVersionIds),
                  isNull(questionnaireVersions.deletedAt),
                  isNull(questionnaires.deletedAt),
                ),
              )
          : [];

      const versionById = new Map(
        versionRows.map((version) => [version.questionnaireVersionId, version]),
      );

      for (const row of rows) {
        const version = versionById.get(row.questionnaireVersionId);

        if (!version) {
          continue;
        }

        invitedQuestionnaires.push({
          id: `invited:${connection.tenantSlug}:${row.sessionId}:${row.questionnaireVersionId}`,
          source: "invited",
          code: version.questionnaireCode,
          name: version.questionnaireName,
          description:
            row.projectDescription ??
            version.questionnaireDescription ??
            "Kwestionariusz przypisany do projektu badawczego.",
          status: mapSessionStatusToCardStatus(row.sessionStatus),
          estimatedMinutes: null,

          questionnaireId: row.questionnaireId,
          questionnaireVersionId: row.questionnaireVersionId,
          questionnaireVersionName: version.questionnaireVersionName,

          tenantSlug: connection.tenantSlug,
          projectId: row.projectId,
          projectName: row.projectName,
          sessionId: row.sessionId,
          sessionStatus: row.sessionStatus,

          actionHref: `/my/assessment/sessions/${row.sessionId}?tenant=${connection.tenantSlug}&questionnaireVersionId=${row.questionnaireVersionId}`,
        });
      }
    }
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

