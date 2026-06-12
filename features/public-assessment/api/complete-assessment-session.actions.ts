// features/public-assessment/api/complete-assessment-session.actions.ts
"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { calculateAssessmentSessionScores } from "@/server/assessment/calculate-assessment-session-scores";
import {
  markAssessmentInvitationIndexSession,
} from "@/features/my-assessment/api/assessment-invitation-index.mutations";
import {
  assessmentInvitationIndex,
  questionnaireItems,
  tenantDatabaseConnections,
  tenants,
} from "@/drizzle/schema";
import {
  assessmentAccessLinks,
  assessmentProjectQuestionnaires,
  assessmentProjectRespondents,
  assessmentResponses,
  assessmentSessions,
  respondentIdentities,
  respondents,
  tenantAuditLog,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { hashAssessmentAccessToken } from "@/server/security/assessment-token";
import { decryptSecret } from "@/server/security/encryption";
import { createAssessmentResultSnapshot } from "./assessment-result-snapshot.mutations";
import { autoGrantReportAccessForCompletedSession } from "@/features/report-access/api/report-access-auto-grant.mutations";

export type CompleteAssessmentSessionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function isCurrentDesiredJsonValue(value: unknown) {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const raw = value as Record<string, unknown>;

  return (
    typeof raw.current === "boolean" &&
    typeof raw.desired === "boolean"
  );
}

function isResponseFilled(response: {
  valueType: string;
  numberValue: number | null;
  textValue: string | null;
  booleanValue: boolean | null;
  jsonValue: unknown | null;
}) {
  if (response.valueType === "number") {
    return response.numberValue !== null && response.numberValue !== undefined;
  }

  if (response.valueType === "text") {
    return typeof response.textValue === "string" && response.textValue.trim();
  }

  if (response.valueType === "boolean") {
    return typeof response.booleanValue === "boolean";
  }

  if (response.valueType === "json") {
    if (Array.isArray(response.jsonValue)) {
      return response.jsonValue.length > 0;
    }

    if (isCurrentDesiredJsonValue(response.jsonValue)) {
      return true;
    }

    return false;
  }

  return false;
}




function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

async function listActiveProjectQuestionnaires({
  db,
  assessmentProjectId,
}: {
  db: any;
  assessmentProjectId: string;
}) {
  return db
    .select({
      projectQuestionnaireId: assessmentProjectQuestionnaires.id,
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
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
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    );
}

async function listCompletedProjectQuestionnaireIdsFromIndex({
  tenantId,
  projectRespondentId,
}: {
  tenantId: string;
  projectRespondentId: string;
}) {
  const rows = await controlDb
    .select({
      tenantProjectQuestionnaireId:
        assessmentInvitationIndex.tenantProjectQuestionnaireId,
      status: assessmentInvitationIndex.status,
    })
    .from(assessmentInvitationIndex)
    .where(
      and(
        eq(assessmentInvitationIndex.tenantId, tenantId),
        eq(
          assessmentInvitationIndex.tenantProjectRespondentId,
          projectRespondentId,
        ),
        isNull(assessmentInvitationIndex.deletedAt),
      ),
    );

  return new Set(
    rows
      .filter((row: any) => row.status === "completed")
      .map((row: any) => row.tenantProjectQuestionnaireId),
  );
}

async function getTenantDbBySlug(tenantSlug: string) {
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

  const db = getTenantDbByConnection({
    tenantId: connection.tenantId,
    databaseName: connection.databaseName,
    schemaVersion: Number(connection.schemaVersion ?? 0),
    databaseUrl,
  });

  return {
    db,
    tenantId: connection.tenantId,
    tenantSlug: connection.tenantSlug,
    tenantName: connection.tenantName,
  };
}

async function resolveMyAssessmentSessionForCompletion({
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
      projectRespondentId: assessmentSessions.projectRespondentId,
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

  return {
    ok: true as const,
    db: tenant.db,
    tenantId: tenant.tenantId,
    tenantSlug: tenant.tenantSlug,
    tenantName: tenant.tenantName,
    actorUserId: authSession.user.id,
    actorEmail: authSession.user.email ?? null,
    session,
  };
}

export async function completeAssessmentSessionAction(
  _previousState: CompleteAssessmentSessionState,
  formData: FormData,
): Promise<CompleteAssessmentSessionState> {

  const token = String(formData.get("token") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const mode = String(formData.get("mode") ?? "token");
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const projectQuestionnaireId = String(
    formData.get("projectQuestionnaireId") ?? "",
  );
  if (!sessionId) {
    return {
      status: "error",
      message: "Brak danych sesji.",
    };
  }

  if (mode === "my-assessment") {
    let step = "start";

    try {
      if (!tenantSlug) {
        return {
          status: "error",
          message: "Brakuje tenanta badania.",
        };
      }

      if (!projectQuestionnaireId) {
        return {
          status: "error",
          message: "Brakuje identyfikatora kwestionariusza.",
        };
      }
      step = "resolve-session";
      const resolved = await resolveMyAssessmentSessionForCompletion({
        tenantSlug,
        sessionId,
      });

      if (!resolved.ok) {
        return {
          status: "error",
          message: resolved.message,
        };
      }

      const { db, session, actorUserId, actorEmail } = resolved;

      if (session.sessionStatus === "completed") {
        redirect(
          `/my/assessment/sessions/${sessionId}/completed?tenant=${tenantSlug}`,
        );
      }

      if (session.sessionStatus !== "in_progress") {
        return {
          status: "error",
          message: "Ta sesja nie jest aktywna.",
        };
      }
      step = "load-current-project-questionnaire";
      if (!projectQuestionnaireId) {
        return {
          status: "error",
          message: "Brakuje identyfikatora kwestionariusza.",
        };
      }

      const projectQuestionnaireRows = await db
        .select({
          projectQuestionnaireId: assessmentProjectQuestionnaires.id,
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
              session.assessmentProjectId,
            ),
            eq(assessmentProjectQuestionnaires.status, "active"),
            isNull(assessmentProjectQuestionnaires.deletedAt),
          ),
        )
        .limit(1);

      const currentProjectQuestionnaire = projectQuestionnaireRows[0] ?? null;

      if (!currentProjectQuestionnaire) {
        return {
          status: "error",
          message: "Nie znaleziono aktywnego kwestionariusza dla tej sesji.",
        };
      }
      step = "load-required-items";
      const requiredItems = await controlDb
        .select({
          id: questionnaireItems.id,
        })
        .from(questionnaireItems)
        .where(
          and(
            eq(
              questionnaireItems.questionnaireVersionId,
              currentProjectQuestionnaire.questionnaireVersionId,
            ),
            eq(questionnaireItems.required, true),
            isNull(questionnaireItems.deletedAt),
          ),
        );
      step = "load-responses";
      const responses = await db
        .select({
          questionnaireItemId: assessmentResponses.questionnaireItemId,
          valueType: assessmentResponses.valueType,
          numberValue: assessmentResponses.numberValue,
          textValue: assessmentResponses.textValue,
          booleanValue: assessmentResponses.booleanValue,
          jsonValue: assessmentResponses.jsonValue,
        })
        .from(assessmentResponses)
        .where(
          and(
            eq(assessmentResponses.assessmentSessionId, session.sessionId),
            isNull(assessmentResponses.deletedAt),
          ),
        );
      step = "validate-completeness";
      const filledResponseItemIds = new Set(
        responses
          .filter((response) => isResponseFilled(response))
          .map((response) => response.questionnaireItemId),
      );

      const missingRequiredCount = requiredItems.filter(
        (item) => !filledResponseItemIds.has(item.id),
      ).length;

      if (missingRequiredCount > 0) {
        return {
          status: "error",
          message: `Nie wszystkie wymagane pytania mają odpowiedzi. Brakuje: ${missingRequiredCount}.`,
        };
      }

      const now = new Date();
      step = "check-existing-invitation-index";

      const existingInvitationIndexRows = await controlDb
        .select({
          id: assessmentInvitationIndex.id,
        })
        .from(assessmentInvitationIndex)
        .where(
          and(
            eq(assessmentInvitationIndex.tenantId, resolved.tenantId),
            eq(
              assessmentInvitationIndex.tenantProjectRespondentId,
              session.projectRespondentId,
            ),
            eq(
              assessmentInvitationIndex.tenantProjectQuestionnaireId,
              currentProjectQuestionnaire.projectQuestionnaireId,
            ),
            isNull(assessmentInvitationIndex.deletedAt),
          ),
        )
        .limit(1);

      const hasExistingInvitationIndex = existingInvitationIndexRows.length > 0;

      if (hasExistingInvitationIndex) {
        step = "mark-current-questionnaire-completed";

        await markAssessmentInvitationIndexSession({
          tenantId: resolved.tenantId,
          tenantProjectRespondentId: session.projectRespondentId,
          tenantProjectQuestionnaireId:
            currentProjectQuestionnaire.projectQuestionnaireId,
          tenantSessionId: session.sessionId,
          status: "completed",
          userId: actorUserId,
        });
      }

      step = "update-assessment-session";
      /**
       * Na tym etapie kończymy całą assessment_session, bo w aktualnym modelu
       * sesja zawiera odpowiedzi dla jednego wypełnianego kwestionariusza.
       *
       * Nie oznaczamy automatycznie wszystkich projectQuestionnaires jako completed.
       * Nie używamy listy wszystkich aktywnych przypisań projektu.
       */
      await db
        .update(assessmentSessions)
        .set({
          status: "completed",
          completedAt: now,
          updatedAt: now,
          updatedBy: actorUserId,
        })
        .where(eq(assessmentSessions.id, session.sessionId));

      /**
       * ProjectRespondent oznacz jako completed tylko dlatego, że obecny model
       * nie ma jeszcze osobnego statusu per respondent + questionnaire.
       * Docelowo ten status powinien oznaczać ukończenie całego pakietu.
       */
      step = "update-project-respondent";
      await db
        .update(assessmentProjectRespondents)
        .set({
          status: "completed",
          completedAt: now,
          updatedAt: now,
          updatedBy: actorUserId,
        })
        .where(eq(assessmentProjectRespondents.id, session.projectRespondentId));

      step = "calculate-scores";
      const scoringResult = await calculateAssessmentSessionScores({
        db,
        sessionId: session.sessionId,
      });
      step = "create-result-snapshot";
await createAssessmentResultSnapshot({
  db,
  tenantSlug,
  sessionId: session.sessionId,
  actorUserId,
  projectQuestionnaireId: currentProjectQuestionnaire.projectQuestionnaireId,
  questionnaireVersionId: currentProjectQuestionnaire.questionnaireVersionId,
});
/*       step = "auto-grant-report-access";
      const autoGrantResult = await safeAutoGrantReportAccessForCompletedSession({
        db,
        tenantSlug,
        sessionId: session.sessionId,
        actorUserId,
        actorEmail,
        projectQuestionnaireId: currentProjectQuestionnaire.projectQuestionnaireId,
        questionnaireVersionId: currentProjectQuestionnaire.questionnaireVersionId,
      }); */
      const reportAccessGrantResult = {
  granted: false,
  mode: "manual_partner_grant_required",
  message:
    "Dostęp do raportu nie jest nadawany automatycznie. Może go nadać partner po zakończeniu sesji.",
};

      step = "insert-audit-log";
      await db.insert(tenantAuditLog).values({
        actorUserId,
        actorRole: "RESPONDENT",
        action: "assessment_session_completed",
        entityType: "assessment_session",
        entityId: session.sessionId,
        after: {
          completedAt: now.toISOString(),
          scoring: scoringResult,
          reportAccessGrant: reportAccessGrantResult,
          mode: "my-assessment",
          projectQuestionnaireId:
            currentProjectQuestionnaire.projectQuestionnaireId,
          questionnaireVersionId:
            currentProjectQuestionnaire.questionnaireVersionId,
        },
      });

      redirect(
        `/my/assessment/sessions/${sessionId}/completed?tenant=${tenantSlug}`,
      );
    } catch (error) {
      if (isRedirectError(error)) {
        throw error;
      }

      console.error("[completeAssessmentSessionAction:my-assessment]", {
        tenantSlug,
        sessionId,
        projectQuestionnaireId,
        error,
      });

      return {
        status: "error",
        message:
          error instanceof Error
            ? `Nie udało się zakończyć badania na kroku "${step}": ${error.message}`
            : `Nie udało się zakończyć badania na kroku "${step}".`,
      };
    }
  }

  if (!token) {
    return {
      status: "error",
      message: "Brak tokena sesji.",
    };
  }

  const tokenHash = hashAssessmentAccessToken(token);

  const activeTenantConnections = await controlDb
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
    assessmentProjectId: assessmentSessions.assessmentProjectId,
    projectRespondentId: assessmentSessions.projectRespondentId,
    accessLinkId: assessmentAccessLinks.id,
    respondentEmail: respondentIdentities.email,
  })
      .from(assessmentSessions)
      .innerJoin(
        assessmentAccessLinks,
        eq(assessmentAccessLinks.id, assessmentSessions.accessLinkId),
      )
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
          eq(assessmentAccessLinks.tokenHash, tokenHash),
          eq(assessmentAccessLinks.status, "active"),
          isNull(assessmentSessions.deletedAt),
          isNull(assessmentAccessLinks.deletedAt),
          isNull(respondents.deletedAt),
          isNull(respondentIdentities.deletedAt),
        ),
      )
      .limit(1);

    const session = sessionRows[0];

    if (!session) {
      continue;
    }

    if (session.sessionStatus === "completed") {
      redirect(`/a/${token}/session/${sessionId}/completed`);
    }

    if (session.sessionStatus !== "in_progress") {
      return {
        status: "error",
        message: "Ta sesja nie jest aktywna.",
      };
    }
const activeProjectQuestionnaires = await listActiveProjectQuestionnaires({
  db,
  assessmentProjectId: session.assessmentProjectId,
});

if (activeProjectQuestionnaires.length === 0) {
  return {
    status: "error",
    message: "Ten projekt nie ma aktywnych kwestionariuszy.",
  };
}

/**
 * TRYB 1:
 * Kończymy jeden konkretny kwestionariusz.
 * Nie kończymy jeszcze całej assessment_session.
 */
if (projectQuestionnaireId) {
  const currentProjectQuestionnaire =
    activeProjectQuestionnaires.find(
      (row: any) => row.projectQuestionnaireId === projectQuestionnaireId,
    ) ?? null;

  if (!currentProjectQuestionnaire) {
    return {
      status: "error",
      message: "Nie znaleziono aktywnego kwestionariusza dla tej sesji.",
    };
  }

  const requiredItems = await controlDb
    .select({
      id: questionnaireItems.id,
    })
    .from(questionnaireItems)
    .where(
      and(
        eq(
          questionnaireItems.questionnaireVersionId,
          currentProjectQuestionnaire.questionnaireVersionId,
        ),
        eq(questionnaireItems.required, true),
        isNull(questionnaireItems.deletedAt),
      ),
    );

  const responses = await db
    .select({
      questionnaireItemId: assessmentResponses.questionnaireItemId,
      valueType: assessmentResponses.valueType,
      numberValue: assessmentResponses.numberValue,
      textValue: assessmentResponses.textValue,
      booleanValue: assessmentResponses.booleanValue,
      jsonValue: assessmentResponses.jsonValue,
    })
    .from(assessmentResponses)
    .where(
      and(
        eq(assessmentResponses.assessmentSessionId, session.sessionId),
        eq(
          assessmentResponses.questionnaireVersionId,
          currentProjectQuestionnaire.questionnaireVersionId,
        ),
        isNull(assessmentResponses.deletedAt),
      ),
    );

  const filledResponseItemIds = new Set(
    responses
      .filter((response) => isResponseFilled(response))
      .map((response) => response.questionnaireItemId),
  );

  const missingRequiredCount = requiredItems.filter(
    (item) => !filledResponseItemIds.has(item.id),
  ).length;

  if (missingRequiredCount > 0) {
    return {
      status: "error",
      message: `Nie wszystkie wymagane pytania mają odpowiedzi. Brakuje: ${missingRequiredCount}.`,
    };
  }

  const now = new Date();

  await db
    .update(assessmentSessions)
    .set({
      status: "in_progress",
      updatedAt: now,
    })
    .where(eq(assessmentSessions.id, session.sessionId));

  await db
    .update(assessmentProjectRespondents)
    .set({
      status: "started",
      startedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentProjectRespondents.id, session.projectRespondentId));

  const scoringResult = await calculateAssessmentSessionScores({
    db,
    sessionId: session.sessionId,
  });

  const snapshot = await createAssessmentResultSnapshot({
    db,
    tenantSlug: connection.tenantSlug,
    sessionId: session.sessionId,
    actorUserId: null,
    projectQuestionnaireId:
      currentProjectQuestionnaire.projectQuestionnaireId,
    questionnaireVersionId:
      currentProjectQuestionnaire.questionnaireVersionId,
  });

  await markAssessmentInvitationIndexSession({
    tenantId: connection.tenantId,
    tenantProjectRespondentId: session.projectRespondentId,
    tenantProjectQuestionnaireId:
      currentProjectQuestionnaire.projectQuestionnaireId,
    tenantSessionId: session.sessionId,
    status: "completed",
    userId: null,
  });

  const completedProjectQuestionnaireIds =
    await listCompletedProjectQuestionnaireIdsFromIndex({
      tenantId: connection.tenantId,
      projectRespondentId: session.projectRespondentId,
    });

  completedProjectQuestionnaireIds.add(
    currentProjectQuestionnaire.projectQuestionnaireId,
  );

  const allQuestionnairesCompleted = activeProjectQuestionnaires.every((row: any) =>
    completedProjectQuestionnaireIds.has(row.projectQuestionnaireId),
  );

  await db.insert(tenantAuditLog).values({
    actorUserId: null,
    actorRole: "PUBLIC_RESPONDENT",
    action: "assessment_questionnaire_completed",
    entityType: "assessment_session",
    entityId: session.sessionId,
    after: {
      completedAt: now.toISOString(),
      scoring: scoringResult,
      mode: "token",
      projectQuestionnaireId:
        currentProjectQuestionnaire.projectQuestionnaireId,
      questionnaireVersionId:
        currentProjectQuestionnaire.questionnaireVersionId,
      snapshot,
      allQuestionnairesCompleted,
    },
  });

  if (!allQuestionnairesCompleted) {
    redirect(`/a/${token}/session/${sessionId}`);
  }

  await db
    .update(assessmentSessions)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentSessions.id, session.sessionId));

  await db
    .update(assessmentProjectRespondents)
    .set({
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(assessmentProjectRespondents.id, session.projectRespondentId));

  await db.insert(tenantAuditLog).values({
    actorUserId: null,
    actorRole: "PUBLIC_RESPONDENT",
    action: "assessment_session_completed",
    entityType: "assessment_session",
    entityId: session.sessionId,
    after: {
      completedAt: now.toISOString(),
      mode: "token",
      reason: "all_project_questionnaires_completed",
      projectQuestionnaireIds: activeProjectQuestionnaires.map(
        (row: any) => row.projectQuestionnaireId,
      ),
    },
  });

  redirect(`/a/${token}/session/${sessionId}/completed`);
}

/**
 * TRYB 2:
 * Próba zakończenia całej sesji z overview.
 * Wolno to zrobić tylko wtedy, gdy wszystkie kwestionariusze są completed
 * w assessmentInvitationIndex.
 */
const completedProjectQuestionnaireIds =
  await listCompletedProjectQuestionnaireIdsFromIndex({
    tenantId: connection.tenantId,
    projectRespondentId: session.projectRespondentId,
  });

const missingProjectQuestionnaires = activeProjectQuestionnaires.filter(
  (row: any) => !completedProjectQuestionnaireIds.has(row.projectQuestionnaireId),
);

if (missingProjectQuestionnaires.length > 0) {
  return {
    status: "error",
    message: `Nie można jeszcze zakończyć całego badania. Pozostałe niewypełnione części: ${missingProjectQuestionnaires.length}.`,
  };
}

const now = new Date();

await db
  .update(assessmentSessions)
  .set({
    status: "completed",
    completedAt: now,
    updatedAt: now,
  })
  .where(eq(assessmentSessions.id, session.sessionId));

await db
  .update(assessmentProjectRespondents)
  .set({
    status: "completed",
    completedAt: now,
    updatedAt: now,
  })
  .where(eq(assessmentProjectRespondents.id, session.projectRespondentId));

await db.insert(tenantAuditLog).values({
  actorUserId: null,
  actorRole: "PUBLIC_RESPONDENT",
  action: "assessment_session_completed",
  entityType: "assessment_session",
  entityId: session.sessionId,
  after: {
    completedAt: now.toISOString(),
    mode: "token",
    reason: "manual_finish_from_overview",
    projectQuestionnaireIds: activeProjectQuestionnaires.map(
      (row: any) => row.projectQuestionnaireId,
    ),
  },
});

redirect(`/a/${token}/session/${sessionId}/completed`);
  }

  return {
    status: "error",
    message: "Nie znaleziono aktywnej sesji badania.",
  };
}


async function safeAutoGrantReportAccessForCompletedSession(input: {
  db: any;
  tenantSlug: string;
  sessionId: string;
  actorUserId: string | null;
  actorEmail?: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  try {
    return await autoGrantReportAccessForCompletedSession(input);
  } catch (error) {
    console.error("AUTO_GRANT_REPORT_ACCESS_ERROR", error);

    return {
      ok: false as const,
      granted: false as const,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się automatycznie nadać dostępu do raportu.",
    };
  }
}