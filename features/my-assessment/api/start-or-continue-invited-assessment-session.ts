import { and, eq, isNull, sql } from "drizzle-orm";

import {
  assessmentProjectQuestionnaires,
  assessmentProjectRespondents,
  assessmentProjects,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";

import { getMyAssessmentTenantDbBySlug } from "./my-assessment-tenant-db";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export async function startOrContinueInvitedAssessmentSession({
  tenantSlug,
  projectRespondentId,
  projectQuestionnaireId,
}: {
  tenantSlug?: string | null;
  projectRespondentId: string;
  projectQuestionnaireId: string;
}) {
  const session = await requireSession();
  const email = normalizeEmail(session.user.email);

  if (!email) {
    return {
      ok: false as const,
      message: "Nie udało się ustalić adresu e-mail użytkownika.",
    };
  }

  const tenant = await getMyAssessmentTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return {
      ok: false as const,
      message: "Nie znaleziono tenanta badania.",
    };
  }

  const db = tenant.db;

  const rows = await db
    .select({
      projectRespondentId: assessmentProjectRespondents.id,
      respondentId: respondents.id,
      projectId: assessmentProjects.id,
      projectQuestionnaireId: assessmentProjectQuestionnaires.id,
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
    })
    .from(assessmentProjectRespondents)
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentProjectRespondents.respondentId),
    )
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .innerJoin(
      assessmentProjects,
      eq(
        assessmentProjects.id,
        assessmentProjectRespondents.assessmentProjectId,
      ),
    )
    .innerJoin(
      assessmentProjectQuestionnaires,
      and(
        eq(
          assessmentProjectQuestionnaires.id,
          projectQuestionnaireId,
        ),
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjects.id,
        ),
      ),
    )
    .leftJoin(
      assessmentSessions,
      and(
        eq(
          assessmentSessions.projectRespondentId,
          assessmentProjectRespondents.id,
        ),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentSessions.respondentArchivedAt),
      ),
    )
    .where(
      and(
        eq(assessmentProjectRespondents.id, projectRespondentId),
        sql`lower(trim(${respondentIdentities.email})) = ${email}`,
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectRespondents.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];

  if (!row) {
    return {
      ok: false as const,
      message:
        "Nie znaleziono aktywnego zaproszenia przypisanego do Twojego adresu e-mail.",
    };
  }

  let sessionId = row.sessionId;

  if (!sessionId) {
    const now = new Date();

    const inserted = await db
      .insert(assessmentSessions)
      .values({
        assessmentProjectId: row.projectId,
        respondentId: row.respondentId,
        projectRespondentId: row.projectRespondentId,
        status: "in_progress",
        startedAt: now,
        createdBy: session.user.id,
        updatedBy: session.user.id,
      })
      .returning({
        id: assessmentSessions.id,
      });

    sessionId = inserted[0]?.id ?? null;

    await db
      .update(assessmentProjectRespondents)
      .set({
        status: "started",
        startedAt: now,
        updatedBy: session.user.id,
        updatedAt: now,
      })
      .where(eq(assessmentProjectRespondents.id, row.projectRespondentId));
  }

  if (!sessionId) {
    return {
      ok: false as const,
      message: "Nie udało się utworzyć sesji badania.",
    };
  }

  const params = new URLSearchParams({
    tenant: tenant.tenantSlug,
  });

  return {
    ok: true as const,
    href:
      `/my/assessment/sessions/${encodeURIComponent(sessionId)}` +
      `/questionnaire/${encodeURIComponent(row.projectQuestionnaireId)}` +
      `?${params.toString()}`,
  };
}