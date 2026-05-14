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

export type AssessmentSessionFormItem = {
  id: string;
  code: string;
  orderIndex: number;
  type: string;
  text: string;
  helpText: string | null;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  existingNumberValue: number | null;
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
};

export type ResolveAssessmentSessionFormResult =
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
          startedAt: Date;
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
        items: AssessmentSessionFormItem[];
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

export async function resolveAssessmentSessionForm({
  token,
  sessionId,
}: {
  token: string;
  sessionId: string;
}): Promise<ResolveAssessmentSessionFormResult> {
  const tokenHash = hashAssessmentAccessToken(token);

  const activeTenantConnections = await controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      databaseName: tenantDatabaseConnections.databaseName,
      databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
      migrationStatus: tenantDatabaseConnections.migrationStatus,
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
      .innerJoin(
        respondents,
        eq(respondents.id, assessmentSessions.respondentId),
      )
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
        ),
      )
      .limit(1);

    const row = rows[0];

    if (!row) {
      continue;
    }

    const projectQuestionnaires = await db
      .select({
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
            row.projectId,
          ),
          eq(assessmentProjectQuestionnaires.status, "active"),
          isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
      )
      .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

    if (projectQuestionnaires.length === 0) {
      return {
        ok: false,
        message:
          "Do tego projektu nie przypisano jeszcze żadnego kwestionariusza.",
      };
    }

    const questionnaireVersionIds = projectQuestionnaires.map(
      (item) => item.questionnaireVersionId,
    );

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

        questionnaireId: questionnaires.id,
        questionnaireName: questionnaires.name,
        questionnaireVersionId: questionnaireVersions.id,
        questionnaireVersionName: questionnaireVersions.name,
      })
      .from(questionnaireItems)
      .innerJoin(
        questionnaireVersions,
        eq(questionnaireVersions.id, questionnaireItems.questionnaireVersionId),
      )
      .innerJoin(
        questionnaires,
        eq(questionnaires.id, questionnaireVersions.questionnaireId),
      )
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
          isNull(questionnaireItems.deletedAt),
          isNull(questionnaireVersions.deletedAt),
          isNull(questionnaires.deletedAt),
        ),
      )
      .orderBy(asc(questionnaireVersions.name), asc(questionnaireItems.orderIndex));

    const existingResponses = await db
      .select({
        questionnaireItemId: assessmentResponses.questionnaireItemId,
        numberValue: assessmentResponses.numberValue,
      })
      .from(assessmentResponses)
      .where(
        and(
          eq(assessmentResponses.assessmentSessionId, sessionId),
          isNull(assessmentResponses.deletedAt),
        ),
      );

    const responseByItemId = new Map<string, number | null>();

    for (const response of existingResponses) {
      responseByItemId.set(response.questionnaireItemId, response.numberValue);
    }

    return {
      ok: true,
      data: {
        tenant: {
          id: connection.tenantId,
          slug: connection.tenantSlug,
          name: connection.tenantName,
        },
        session: {
          id: row.sessionId,
          status: row.sessionStatus,
          startedAt: row.sessionStartedAt,
        },
        project: {
          id: row.projectId,
          name: row.projectName,
          description: row.projectDescription,
        },
        respondent: {
          id: row.respondentId,
          email: row.respondentEmail,
          displayName: getDisplayName({
            firstName: row.respondentFirstName,
            lastName: row.respondentLastName,
            email: row.respondentEmail,
            externalCode: row.respondentExternalCode,
          }),
        },
        items: itemRows.map((item) => ({
          ...item,
          existingNumberValue: responseByItemId.get(item.id) ?? null,
        })),
      },
    };
  }

  return {
    ok: false,
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}