import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import {
  assessmentInvitationIndex,
  questionnaireItems,
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";

import {
  assessmentProjectQuestionnaires,
  assessmentProjectRespondents,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";
import { getMyAssessmentTenantDbBySlug } from "@/features/my-assessment/api/my-assessment-tenant-db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

function asJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function isResponseFilled(response: {
  valueType: string | null;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
}) {
  if (response.valueType === "number") {
    return response.numberValue !== null && response.numberValue !== undefined;
  }

  if (response.valueType === "text") {
    return typeof response.textValue === "string" && response.textValue.trim() !== "";
  }

  if (response.valueType === "boolean") {
    return typeof response.booleanValue === "boolean";
  }

  if (response.valueType === "json") {
    return asJsonArray(response.jsonValue).length > 0;
  }

  return false;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function shortList<T>(values: T[], limit = 30) {
  return {
    count: values.length,
    sample: values.slice(0, limit),
    truncated: values.length > limit,
  };
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

export async function GET(request: NextRequest) {
  let step = "init";

  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          ok: false,
          message: "Endpoint diagnostyczny jest wyłączony na produkcji.",
        },
        { status: 404 },
      );
    }

    step = "read-search-params";

    const searchParams = request.nextUrl.searchParams;

    const tenantSlug = searchParams.get("tenant") ?? "humanet";
    const sessionId = searchParams.get("sessionId") ?? "";
    const projectQuestionnaireId =
      searchParams.get("projectQuestionnaireId") ?? "";

    if (!sessionId || !projectQuestionnaireId) {
      return NextResponse.json(
        {
          ok: false,
          step,
          message:
            "Brakuje sessionId albo projectQuestionnaireId. Użyj: /api/dev/my-assessment-session-diagnostics?tenant=humanet&sessionId=...&projectQuestionnaireId=...",
          input: {
            tenantSlug,
            sessionId,
            projectQuestionnaireId,
          },
        },
        { status: 400 },
      );
    }

    step = "require-session";

    const authSession = await requireSession();
    const currentUserEmail = normalizeEmail(authSession.user.email);

    step = "resolve-tenant-db";

    const tenant = await getMyAssessmentTenantDbBySlug(tenantSlug);

    if (!tenant) {
      return NextResponse.json(
        {
          ok: false,
          step,
          message: "Nie znaleziono aktywnego tenanta.",
          input: {
            tenantSlug,
            sessionId,
            projectQuestionnaireId,
          },
        },
        { status: 404 },
      );
    }

    const db = tenant.db;

    step = "load-session";

    const sessionRows = await db
      .select({
        sessionId: assessmentSessions.id,
        sessionStatus: assessmentSessions.status,
        assessmentProjectId: assessmentSessions.assessmentProjectId,
        projectRespondentId: assessmentSessions.projectRespondentId,
        respondentId: assessmentSessions.respondentId,
        accessLinkId: assessmentSessions.accessLinkId,
        startedAt: assessmentSessions.startedAt,
        completedAt: assessmentSessions.completedAt,
        cancelledAt: assessmentSessions.cancelledAt,
        respondentArchivedAt: assessmentSessions.respondentArchivedAt,
        deletedAt: assessmentSessions.deletedAt,
        createdAt: assessmentSessions.createdAt,
        updatedAt: assessmentSessions.updatedAt,
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
      .where(eq(assessmentSessions.id, sessionId))
      .limit(1);

    const session = sessionRows[0] ?? null;

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          step,
          message: "Nie znaleziono sesji w tenant DB.",
          input: {
            tenantSlug,
            sessionId,
            projectQuestionnaireId,
          },
        },
        { status: 404 },
      );
    }

    step = "load-project-respondent";

    const projectRespondentRows = session.projectRespondentId
      ? await db
        .select({
          id: assessmentProjectRespondents.id,
          assessmentProjectId:
            assessmentProjectRespondents.assessmentProjectId,
          respondentId: assessmentProjectRespondents.respondentId,
          status: assessmentProjectRespondents.status,
          invitedAt: assessmentProjectRespondents.invitedAt,
          startedAt: assessmentProjectRespondents.startedAt,
          completedAt: assessmentProjectRespondents.completedAt,
          deletedAt: assessmentProjectRespondents.deletedAt,
          createdAt: assessmentProjectRespondents.createdAt,
          updatedAt: assessmentProjectRespondents.updatedAt,
        })
        .from(assessmentProjectRespondents)
        .where(
          eq(
            assessmentProjectRespondents.id,
            session.projectRespondentId,
          ),
        )
        .limit(1)
      : [];

    const projectRespondent = projectRespondentRows[0] ?? null;

    step = "load-project-questionnaires";

    const activeProjectQuestionnaires = await db
      .select({
        projectQuestionnaireId: assessmentProjectQuestionnaires.id,
        assessmentProjectId: assessmentProjectQuestionnaires.assessmentProjectId,
        questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
        status: assessmentProjectQuestionnaires.status,
        orderIndex: assessmentProjectQuestionnaires.orderIndex,
        deletedAt: assessmentProjectQuestionnaires.deletedAt,
        createdAt: assessmentProjectQuestionnaires.createdAt,
        updatedAt: assessmentProjectQuestionnaires.updatedAt,
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
      )
      .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

    const currentProjectQuestionnaire =
      activeProjectQuestionnaires.find(
        (item) => item.projectQuestionnaireId === projectQuestionnaireId,
      ) ?? null;

    const allProjectQuestionnaireVersionIds = unique(
      activeProjectQuestionnaires.map((item) => item.questionnaireVersionId),
    );

    const currentQuestionnaireVersionId =
      currentProjectQuestionnaire?.questionnaireVersionId ?? null;

    step = "load-questionnaire-versions-control-db";

    const questionnaireVersionRows =
      allProjectQuestionnaireVersionIds.length > 0
        ? await controlDb
          .select({
            questionnaireId: questionnaires.id,
            questionnaireCode: questionnaires.code,
            questionnaireName: questionnaires.name,
            questionnaireDescription: questionnaires.description,
            questionnaireStatus: questionnaires.status,
            questionnaireDeletedAt: questionnaires.deletedAt,

            questionnaireVersionId: questionnaireVersions.id,
            questionnaireVersionName: questionnaireVersions.name,
            questionnaireVersion: questionnaireVersions.version,
            questionnaireVersionStatus: questionnaireVersions.status,
            questionnaireVersionIsPublic: questionnaireVersions.isPublic,
            questionnaireVersionDeletedAt: questionnaireVersions.deletedAt,
          })
          .from(questionnaireVersions)
          .innerJoin(
            questionnaires,
            eq(questionnaires.id, questionnaireVersions.questionnaireId),
          )
          .where(
            inArray(
              questionnaireVersions.id,
              allProjectQuestionnaireVersionIds,
            ),
          )
        : [];

    const currentQuestionnaireVersion =
      questionnaireVersionRows.find(
        (row) =>
          row.questionnaireVersionId === currentQuestionnaireVersionId,
      ) ?? null;

    step = "load-current-version-items";

    const currentVersionItems = currentQuestionnaireVersionId
      ? await controlDb
        .select({
          itemId: questionnaireItems.id,
          questionnaireVersionId: questionnaireItems.questionnaireVersionId,
          code: questionnaireItems.code,
          type: questionnaireItems.type,
          text: questionnaireItems.text,
          required: questionnaireItems.required,
          orderIndex: questionnaireItems.orderIndex,
          deletedAt: questionnaireItems.deletedAt,
          createdAt: questionnaireItems.createdAt,
          updatedAt: questionnaireItems.updatedAt,
        })
        .from(questionnaireItems)
        .where(
          and(
            eq(
              questionnaireItems.questionnaireVersionId,
              currentQuestionnaireVersionId,
            ),
            isNull(questionnaireItems.deletedAt),
          ),
        )
        .orderBy(asc(questionnaireItems.orderIndex))
      : [];

    const currentVersionItemIds = new Set(
      currentVersionItems.map((item) => item.itemId),
    );

    const currentVersionRequiredItems = currentVersionItems.filter(
      (item) => item.required === true,
    );

    step = "load-all-active-project-items";

    const allActiveProjectItems =
      allProjectQuestionnaireVersionIds.length > 0
        ? await controlDb
          .select({
            itemId: questionnaireItems.id,
            questionnaireVersionId: questionnaireItems.questionnaireVersionId,
            code: questionnaireItems.code,
            type: questionnaireItems.type,
            required: questionnaireItems.required,
            deletedAt: questionnaireItems.deletedAt,
          })
          .from(questionnaireItems)
          .where(
            and(
              inArray(
                questionnaireItems.questionnaireVersionId,
                allProjectQuestionnaireVersionIds,
              ),
              isNull(questionnaireItems.deletedAt),
            ),
          )
        : [];

    const allActiveProjectItemIds = new Set(
      allActiveProjectItems.map((item) => item.itemId),
    );

    step = "load-responses";

    const responses = await db
      .select({
        assessmentSessionId: assessmentResponses.assessmentSessionId,
        questionnaireId: assessmentResponses.questionnaireId,
        questionnaireVersionId: assessmentResponses.questionnaireVersionId,
        questionnaireItemId: assessmentResponses.questionnaireItemId,
        itemCode: assessmentResponses.itemCode,
        valueType: assessmentResponses.valueType,
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

    const filledResponses = responses.filter(isResponseFilled);

    const filledResponseItemIds = new Set(
      filledResponses.map((response) => response.questionnaireItemId),
    );

    const responsesForCurrentVersion = responses.filter((response) =>
      currentVersionItemIds.has(response.questionnaireItemId),
    );

    const filledResponsesForCurrentVersion =
      responsesForCurrentVersion.filter(isResponseFilled);

    const responsesOutsideCurrentVersion = responses.filter(
      (response) => !currentVersionItemIds.has(response.questionnaireItemId),
    );

    const responsesOutsideAllActiveProjectVersions = responses.filter(
      (response) =>
        !allActiveProjectItemIds.has(response.questionnaireItemId),
    );

    const requiredMissingForCurrentVersion =
      currentVersionRequiredItems.filter(
        (item) => !filledResponseItemIds.has(item.itemId),
      );

    const responseVersionIdsDeclaredOnRows = unique(
      responses
        .map((response) => response.questionnaireVersionId)
        .filter((value): value is string => Boolean(value)),
    );

    const responseCountByDeclaredVersionId = responses.reduce<
      Record<string, { total: number; filled: number }>
    >((acc, response) => {
      const key = response.questionnaireVersionId ?? "__NULL__";

      acc[key] ??= {
        total: 0,
        filled: 0,
      };

      acc[key].total += 1;

      if (isResponseFilled(response)) {
        acc[key].filled += 1;
      }

      return acc;
    }, {});

    step = "load-invitation-index";

    const indexRows = session.projectRespondentId
      ? await controlDb
        .select({
          id: assessmentInvitationIndex.id,
          tenantId: assessmentInvitationIndex.tenantId,
          tenantSlug: assessmentInvitationIndex.tenantSlug,
          tenantProjectRespondentId:
            assessmentInvitationIndex.tenantProjectRespondentId,
          tenantProjectQuestionnaireId:
            assessmentInvitationIndex.tenantProjectQuestionnaireId,
          tenantSessionId: assessmentInvitationIndex.tenantSessionId,
          questionnaireId: assessmentInvitationIndex.questionnaireId,
          questionnaireVersionId:
            assessmentInvitationIndex.questionnaireVersionId,
          status: assessmentInvitationIndex.status,
          userId: assessmentInvitationIndex.userId,
          startedAt: assessmentInvitationIndex.startedAt,
          completedAt: assessmentInvitationIndex.completedAt,
          deletedAt: assessmentInvitationIndex.deletedAt,
          lastSyncedAt: assessmentInvitationIndex.lastSyncedAt,
          createdAt: assessmentInvitationIndex.createdAt,
          updatedAt: assessmentInvitationIndex.updatedAt,
        })
        .from(assessmentInvitationIndex)
        .where(
          and(
            eq(assessmentInvitationIndex.tenantSlug, tenant.tenantSlug),
            eq(
              assessmentInvitationIndex.tenantProjectRespondentId,
              session.projectRespondentId,
            ),
          ),
        )
      : [];

    const currentIndexRow =
      indexRows.find(
        (row) =>
          row.tenantProjectQuestionnaireId === projectQuestionnaireId,
      ) ?? null;

    step = "build-diagnosis";

    const problems: string[] = [];
    const likelyCauses: string[] = [];
    const recommendedNextChecks: string[] = [];

    const ownership = {
      currentUserEmail,
      respondentEmail: normalizeEmail(session.respondentEmail),
      matches: currentUserEmail === normalizeEmail(session.respondentEmail),
    };

    if (!ownership.matches) {
      problems.push("OWNERSHIP_MISMATCH");
      likelyCauses.push(
        "Sesja należy do innego adresu e-mail niż aktualnie zalogowany użytkownik.",
      );
    }

    if (session.sessionStatus !== "in_progress") {
      problems.push("SESSION_NOT_IN_PROGRESS");
      likelyCauses.push(
        `Sesja ma status '${session.sessionStatus}', a akcja zakończenia oczekuje 'in_progress'.`,
      );
    }

    if (session.completedAt) {
      problems.push("SESSION_ALREADY_HAS_COMPLETED_AT");
    }

    if (session.cancelledAt) {
      problems.push("SESSION_CANCELLED");
    }

    if (session.respondentArchivedAt) {
      problems.push("SESSION_ARCHIVED_BY_RESPONDENT");
    }

    if (session.deletedAt) {
      problems.push("SESSION_DELETED");
    }

    if (!projectRespondent) {
      problems.push("PROJECT_RESPONDENT_NOT_FOUND");
    } else if (projectRespondent.deletedAt) {
      problems.push("PROJECT_RESPONDENT_DELETED");
    }

    if (!currentProjectQuestionnaire) {
      problems.push("PROJECT_QUESTIONNAIRE_NOT_ACTIVE_OR_NOT_IN_THIS_PROJECT");
      likelyCauses.push(
        "projectQuestionnaireId z URL-a nie wskazuje na aktywny kwestionariusz tego projektu.",
      );
    }

    if (activeProjectQuestionnaires.length > 1) {
      problems.push("MULTIPLE_ACTIVE_PROJECT_QUESTIONNAIRES");
      likelyCauses.push(
        "Projekt ma więcej niż jeden aktywny kwestionariusz; akcja zakończenia musi kończyć konkretny projectQuestionnaireId, nie cały projekt naraz.",
      );
    }

    if (!currentQuestionnaireVersion) {
      problems.push("CURRENT_QUESTIONNAIRE_VERSION_NOT_FOUND_IN_CONTROL_DB");
      likelyCauses.push(
        "assessment_project_questionnaires.questionnaire_version_id wskazuje na wersję, której nie znaleziono w control DB.",
      );
    } else {
      if (currentQuestionnaireVersion.questionnaireVersionDeletedAt) {
        problems.push("CURRENT_QUESTIONNAIRE_VERSION_DELETED");
      }

      if (currentQuestionnaireVersion.questionnaireVersionStatus !== "active") {
        problems.push("CURRENT_QUESTIONNAIRE_VERSION_NOT_ACTIVE");
        likelyCauses.push(
          `Aktualna wersja kwestionariusza ma status '${currentQuestionnaireVersion.questionnaireVersionStatus}'.`,
        );
      }

      if (currentQuestionnaireVersion.questionnaireDeletedAt) {
        problems.push("QUESTIONNAIRE_DELETED");
      }

      if (currentQuestionnaireVersion.questionnaireStatus !== "active") {
        problems.push("QUESTIONNAIRE_NOT_ACTIVE");
      }
    }

    if (currentVersionItems.length === 0) {
      problems.push("CURRENT_VERSION_HAS_NO_ACTIVE_ITEMS");
    }

    if (requiredMissingForCurrentVersion.length > 0) {
      problems.push("MISSING_REQUIRED_ITEMS_FOR_CURRENT_VERSION");
      likelyCauses.push(
        "Aktualna wersja kwestionariusza ma wymagane itemy, które nie mają wypełnionych odpowiedzi w tej sesji.",
      );
      recommendedNextChecks.push(
        "Sprawdź, czy brakujące itemy mają takie same code jak odpowiedzi zapisane na starej wersji.",
      );
    }

    if (
      responsesOutsideCurrentVersion.length > 0 &&
      responsesForCurrentVersion.length === 0
    ) {
      problems.push("RESPONSES_POINT_TO_OLD_VERSION_ITEMS");
      likelyCauses.push(
        "Odpowiedzi istnieją, ale ich questionnaire_item_id nie należy do aktualnej wersji kwestionariusza. To pasuje do scenariusza: zmiana/publikacja wersji w trakcie badania.",
      );
      recommendedNextChecks.push(
        "Najbezpieczniejsza naprawa: dla rozpoczętych sesji zamrażać questionnaireVersionId; dla tej sesji przepiąć wersję albo migrować odpowiedzi po stabilnym code.",
      );
    }

    if (
      responseVersionIdsDeclaredOnRows.length > 0 &&
      currentQuestionnaireVersionId &&
      !responseVersionIdsDeclaredOnRows.includes(
        currentQuestionnaireVersionId,
      )
    ) {
      problems.push("RESPONSE_VERSION_ID_DIFFERS_FROM_CURRENT_PROJECT_VERSION");
      likelyCauses.push(
        "assessment_responses.questionnaire_version_id różni się od aktualnego assessment_project_questionnaires.questionnaire_version_id.",
      );
    }

    if (
      currentIndexRow?.questionnaireVersionId &&
      currentQuestionnaireVersionId &&
      currentIndexRow.questionnaireVersionId !== currentQuestionnaireVersionId
    ) {
      problems.push("INVITATION_INDEX_VERSION_DIFFERS_FROM_PROJECT_QUESTIONNAIRE");
      likelyCauses.push(
        "assessment_invitation_index ma inną questionnaire_version_id niż aktywne przypisanie kwestionariusza w tenant DB.",
      );
    }

    if (
      currentIndexRow?.tenantSessionId &&
      currentIndexRow.tenantSessionId !== sessionId
    ) {
      problems.push("INVITATION_INDEX_POINTS_TO_DIFFERENT_SESSION");
    }

    const completionWouldPassCurrentQuestionnaireOnly =
      ownership.matches &&
      session.sessionStatus === "in_progress" &&
      Boolean(currentProjectQuestionnaire) &&
      Boolean(currentQuestionnaireVersion) &&
      requiredMissingForCurrentVersion.length === 0;

    return NextResponse.json({
      ok: true,
      input: {
        tenantSlug: tenant.tenantSlug,
        sessionId,
        projectQuestionnaireId,
      },
      summary: {
        completionWouldPassCurrentQuestionnaireOnly,
        problems,
        likelyCauses,
        recommendedNextChecks,
      },
      ownership,
      session,
      projectRespondent,
      projectQuestionnaires: {
        activeCount: activeProjectQuestionnaires.length,
        currentProjectQuestionnaire,
        activeProjectQuestionnaires,
      },
      questionnaireVersions: {
        currentQuestionnaireVersionId,
        currentQuestionnaireVersion,
        allProjectQuestionnaireVersionIds,
        rows: questionnaireVersionRows,
      },
      items: {
        currentVersionItemCount: currentVersionItems.length,
        currentVersionRequiredItemCount: currentVersionRequiredItems.length,
        currentVersionRequiredMissingCount:
          requiredMissingForCurrentVersion.length,
        currentVersionRequiredMissing: shortList(
          requiredMissingForCurrentVersion.map((item) => ({
            itemId: item.itemId,
            questionnaireVersionId: item.questionnaireVersionId,
            code: item.code,
            type: item.type,
            text: item.text,
            orderIndex: item.orderIndex,
          })),
        ),
      },
      responses: {
        total: responses.length,
        filled: filledResponses.length,
        responseVersionIdsDeclaredOnRows,
        responseCountByDeclaredVersionId,
        currentVersion: {
          total: responsesForCurrentVersion.length,
          filled: filledResponsesForCurrentVersion.length,
        },
        outsideCurrentVersion: {
          total: responsesOutsideCurrentVersion.length,
          filled:
            responsesOutsideCurrentVersion.filter(isResponseFilled).length,
          sample: responsesOutsideCurrentVersion.slice(0, 30).map((row) => ({
            assessmentSessionId: row.assessmentSessionId,
            questionnaireId: row.questionnaireId,
            questionnaireVersionId: row.questionnaireVersionId,
            questionnaireItemId: row.questionnaireItemId,
            itemCode: row.itemCode,
            valueType: row.valueType,
            filled: isResponseFilled(row),
          }))
        },
        outsideAllActiveProjectVersions: {
          total: responsesOutsideAllActiveProjectVersions.length,
          filled:
            responsesOutsideAllActiveProjectVersions.filter(isResponseFilled)
              .length,
          sample: responsesOutsideAllActiveProjectVersions
            .slice(0, 30)
            .map((row) => ({
              assessmentSessionId: row.assessmentSessionId,
              questionnaireId: row.questionnaireId,
              questionnaireVersionId: row.questionnaireVersionId,
              questionnaireItemId: row.questionnaireItemId,
              itemCode: row.itemCode,
              valueType: row.valueType,
              filled: isResponseFilled(row),
            }))
        },
      },
      invitationIndex: {
        currentIndexRow,
        rowsForProjectRespondent: indexRows,
      },
    });
  } catch (error) {
    console.error("[my-assessment-session-diagnostics]", {
      step,
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        step,
        error: serializeError(error),
      },
      { status: 500 },
    );
  }
}