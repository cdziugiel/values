import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireItems,
  questionnaires,
  questionnaireVersions,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectQuestionnaires,
  assessmentProjects,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";

export type AssessmentSessionOverviewQuestionnaire = {
  projectQuestionnaireId: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
  orderIndex: number;
  totalItemsCount: number;
  requiredItemsCount: number;
  answeredItemsCount: number;
  answeredRequiredItemsCount: number;
  completionPercent: number;
  isCompleted: boolean;
};

export type ResolveAssessmentSessionOverviewResult =
  | {
      ok: true;
      data: {
        tenant: {
          id: string;
          slug: string;
          name: string;
        };
        session: {
          id: string;
          status: string;
          startedAt: Date | null;
          completedAt: Date | null;
        };
        project: {
          id: string;
          name: string;
          description: string | null;
        };
        respondent: {
          id: string;
          displayName: string;
          email: string | null;
        };
        questionnaires: AssessmentSessionOverviewQuestionnaire[];
        allRequiredCompleted: boolean;
      };
    }
  | {
      ok: false;
      message: string;
    };

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");

  return name || input.email || input.externalCode || "Respondent";
}

function percent(answered: number, expected: number) {
  if (expected <= 0) {
    return 100;
  }

  return Math.round((answered / expected) * 100);
}

export async function resolveAssessmentSessionOverview({
  token,
  sessionId,
}: {
  token: string;
  sessionId: string;
}): Promise<ResolveAssessmentSessionOverviewResult> {
  const tokenHash = hashAssessmentAccessToken(token);

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
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        sessionStartedAt: assessmentSessions.startedAt,
        sessionCompletedAt: assessmentSessions.completedAt,

        projectId: assessmentProjects.id,
        projectName: assessmentProjects.name,
        projectDescription: assessmentProjects.description,

        respondentId: respondents.id,
        respondentExternalCode: respondents.externalCode,
        respondentEmail: respondentIdentities.email,
        respondentFirstName: respondentIdentities.firstName,
        respondentLastName: respondentIdentities.lastName,
      })
      .from(assessmentSessions)
      .innerJoin(
        assessmentAccessLinks,
        eq(assessmentAccessLinks.id, assessmentSessions.accessLinkId),
      )
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
      .where(
        and(
          eq(assessmentSessions.id, sessionId),
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          eq(assessmentAccessLinks.status, "active"),
          isNull(assessmentSessions.deletedAt),
          isNull(assessmentAccessLinks.deletedAt),
          isNull(assessmentProjects.deletedAt),
          isNull(respondents.deletedAt),
        ),
      )
      .limit(1);

    const sessionRow = rows[0];

    if (!sessionRow) {
      continue;
    }

    const projectQuestionnaireRows = await db
      .select({
        id: assessmentProjectQuestionnaires.id,
        questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
        orderIndex: assessmentProjectQuestionnaires.orderIndex,
      })
      .from(assessmentProjectQuestionnaires)
      .where(
        and(
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            sessionRow.projectId,
          ),
          eq(assessmentProjectQuestionnaires.status, "active"),
          isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
      )
      .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

    if (projectQuestionnaireRows.length === 0) {
      return {
        ok: false,
        message:
          "Do tego projektu nie przypisano jeszcze żadnego aktywnego kwestionariusza.",
      };
    }

    const questionnaireVersionIds = projectQuestionnaireRows.map(
      (item) => item.questionnaireVersionId,
    );

    const questionnaireRows = await controlDb
      .select({
        questionnaireId: questionnaires.id,
        questionnaireName: questionnaires.name,
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
      );

    const questionnaireByVersionId = new Map(
      questionnaireRows.map((row) => [row.questionnaireVersionId, row]),
    );

    const itemRows = await controlDb
      .select({
        id: questionnaireItems.id,
        questionnaireVersionId: questionnaireItems.questionnaireVersionId,
        required: questionnaireItems.required,
      })
      .from(questionnaireItems)
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
          isNull(questionnaireItems.deletedAt),
        ),
      );

    const itemIds = itemRows.map((item) => item.id);

    const responseRows =
      itemIds.length > 0
        ? await db
            .select({
              questionnaireItemId: assessmentResponses.questionnaireItemId,
              questionnaireVersionId: assessmentResponses.questionnaireVersionId,
            })
            .from(assessmentResponses)
            .where(
              and(
                eq(assessmentResponses.assessmentSessionId, sessionId),
                inArray(assessmentResponses.questionnaireItemId, itemIds),
                isNull(assessmentResponses.deletedAt),
              ),
            )
        : [];

    const answeredItemIds = new Set(
      responseRows.map((response) => response.questionnaireItemId),
    );

    const itemsByVersionId = new Map<
      string,
      Array<{
        id: string;
        required: boolean;
      }>
    >();

    for (const item of itemRows) {
      const existing = itemsByVersionId.get(item.questionnaireVersionId) ?? [];

      existing.push({
        id: item.id,
        required: item.required,
      });

      itemsByVersionId.set(item.questionnaireVersionId, existing);
    }

    const overviewQuestionnaires = projectQuestionnaireRows.map(
      (projectQuestionnaire) => {
        const questionnaire = questionnaireByVersionId.get(
          projectQuestionnaire.questionnaireVersionId,
        );

        const versionItems =
          itemsByVersionId.get(projectQuestionnaire.questionnaireVersionId) ?? [];

        const requiredItems = versionItems.filter((item) => item.required);

        const answeredItemsCount = versionItems.filter((item) =>
          answeredItemIds.has(item.id),
        ).length;

        const answeredRequiredItemsCount = requiredItems.filter((item) =>
          answeredItemIds.has(item.id),
        ).length;

        const expectedForCompletion =
          requiredItems.length > 0 ? requiredItems.length : versionItems.length;

        const answeredForCompletion =
          requiredItems.length > 0
            ? answeredRequiredItemsCount
            : answeredItemsCount;

        return {
          projectQuestionnaireId: projectQuestionnaire.id,
          questionnaireId:
            questionnaire?.questionnaireId ?? projectQuestionnaire.questionnaireId,
          questionnaireVersionId: projectQuestionnaire.questionnaireVersionId,
          questionnaireName:
            questionnaire?.questionnaireName ?? "Kwestionariusz",
          questionnaireVersionName:
            questionnaire?.questionnaireVersionName ?? "Wersja",
          orderIndex: projectQuestionnaire.orderIndex,
          totalItemsCount: versionItems.length,
          requiredItemsCount: requiredItems.length,
          answeredItemsCount,
          answeredRequiredItemsCount,
          completionPercent: percent(
            answeredForCompletion,
            expectedForCompletion,
          ),
          isCompleted:
            expectedForCompletion > 0 &&
            answeredForCompletion >= expectedForCompletion,
        };
      },
    );

    return {
      ok: true,
      data: {
        tenant: {
          id: connection.tenantId,
          slug: connection.tenantSlug,
          name: connection.tenantName,
        },
        session: {
          id: sessionRow.sessionId,
          status: sessionRow.sessionStatus,
          startedAt: sessionRow.sessionStartedAt,
          completedAt: sessionRow.sessionCompletedAt,
        },
        project: {
          id: sessionRow.projectId,
          name: sessionRow.projectName,
          description: sessionRow.projectDescription,
        },
        respondent: {
          id: sessionRow.respondentId,
          email: sessionRow.respondentEmail,
          displayName: getDisplayName({
            firstName: sessionRow.respondentFirstName,
            lastName: sessionRow.respondentLastName,
            email: sessionRow.respondentEmail,
            externalCode: sessionRow.respondentExternalCode,
          }),
        },
        questionnaires: overviewQuestionnaires,
        allRequiredCompleted: overviewQuestionnaires.every(
          (questionnaire) => questionnaire.isCompleted,
        ),
      },
    };
  }

  return {
    ok: false,
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}