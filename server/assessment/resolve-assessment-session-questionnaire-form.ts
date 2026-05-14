import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaireItems,
  questionnairePages,
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

export type AssessmentSessionQuestionnaireFormItem = {
  id: string;
  code: string;
  type: string;
  text: string;
  helpText: string | null;
  required: boolean;

  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;

  options: unknown;
  responseConfig: unknown;

  existingNumberValue: number | null;
  existingTextValue: string | null;
  existingBooleanValue: boolean | null;
  existingJsonValue: unknown | null;

  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;

  questionnairePageId: string | null;
  pageId: string | null;
  pageCode: string | null;
  pageTitle: string | null;
  pageDescription: string | null;
  pageOrderIndex: number | null;

  orderIndex: number;
};

export type ResolveAssessmentSessionQuestionnaireFormResult =
  | {
      ok: true;
      data: {
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
        session: {
          id: string;
          status: string;
        };
        questionnaire: {
          projectQuestionnaireId: string;
          questionnaireId: string;
          questionnaireVersionId: string;
          questionnaireName: string;
          questionnaireVersionName: string;
        };
        items: AssessmentSessionQuestionnaireFormItem[];
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

export async function resolveAssessmentSessionQuestionnaireForm({
  token,
  sessionId,
  projectQuestionnaireId,
}: {
  token: string;
  sessionId: string;
  projectQuestionnaireId: string;
}): Promise<ResolveAssessmentSessionQuestionnaireFormResult> {
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

    const sessionRows = await db
      .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,

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

    const sessionRow = sessionRows[0];

    if (!sessionRow) {
      continue;
    }

    const projectQuestionnaireRows = await db
      .select({
        id: assessmentProjectQuestionnaires.id,
        questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
      })
      .from(assessmentProjectQuestionnaires)
      .where(
        and(
          eq(assessmentProjectQuestionnaires.id, projectQuestionnaireId),
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            sessionRow.projectId,
          ),
          eq(assessmentProjectQuestionnaires.status, "active"),
          isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
      )
      .limit(1);

    const projectQuestionnaire = projectQuestionnaireRows[0];

    if (!projectQuestionnaire) {
      return {
        ok: false,
        message:
          "Ten kwestionariusz nie jest przypisany do tej sesji badania albo nie jest aktywny.",
      };
    }

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
          eq(
            questionnaireVersions.id,
            projectQuestionnaire.questionnaireVersionId,
          ),
          isNull(questionnaireVersions.deletedAt),
          isNull(questionnaires.deletedAt),
        ),
      )
      .limit(1);

    const questionnaire = questionnaireRows[0];

    if (!questionnaire) {
      return {
        ok: false,
        message: "Nie znaleziono aktywnej wersji kwestionariusza.",
      };
    }

    const itemRows = await controlDb
      .select({
        id: questionnaireItems.id,
        code: questionnaireItems.code,
        orderIndex: questionnaireItems.orderIndex,
        type: questionnaireItems.type,
        text: questionnaireItems.text,
        helpText: questionnaireItems.helpText,
        required: questionnaireItems.required,
        scaleMin: questionnaireItems.scaleMin,
        scaleMax: questionnaireItems.scaleMax,
        scaleMinLabel: questionnaireItems.scaleMinLabel,
        scaleMaxLabel: questionnaireItems.scaleMaxLabel,
        options: questionnaireItems.options,
        responseConfig: questionnaireItems.responseConfig,

        questionnairePageId: questionnaireItems.questionnairePageId,
        pageId: questionnairePages.id,
        pageCode: questionnairePages.code,
        pageTitle: questionnairePages.title,
        pageDescription: questionnairePages.description,
        pageOrderIndex: questionnairePages.orderIndex,
      })
      .from(questionnaireItems)
      .leftJoin(
        questionnairePages,
        and(
          eq(questionnairePages.id, questionnaireItems.questionnairePageId),
          eq(
            questionnairePages.questionnaireVersionId,
            questionnaireItems.questionnaireVersionId,
          ),
          isNull(questionnairePages.deletedAt),
        ),
      )
      .where(
        and(
          eq(
            questionnaireItems.questionnaireVersionId,
            projectQuestionnaire.questionnaireVersionId,
          ),
          isNull(questionnaireItems.deletedAt),
        ),
      )
      .orderBy(
        asc(questionnairePages.orderIndex),
        asc(questionnaireItems.orderIndex),
      );

    const itemIds = itemRows.map((item) => item.id);

    const responseRows =
      itemIds.length > 0
        ? await db
            .select({
              questionnaireItemId: assessmentResponses.questionnaireItemId,
              numberValue: assessmentResponses.numberValue,
              textValue: assessmentResponses.textValue,
              booleanValue: assessmentResponses.booleanValue,
              jsonValue: assessmentResponses.jsonValue,
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

    const responseByItemId = new Map(
      responseRows.map((response) => [
        response.questionnaireItemId,
        response,
      ]),
    );

    return {
      ok: true,
      data: {
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
        session: {
          id: sessionRow.sessionId,
          status: sessionRow.sessionStatus,
        },
        questionnaire: {
          projectQuestionnaireId: projectQuestionnaire.id,
          questionnaireId: questionnaire.questionnaireId,
          questionnaireVersionId: questionnaire.questionnaireVersionId,
          questionnaireName: questionnaire.questionnaireName,
          questionnaireVersionName: questionnaire.questionnaireVersionName,
        },
        items: itemRows.map((item) => {
          const response = responseByItemId.get(item.id);

          return {
            id: item.id,
            code: item.code,
            type: item.type,
            text: item.text,
            helpText: item.helpText,
            required: item.required,

            scaleMin: item.scaleMin,
            scaleMax: item.scaleMax,
            scaleMinLabel: item.scaleMinLabel,
            scaleMaxLabel: item.scaleMaxLabel,

            options: item.options,
            responseConfig: item.responseConfig,

            existingNumberValue: response?.numberValue ?? null,
            existingTextValue: response?.textValue ?? null,
            existingBooleanValue: response?.booleanValue ?? null,
            existingJsonValue: response?.jsonValue ?? null,

            questionnaireId: questionnaire.questionnaireId,
            questionnaireVersionId: questionnaire.questionnaireVersionId,
            questionnaireName: questionnaire.questionnaireName,
            questionnaireVersionName: questionnaire.questionnaireVersionName,

            questionnairePageId: item.questionnairePageId,
            pageId: item.pageId,
            pageCode: item.pageCode,
            pageTitle: item.pageTitle,
            pageDescription: item.pageDescription,
            pageOrderIndex: item.pageOrderIndex,

            orderIndex: item.orderIndex,
          };
        }),
      },
    };
  }

  return {
    ok: false,
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}