import { and, asc, eq, isNull } from "drizzle-orm";

import {
  questionnaireItems,
  questionnairePages,
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";
import {
  assessmentProjectQuestionnaires,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export async function resolveMyAssessmentSessionQuestionnaireForm({
  tenantSlug,
  sessionId,
  projectQuestionnaireId,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId: string;
}) {
  if (!tenantSlug) {
    return {
      ok: false as const,
      message: "Brakuje tenanta badania.",
    };
  }

  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  if (!email) {
    return {
      ok: false as const,
      message: "Konto użytkownika nie ma adresu e-mail.",
    };
  }

  const ctx = await requireTenantContext({ tenantSlug });
  const db = await getTenantDb(ctx);

    const sessionRows = await db
    .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        assessmentProjectId: assessmentSessions.assessmentProjectId,
        respondentId: assessmentSessions.respondentId,
        respondentEmail: respondentIdentities.email,
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
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        isNull(assessmentSessions.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);

  const sessionRow = sessionRows[0];

  if (!sessionRow) {
    return {
      ok: false as const,
      message: "Nie znaleziono sesji badania.",
    };
  }

  if (normalizeEmail(sessionRow.respondentEmail) !== email) {
    return {
      ok: false as const,
      message: "Ta sesja badania nie należy do zalogowanego użytkownika.",
    };
  }

  if (sessionRow.sessionStatus === "completed") {
    return {
        ok: false as const,
        message: "Ta sesja badania została już zakończona.",
    };
    }

  const projectQuestionnaire =
    await db.query.assessmentProjectQuestionnaires.findFirst({
      where: and(
        eq(assessmentProjectQuestionnaires.id, projectQuestionnaireId),
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          sessionRow.assessmentProjectId,
        ),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    });

  if (!projectQuestionnaire) {
    return {
      ok: false as const,
      message: "Nie znaleziono aktywnego kwestionariusza w tej sesji.",
    };
  }

  const itemRows = await controlDb
    .select({
      id: questionnaireItems.id,
      code: questionnaireItems.code,
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

      questionnaireId: questionnaires.id,
      questionnaireVersionId: questionnaireVersions.id,
      questionnaireName: questionnaires.name,
      questionnaireVersionName: questionnaireVersions.name,

      questionnairePageId: questionnairePages.id,
      pageId: questionnairePages.id,
      pageCode: questionnairePages.code,
      pageTitle: questionnairePages.title,
      pageDescription: questionnairePages.description,
      pageOrderIndex: questionnairePages.orderIndex,

      orderIndex: questionnaireItems.orderIndex,
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
    .leftJoin(
      questionnairePages,
      and(
        eq(questionnairePages.id, questionnaireItems.questionnairePageId),
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
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    )
    .orderBy(
      asc(questionnairePages.orderIndex),
      asc(questionnaireItems.orderIndex),
    );

  const responses = await db
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
        isNull(assessmentResponses.deletedAt),
      ),
    );

  const responseByItemId = new Map(
    responses.map((response) => [response.questionnaireItemId, response]),
  );

  const items = itemRows.map((item) => {
    const response = responseByItemId.get(item.id);

    return {
      ...item,
      questionnaireOrderIndex: projectQuestionnaire.orderIndex ?? 0,
      existingNumberValue: response?.numberValue ?? null,
      existingTextValue: response?.textValue ?? null,
      existingBooleanValue: response?.booleanValue ?? null,
      existingJsonValue: response?.jsonValue ?? null,
    };
  });

  return {
    ok: true as const,
    data: {
      tenantSlug,
      session: {
        id: sessionId,
      },
      questionnaire: {
        questionnaireId: projectQuestionnaire.questionnaireId,
        questionnaireVersionId: projectQuestionnaire.questionnaireVersionId,
        questionnaireName: items[0]?.questionnaireName ?? "Kwestionariusz",
        questionnaireVersionName:
          items[0]?.questionnaireVersionName ?? "Wersja",
      },
      items,
    },
  };
}