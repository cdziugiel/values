import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { assessmentInvitationIndex } from "@/drizzle/schema";
import {
  assessmentProjectQuestionnaires,
  assessmentProjectRespondents,
  assessmentProjects,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

import { getMyAssessmentTenantDbBySlug } from "./my-assessment-tenant-db";
import { markAssessmentInvitationIndexSession } from "./assessment-invitation-index.mutations";
import { upsertRespondentIdentityIndex } from "@/server/respondents/respondent-identity-index";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized || null;
}

export async function startOrContinueIndexedInvitationSession({
  invitationId,
}: {
  invitationId: string;
}) {
  const authSession = await requireSession();
  const email = normalizeEmail(authSession.user.email);

  if (!email) {
    return {
      ok: false as const,
      message: "Konto użytkownika nie ma adresu e-mail.",
    };
  }

  const invitation = await controlDb.query.assessmentInvitationIndex.findFirst({
    where: and(
      eq(assessmentInvitationIndex.id, invitationId),
      eq(assessmentInvitationIndex.respondentEmailNormalized, email),
      isNull(assessmentInvitationIndex.deletedAt),
    ),
  });

  if (!invitation) {
    return {
      ok: false as const,
      message: "Nie znaleziono zaproszenia przypisanego do Twojego konta.",
    };
  }

  if (
    invitation.status === "revoked" ||
    invitation.status === "cancelled" ||
    invitation.status === "expired"
  ) {
    return {
      ok: false as const,
      message: "To zaproszenie nie jest już aktywne.",
    };
  }

  if (invitation.status === "completed" && invitation.tenantSessionId) {
    return {
      ok: true as const,
      href:
        `/my/assessment/sessions/${encodeURIComponent(invitation.tenantSessionId)}` +
        `/completed?tenant=${encodeURIComponent(invitation.tenantSlug)}`,
    };
  }

  const tenant = await getMyAssessmentTenantDbBySlug(invitation.tenantSlug);

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
      projectRespondentStatus: assessmentProjectRespondents.status,

      respondentId: respondents.id,
      respondentEmail: respondentIdentities.email,

      projectId: assessmentProjects.id,
      projectStatus: assessmentProjects.status,

      projectQuestionnaireId: assessmentProjectQuestionnaires.id,
      projectQuestionnaireStatus: assessmentProjectQuestionnaires.status,
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
          invitation.tenantProjectQuestionnaireId,
        ),
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjects.id,
        ),
      ),
    )
    .where(
      and(
        eq(
          assessmentProjectRespondents.id,
          invitation.tenantProjectRespondentId,
        ),
        eq(respondentIdentities.email, email),
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
        "Nie znaleziono aktywnego zaproszenia w bazie tenanta. Zaproszenie mogło zostać wycofane.",
    };
  }

  if (
    row.projectStatus !== "active" ||
    row.projectQuestionnaireStatus !== "active"
  ) {
    return {
      ok: false as const,
      message: "Projekt lub kwestionariusz nie jest już aktywny.",
    };
  }
  await upsertRespondentIdentityIndex({
    tenantSlug: tenant.tenantSlug,
    respondentId: row.respondentId,
    email: row.respondentEmail,
    userId: authSession.user.id,
  });
  const activeSessionRows = await db
    .select({
      id: assessmentSessions.id,
    })
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.projectRespondentId, row.projectRespondentId),
        inArray(assessmentSessions.status, ["in_progress"]),
        isNull(assessmentSessions.completedAt),
        isNull(assessmentSessions.cancelledAt),
        isNull(assessmentSessions.respondentArchivedAt),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.updatedAt), desc(assessmentSessions.createdAt))
    .limit(1);

  let sessionId = activeSessionRows[0]?.id ?? null;

  if (!sessionId) {
    const now = new Date();

    const inserted = await db
      .insert(assessmentSessions)
      .values({
        assessmentProjectId: row.projectId,
        respondentId: row.respondentId,
        projectRespondentId: row.projectRespondentId,
        accessLinkId: invitation.tenantAccessLinkId ?? null,
        status: "in_progress",
        startedAt: now,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
        createdBy: authSession.user.id,
        updatedBy: authSession.user.id,
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
        completedAt: null,
        updatedAt: now,
        updatedBy: authSession.user.id,
      })
      .where(eq(assessmentProjectRespondents.id, row.projectRespondentId));
  }

  if (!sessionId) {
    return {
      ok: false as const,
      message: "Nie udało się utworzyć sesji badania.",
    };
  }

  await markAssessmentInvitationIndexSession({
    tenantId: invitation.tenantId,
    tenantProjectRespondentId: invitation.tenantProjectRespondentId,
    tenantProjectQuestionnaireId: invitation.tenantProjectQuestionnaireId,
    tenantSessionId: sessionId,
    status: "in_progress",
    userId: authSession.user.id,
  });

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