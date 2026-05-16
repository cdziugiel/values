// features/public-assessment/api/complete-assessment-session.actions.ts
"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { calculateAssessmentSessionScores } from "@/server/assessment/calculate-assessment-session-scores";
import { markAssessmentInvitationIndexSession } from "@/features/my-assessment/api/assessment-invitation-index.mutations";
import {
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
    return Array.isArray(response.jsonValue) && response.jsonValue.length > 0;
  }

  return false;
}

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

  if (!sessionId) {
    return {
      status: "error",
      message: "Brak danych sesji.",
    };
  }

  if (mode === "my-assessment") {
    if (!tenantSlug) {
      return {
        status: "error",
        message: "Brakuje tenanta badania.",
      };
    }

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
      redirect(`/my/assessment/sessions/${sessionId}/completed?tenant=${tenantSlug}`);
    }

    if (session.sessionStatus !== "in_progress") {
      return {
        status: "error",
        message: "Ta sesja nie jest aktywna.",
      };
    }

    const projectQuestionnaires = await db
      .select({
        projectQuestionnaireId: assessmentProjectQuestionnaires.id,
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
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
      );

    const questionnaireVersionIds = projectQuestionnaires.map(
      (item) => item.questionnaireVersionId,
    );

    if (questionnaireVersionIds.length === 0) {
      return {
        status: "error",
        message: "Projekt nie ma przypisanych aktywnych kwestionariuszy.",
      };
    }

    const requiredItems = await controlDb
      .select({
        id: questionnaireItems.id,
      })
      .from(questionnaireItems)
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
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
        status: "completed",
        completedAt: now,
        updatedAt: now,
        updatedBy: actorUserId,
      })
      .where(eq(assessmentSessions.id, session.sessionId));

    await db
      .update(assessmentProjectRespondents)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
        updatedBy: actorUserId,
      })
      .where(eq(assessmentProjectRespondents.id, session.projectRespondentId));
    for (const projectQuestionnaire of projectQuestionnaires) {
      await markAssessmentInvitationIndexSession({
        tenantId: resolved.tenantId,
        tenantProjectRespondentId: session.projectRespondentId,
        tenantProjectQuestionnaireId: projectQuestionnaire.projectQuestionnaireId,
        tenantSessionId: session.sessionId,
        status: "completed",
        userId: actorUserId,
      });
    }
    const scoringResult = await calculateAssessmentSessionScores({
      db,
      sessionId: session.sessionId,
    });
    await createAssessmentResultSnapshot({
      db,
      tenantSlug,
      sessionId: session.sessionId,
      actorUserId,
    });

    const autoGrantResult = await safeAutoGrantReportAccessForCompletedSession({
      db,
      tenantSlug,
      sessionId: session.sessionId,
      actorUserId,
      actorEmail,
    });


    await db.insert(tenantAuditLog).values({
      actorUserId,
      actorRole: "RESPONDENT",
      action: "assessment_session_completed",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        completedAt: now.toISOString(),
        scoring: scoringResult,
        autoGrant: autoGrantResult,
        mode: "my-assessment",
      },
    });

    redirect(`/my/assessment/sessions/${sessionId}/completed?tenant=${tenantSlug}`);
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

    const projectQuestionnaires = await db
      .select({
        questionnaireVersionId:
          assessmentProjectQuestionnaires.questionnaireVersionId,
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
      );

    const questionnaireVersionIds = projectQuestionnaires.map(
      (item) => item.questionnaireVersionId,
    );

    if (questionnaireVersionIds.length === 0) {
      return {
        status: "error",
        message: "Projekt nie ma przypisanych aktywnych kwestionariuszy.",
      };
    }

    const requiredItems = await controlDb
      .select({
        id: questionnaireItems.id,
      })
      .from(questionnaireItems)
      .where(
        and(
          inArray(questionnaireItems.questionnaireVersionId, questionnaireVersionIds),
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
        status: "completed",
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(assessmentSessions.id, session.sessionId));

    const scoringResult = await calculateAssessmentSessionScores({
      db,
      sessionId: session.sessionId,
    });
    await createAssessmentResultSnapshot({
      db,
      tenantSlug: connection.tenantSlug,
      sessionId: session.sessionId,
      actorUserId: null,
    });

    const autoGrantResult = await safeAutoGrantReportAccessForCompletedSession({
      db,
      tenantSlug: connection.tenantSlug,
      sessionId: session.sessionId,
      actorUserId: null,
      actorEmail: session.respondentEmail ?? null,
    });
    await db.insert(tenantAuditLog).values({
      actorUserId: null,
      actorRole: "PUBLIC_RESPONDENT",
      action: "assessment_session_completed",
      entityType: "assessment_session",
      entityId: session.sessionId,
      after: {
        completedAt: now.toISOString(),
        scoring: scoringResult,
        autoGrant: autoGrantResult,
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