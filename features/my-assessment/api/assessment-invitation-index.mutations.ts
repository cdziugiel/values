// features/my-assessment/api/assessment-invitation-index.mutations.ts
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
    assessmentInvitationIndex,
    questionnaireVersions,
    questionnaires,
} from "@/drizzle/schema";
import {
    assessmentAccessLinks,
    assessmentProjectQuestionnaires,
    assessmentProjectRespondents,
    assessmentProjects,
    assessmentSessions,
    respondentIdentities,
    respondents,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";


export async function archiveAssessmentInvitationIndexBySession({
  tenantSlug,
  tenantSessionId,
  userId = null,
}: {
  tenantSlug: string;
  tenantSessionId: string;
  userId?: string | null;
}) {
  const now = new Date();

  await controlDb
    .update(assessmentInvitationIndex)
    .set({
      status: "archived",
      userId,
      lastSyncedAt: now,
      updatedAt: now,
      deletedAt: now,
    })
    .where(
      and(
        eq(assessmentInvitationIndex.tenantSlug, tenantSlug),
        eq(assessmentInvitationIndex.tenantSessionId, tenantSessionId),
      ),
    );
}

export async function resetAssessmentInvitationIndexAfterCancel({
    tenantSlug,
    tenantProjectRespondentId,
    userId = null,
}: {
    tenantSlug: string;
    tenantProjectRespondentId: string;
    userId?: string | null;
}) {
    const now = new Date();

    await controlDb
        .update(assessmentInvitationIndex)
        .set({
            tenantSessionId: null,
            status: "invited",
            userId,
            startedAt: null,
            completedAt: null,
            lastSyncedAt: now,
            updatedAt: now,
            deletedAt: null,
        })
        .where(
            and(
                eq(assessmentInvitationIndex.tenantSlug, tenantSlug),
                eq(
                    assessmentInvitationIndex.tenantProjectRespondentId,
                    tenantProjectRespondentId,
                ),
            ),
        );
}


export async function syncAssessmentInvitationIndexForProject({
    db,
    ctx,
    assessmentProjectId,
}: {
    db: TenantDb;
    ctx: TenantContext;
    assessmentProjectId: string;
}) {
    const rows = await db
        .select({
            projectRespondentId: assessmentProjectRespondents.id,
        })
        .from(assessmentProjectRespondents)
        .where(
            eq(
                assessmentProjectRespondents.assessmentProjectId,
                assessmentProjectId,
            ),
        );

    for (const row of rows) {
        await syncAssessmentInvitationIndexForProjectRespondent({
            db,
            ctx,
            projectRespondentId: row.projectRespondentId,
        });
    }
}


function normalizeEmail(value: string | null | undefined) {
    const normalized = value?.trim().toLowerCase();
    return normalized || null;
}

function mapProjectRespondentStatusToInvitationStatus(status: string | null) {
    if (status === "completed") return "completed";
    if (status === "started") return "in_progress";
    if (status === "archived") return "revoked";

    return "invited";
}

export async function syncAssessmentInvitationIndexForProjectRespondent({
  db,
  ctx,
  projectRespondentId,
  userId = null,
}: {
  db: TenantDb;
  ctx: TenantContext;
  projectRespondentId: string;
  userId?: string | null;
}) {
  const rows = await db
    .select({
      projectRespondentId: assessmentProjectRespondents.id,
      projectRespondentStatus: assessmentProjectRespondents.status,
      invitedAt: assessmentProjectRespondents.invitedAt,
      startedAt: assessmentProjectRespondents.startedAt,
      completedAt: assessmentProjectRespondents.completedAt,
      projectRespondentDeletedAt: assessmentProjectRespondents.deletedAt,

      respondentId: respondents.id,
      respondentEmail: respondentIdentities.email,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectStatus: assessmentProjects.status,
      projectDeletedAt: assessmentProjects.deletedAt,

      projectQuestionnaireId: assessmentProjectQuestionnaires.id,
      questionnaireId: assessmentProjectQuestionnaires.questionnaireId,
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
      projectQuestionnaireStatus: assessmentProjectQuestionnaires.status,
      projectQuestionnaireDeletedAt:
        assessmentProjectQuestionnaires.deletedAt,

      accessLinkId: assessmentAccessLinks.id,
      accessLinkExpiresAt: assessmentAccessLinks.expiresAt,
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
      eq(
        assessmentProjectQuestionnaires.assessmentProjectId,
        assessmentProjects.id,
      ),
    )
    .leftJoin(
      assessmentAccessLinks,
      and(
        eq(
          assessmentAccessLinks.projectRespondentId,
          assessmentProjectRespondents.id,
        ),
        isNull(assessmentAccessLinks.deletedAt),
      ),
    )
    .where(eq(assessmentProjectRespondents.id, projectRespondentId));

  if (rows.length === 0) {
    return;
  }

  const questionnaireVersionIds = Array.from(
    new Set(
      rows
        .map((row) => row.questionnaireVersionId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const versionRows =
    questionnaireVersionIds.length > 0
      ? await controlDb
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
          )
      : [];

  const versionById = new Map(
    versionRows.map((version) => [version.questionnaireVersionId, version]),
  );

  /**
   * Tylko aktywna, wznawialna sesja może zasilać status "in_progress".
   * Completed/cancelled/archived nigdy nie mogą zostać użyte jako aktywna sesja.
   */
  const activeSessionRows = await db
    .select({
      id: assessmentSessions.id,
      status: assessmentSessions.status,
      startedAt: assessmentSessions.startedAt,
      updatedAt: assessmentSessions.updatedAt,
      createdAt: assessmentSessions.createdAt,
    })
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.projectRespondentId, projectRespondentId),
        inArray(assessmentSessions.status, ["in_progress"]),
        isNull(assessmentSessions.completedAt),
        isNull(assessmentSessions.cancelledAt),
        isNull(assessmentSessions.respondentArchivedAt),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.updatedAt), desc(assessmentSessions.createdAt))
    .limit(1);

  const activeSession = activeSessionRows[0] ?? null;

  const completedSessionRows = await db
    .select({
      id: assessmentSessions.id,
      status: assessmentSessions.status,
      startedAt: assessmentSessions.startedAt,
      completedAt: assessmentSessions.completedAt,
      updatedAt: assessmentSessions.updatedAt,
      createdAt: assessmentSessions.createdAt,
    })
    .from(assessmentSessions)
    .where(
      and(
        eq(assessmentSessions.projectRespondentId, projectRespondentId),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.respondentArchivedAt),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt), desc(assessmentSessions.updatedAt))
    .limit(1);

  const completedSession = completedSessionRows[0] ?? null;

  const now = new Date();

  for (const row of rows) {
    const email = normalizeEmail(row.respondentEmail);

    if (!email) {
      continue;
    }

    const version = versionById.get(row.questionnaireVersionId);

    const shouldBeDeleted =
      Boolean(row.projectRespondentDeletedAt) ||
      Boolean(row.projectDeletedAt) ||
      Boolean(row.projectQuestionnaireDeletedAt) ||
      row.projectStatus !== "active" ||
      row.projectQuestionnaireStatus !== "active";

    let status = shouldBeDeleted ? "revoked" : "invited";
    let tenantSessionId: string | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;

    if (!shouldBeDeleted && activeSession) {
      status = "in_progress";
      tenantSessionId = activeSession.id;
      startedAt = activeSession.startedAt ?? null;
      completedAt = null;
    } else if (!shouldBeDeleted && completedSession) {
      status = "completed";
      tenantSessionId = completedSession.id;
      startedAt = completedSession.startedAt ?? null;
      completedAt = completedSession.completedAt ?? null;
    } else if (!shouldBeDeleted && row.projectRespondentStatus === "completed") {
      status = "completed";
      tenantSessionId = null;
      startedAt = row.startedAt ?? null;
      completedAt = row.completedAt ?? null;
    } else if (!shouldBeDeleted) {
      status = "invited";
      tenantSessionId = null;
      startedAt = null;
      completedAt = null;
    }

    await controlDb
      .insert(assessmentInvitationIndex)
      .values({
        tenantId: ctx.tenantId,
        tenantSlug: ctx.tenantSlug,
        tenantName: ctx.tenantName,

        respondentEmailNormalized: email,
        userId,

        tenantRespondentId: row.respondentId,
        tenantProjectId: row.projectId,
        tenantProjectRespondentId: row.projectRespondentId,
        tenantProjectQuestionnaireId: row.projectQuestionnaireId,

        tenantSessionId,
        tenantAccessLinkId: row.accessLinkId ?? null,

        questionnaireId: row.questionnaireId,
        questionnaireVersionId: row.questionnaireVersionId,

        projectNameSnapshot: row.projectName,
        questionnaireNameSnapshot: version?.questionnaireName ?? null,
        questionnaireVersionNameSnapshot:
          version?.questionnaireVersionName ?? null,

        status,
        invitedAt: row.invitedAt ?? null,
        startedAt,
        completedAt,
        expiresAt: row.accessLinkExpiresAt ?? null,

        lastSyncedAt: now,
        deletedAt: shouldBeDeleted ? now : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          assessmentInvitationIndex.tenantId,
          assessmentInvitationIndex.tenantProjectRespondentId,
          assessmentInvitationIndex.tenantProjectQuestionnaireId,
        ],
        set: {
          tenantSlug: ctx.tenantSlug,
          tenantName: ctx.tenantName,

          respondentEmailNormalized: email,
          userId,

          tenantRespondentId: row.respondentId,
          tenantProjectId: row.projectId,
          tenantSessionId,
          tenantAccessLinkId: row.accessLinkId ?? null,

          questionnaireId: row.questionnaireId,
          questionnaireVersionId: row.questionnaireVersionId,

          projectNameSnapshot: row.projectName,
          questionnaireNameSnapshot: version?.questionnaireName ?? null,
          questionnaireVersionNameSnapshot:
            version?.questionnaireVersionName ?? null,

          status,
          invitedAt: row.invitedAt ?? null,
          startedAt,
          completedAt,
          expiresAt: row.accessLinkExpiresAt ?? null,

          lastSyncedAt: now,
          deletedAt: shouldBeDeleted ? now : null,
          updatedAt: now,
        },
      });
  }
}

export async function markAssessmentInvitationIndexSession({
  tenantId,
  tenantProjectRespondentId,
  tenantProjectQuestionnaireId,
  tenantSessionId,
  status,
  userId = null,
}: {
  tenantId: string;
  tenantProjectRespondentId: string;
  tenantProjectQuestionnaireId: string;
  tenantSessionId: string;
  status: "in_progress" | "completed";
  userId?: string | null;
}) {
  const now = new Date();

  await controlDb
    .update(assessmentInvitationIndex)
    .set({
      tenantSessionId,
      status,
      userId,
      startedAt: status === "in_progress" ? now : undefined,
      completedAt: status === "completed" ? now : null,
      lastSyncedAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .where(
      and(
        eq(assessmentInvitationIndex.tenantId, tenantId),
        eq(
          assessmentInvitationIndex.tenantProjectRespondentId,
          tenantProjectRespondentId,
        ),
        eq(
          assessmentInvitationIndex.tenantProjectQuestionnaireId,
          tenantProjectQuestionnaireId,
        ),
      ),
    );
}