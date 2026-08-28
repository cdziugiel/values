import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { assessmentInvitationIndex } from "@/drizzle/schema";
import {
  assessmentProjectQuestionnaires,
  assessmentProjectRespondents,
  assessmentProjects,
  assessmentResultSnapshots,
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

function buildCompletedQuestionnaireHref({
  tenantSlug,
  sessionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  projectQuestionnaireId: string;
  questionnaireVersionId: string;
}) {
  // HUMANET_MULTI_QUESTIONNAIRE_V3_BUILD_COMPLETED_HREF
  const params = new URLSearchParams({
    tenant: tenantSlug,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  return (
    `/my/assessment/sessions/${encodeURIComponent(sessionId)}` +
    `/completed?${params.toString()}`
  );
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
  // HUMANET_MULTI_QUESTIONNAIRE_V3_SESSION_REPAIR_BEGIN
  /**
   * Wybieramy najnowszą żywą sesję pakietu. Status "completed" nie jest
   * bezwarunkowo zaufany: stara wersja aplikacji mogła zamknąć pakiet po Q1.
   */
  const candidateSessionRows = await db
    .select({
      id: assessmentSessions.id,
      status: assessmentSessions.status,
      completedAt: assessmentSessions.completedAt,
      updatedAt: assessmentSessions.updatedAt,
      createdAt: assessmentSessions.createdAt,
    })
    .from(assessmentSessions)
    .where(
      and(
        eq(
          assessmentSessions.projectRespondentId,
          row.projectRespondentId,
        ),
        inArray(
          assessmentSessions.status,
          ["in_progress", "completed"],
        ),
        isNull(assessmentSessions.cancelledAt),
        isNull(assessmentSessions.respondentArchivedAt),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(
      desc(assessmentSessions.updatedAt),
      desc(assessmentSessions.createdAt),
    )
    .limit(1);

  const candidateSession = candidateSessionRows[0] ?? null;
  let sessionId = candidateSession?.id ?? null;

  if (candidateSession) {
    const currentSnapshotRows = await db
      .select({
        id: assessmentResultSnapshots.id,
      })
      .from(assessmentResultSnapshots)
      .where(
        and(
          eq(
            assessmentResultSnapshots.assessmentSessionId,
            candidateSession.id,
          ),
          eq(
            assessmentResultSnapshots.projectQuestionnaireId,
            row.projectQuestionnaireId,
          ),
          isNull(assessmentResultSnapshots.deletedAt),
        ),
      )
      .limit(1);

    if (currentSnapshotRows[0]) {
      return {
        ok: true as const,
        href: buildCompletedQuestionnaireHref({
          tenantSlug: tenant.tenantSlug,
          sessionId: candidateSession.id,
          projectQuestionnaireId:
            row.projectQuestionnaireId,
          questionnaireVersionId:
            invitation.questionnaireVersionId,
        }),
      };
    }

    if (candidateSession.status === "completed") {
      const activeProjectQuestionnaireRows = await db
        .select({
          projectQuestionnaireId:
            assessmentProjectQuestionnaires.id,
        })
        .from(assessmentProjectQuestionnaires)
        .where(
          and(
            eq(
              assessmentProjectQuestionnaires.assessmentProjectId,
              row.projectId,
            ),
            eq(
              assessmentProjectQuestionnaires.status,
              "active",
            ),
            isNull(
              assessmentProjectQuestionnaires.deletedAt,
            ),
          ),
        );

      const snapshotRows = await db
        .select({
          projectQuestionnaireId:
            assessmentResultSnapshots.projectQuestionnaireId,
        })
        .from(assessmentResultSnapshots)
        .where(
          and(
            eq(
              assessmentResultSnapshots.assessmentSessionId,
              candidateSession.id,
            ),
            isNull(assessmentResultSnapshots.deletedAt),
          ),
        );

      const completedIds = new Set(
        snapshotRows
          .map((snapshot: any) =>
            snapshot.projectQuestionnaireId,
          )
          .filter((value: unknown): value is string =>
            typeof value === "string" &&
            value.length > 0,
          ),
      );

      const packageIsActuallyComplete =
        activeProjectQuestionnaireRows.length > 0 &&
        activeProjectQuestionnaireRows.every(
          (questionnaire: any) =>
            completedIds.has(
              questionnaire.projectQuestionnaireId,
            ),
        );

      if (!packageIsActuallyComplete) {
        const now = new Date();

        await db
          .update(assessmentSessions)
          .set({
            status: "in_progress",
            completedAt: null,
            updatedAt: now,
            updatedBy: authSession.user.id,
          })
          .where(
            eq(
              assessmentSessions.id,
              candidateSession.id,
            ),
          );

        await db
          .update(assessmentProjectRespondents)
          .set({
            status: "started",
            completedAt: null,
            updatedAt: now,
            updatedBy: authSession.user.id,
          })
          .where(
            eq(
              assessmentProjectRespondents.id,
              row.projectRespondentId,
            ),
          );

        console.warn(
          "MY_ASSESSMENT_PREMATURE_SESSION_REOPENED",
          {
            sessionId: candidateSession.id,
            projectRespondentId:
              row.projectRespondentId,
            activeQuestionnaires:
              activeProjectQuestionnaireRows.length,
            completedSnapshots:
              completedIds.size,
          },
        );
      } else {
        return {
          ok: false as const,
          message:
            "Sesja jest zakończona, ale dla tego kwestionariusza nie znaleziono snapshotu wyniku. Wymagana jest diagnostyka danych.",
        };
      }
    }
  }
  // HUMANET_MULTI_QUESTIONNAIRE_V3_SESSION_REPAIR_END

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