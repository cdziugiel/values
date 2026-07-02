// features/my-assessment/api/start-or-continue-public-assessment-session.ts

import { and, desc, eq, isNull } from "drizzle-orm";

import {
    questionnaireVersions,
    questionnaires,
    tenantDatabaseConnections,
    tenants,
} from "@/drizzle/schema";
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
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";
import { upsertRespondentIdentityIndex } from "@/server/respondents/respondent-identity-index";
function normalizeEmail(value: string | null | undefined) {
    const normalized = value?.trim().toLowerCase();
    return normalized || null;
}

async function getPublicTenantDb() {
    const tenantSlug = process.env.PUBLIC_ASSESSMENT_TENANT_SLUG || "humanet";

    if (!tenantSlug) {
        throw new Error(
            "Brakuje PUBLIC_ASSESSMENT_TENANT_SLUG w konfiguracji środowiska.",
        );
    }

    const row = await controlDb
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

    const connection = row[0];

    if (!connection) {
        throw new Error(
            `Nie znaleziono aktywnego tenanta publicznych badań: ${tenantSlug}.`,
        );
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
        tenantSlug: connection.tenantSlug,
    };
}

async function getPublicQuestionnaireVersion(questionnaireVersionId: string) {
    const rows = await controlDb
        .select({
            questionnaireId: questionnaires.id,
            questionnaireCode: questionnaires.code,
            questionnaireName: questionnaires.name,
            questionnaireStatus: questionnaires.status,

            questionnaireVersionId: questionnaireVersions.id,
            questionnaireVersionName: questionnaireVersions.name,
            questionnaireVersionStatus: questionnaireVersions.status,
            isPublic: questionnaireVersions.isPublic,
        })
        .from(questionnaireVersions)
        .innerJoin(
            questionnaires,
            eq(questionnaires.id, questionnaireVersions.questionnaireId),
        )
        .where(
            and(
                eq(questionnaireVersions.id, questionnaireVersionId),
                eq(questionnaireVersions.isPublic, true),
                eq(questionnaireVersions.status, "active"),
                eq(questionnaires.status, "active"),
                isNull(questionnaireVersions.deletedAt),
                isNull(questionnaires.deletedAt),
            ),
        )
        .limit(1);

    const version = rows[0];

    if (!version) {
        throw new Error(
            "Nie znaleziono publicznej aktywnej wersji kwestionariusza.",
        );
    }

    return version;
}

async function findOrCreatePublicProject({
    db,
    questionnaire,
    userId,
}: {
    db: any;
    questionnaire: {
        questionnaireId: string;
        questionnaireName: string;
        questionnaireVersionId: string;
    };
    userId: string;
}) {
    const publicProjectName = `PUBLICZNE · ${questionnaire.questionnaireName}`;

    const existing = await db.query.assessmentProjects.findFirst({
        where: and(
            eq(assessmentProjects.name, publicProjectName),
            isNull(assessmentProjects.deletedAt),
        ),
    });

    if (existing) {
        return existing;
    }

    const [project] = await db
        .insert(assessmentProjects)
        .values({
            clientOrganizationId: null,
            name: publicProjectName,
            description:
                "Techniczny projekt dla publicznych sesji kwestionariusza.",
            status: "active",
            startsAt: null,
            endsAt: null,
            createdBy: userId,
            updatedBy: userId,
        })
        .returning();

    return project;
}

async function findOrCreateProjectRespondent({
    db,
    projectId,
    respondentId,
    userId,
}: {
    db: any;
    projectId: string;
    respondentId: string;
    userId: string;
}) {
    const existing = await db.query.assessmentProjectRespondents.findFirst({
        where: and(
            eq(assessmentProjectRespondents.assessmentProjectId, projectId),
            eq(assessmentProjectRespondents.respondentId, respondentId),
            isNull(assessmentProjectRespondents.deletedAt),
        ),
    });

    if (existing) {
        return existing;
    }

    const now = new Date();

    const [projectRespondent] = await db
        .insert(assessmentProjectRespondents)
        .values({
            assessmentProjectId: projectId,
            respondentId,
            status: "invited",
            invitedAt: null,
            startedAt: null,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
            updatedBy: userId,
        })
        .returning();

    return projectRespondent;
}

async function ensureProjectQuestionnaire({
    db,
    projectId,
    questionnaire,
    userId,
}: {
    db: any;
    projectId: string;
    questionnaire: {
        questionnaireId: string;
        questionnaireVersionId: string;
    };
    userId: string;
}) {
    const existing = await db.query.assessmentProjectQuestionnaires.findFirst({
        where: and(
            eq(assessmentProjectQuestionnaires.assessmentProjectId, projectId),
            eq(
                assessmentProjectQuestionnaires.questionnaireVersionId,
                questionnaire.questionnaireVersionId,
            ),
            isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
    });

    if (existing) {
        return existing;
    }

    const [assignment] = await db
        .insert(assessmentProjectQuestionnaires)
        .values({
            assessmentProjectId: projectId,
            questionnaireId: questionnaire.questionnaireId,
            questionnaireVersionId: questionnaire.questionnaireVersionId,
            orderIndex: 0,
            status: "active",
            snapshot: null,
            createdBy: userId,
            updatedBy: userId,
        })
        .returning();

    return assignment;
}

async function findOrCreateRespondentForUser({
    db,
    tenantSlug,
    email,
    userId,
}: {
    db: any;
    tenantSlug: string;
    email: string;
    userId: string;
}) {
    const existingIdentity = await db.query.respondentIdentities.findFirst({
        where: and(
            eq(respondentIdentities.email, email),
            isNull(respondentIdentities.deletedAt),
        ),
    });

if (existingIdentity) {
  const existingRespondent =
    await db.query.respondents.findFirst({
      where: and(
        eq(respondents.id, existingIdentity.respondentId),
        isNull(respondents.deletedAt),
      ),
    });

  if (existingRespondent) {
    await upsertRespondentIdentityIndex({
      tenantSlug,
      respondentId: existingRespondent.id,
      email,
      userId,
    });

    return existingRespondent;
  }
}

    const [respondent] = await db
        .insert(respondents)
        .values({
            externalCode: email,
            clientOrganizationId: null,
            clientUnitId: null,
            createdBy: userId,
            updatedBy: userId,
        })
        .returning();

    await db.insert(respondentIdentities).values({
        respondentId: respondent.id,
        email,
        firstName: null,
        lastName: null,
        createdBy: userId,
        updatedBy: userId,
    });
    await upsertRespondentIdentityIndex({
        tenantSlug,
        respondentId: respondent.id,
        email,
        userId,
    });
    return respondent;
}

async function findOrCreateSession({
    db,
    projectId,
    respondentId,
    projectRespondentId,
    userId,
    forceNew = false,
}: {
    db: any;
    projectId: string;
    respondentId: string;
    projectRespondentId: string;
    userId: string;
    forceNew?: boolean;
}) {
    if (!forceNew) {
        const existing = await db.query.assessmentSessions.findFirst({
            where: and(
                eq(assessmentSessions.assessmentProjectId, projectId),
                eq(assessmentSessions.respondentId, respondentId),
                eq(assessmentSessions.projectRespondentId, projectRespondentId),
                isNull(assessmentSessions.deletedAt),
            ),
            orderBy: desc(assessmentSessions.updatedAt),
        });

        if (
            existing &&
            (existing.status === "not_started" || existing.status === "in_progress")
        ) {
            return existing;
        }
    }

    const now = new Date();

    const [session] = await db
        .insert(assessmentSessions)
        .values({
            assessmentProjectId: projectId,
            respondentId,
            projectRespondentId,
            accessLinkId: null,
            status: "in_progress",
            startedAt: now,
            completedAt: null,
            createdBy: userId,
            updatedBy: userId,
            createdAt: now,
            updatedAt: now,
        })
        .returning();

    await db
        .update(assessmentProjectRespondents)
        .set({
            startedAt: now,
            updatedAt: now,
            updatedBy: userId,
        })
        .where(eq(assessmentProjectRespondents.id, projectRespondentId));

    return session;
}

export async function startOrContinuePublicAssessmentSession({
    questionnaireVersionId,
    forceNew = false,
}: {
    questionnaireVersionId: string;
    forceNew?: boolean;
}) {
    const session = await requireSession();

    const email = normalizeEmail(session.user.email);

    if (!email) {
        throw new Error(
            "Aby rozpocząć publiczne badanie, konto musi mieć adres e-mail.",
        );
    }

    const questionnaire = await getPublicQuestionnaireVersion(
        questionnaireVersionId,
    );

    const { db, tenantSlug } = await getPublicTenantDb();

    const project = await findOrCreatePublicProject({
        db,
        questionnaire,
        userId: session.user.id,
    });

    const projectQuestionnaire = await ensureProjectQuestionnaire({
        db,
        projectId: project.id,
        questionnaire,
        userId: session.user.id,
    });

    const respondent = await findOrCreateRespondentForUser({
        db,
        tenantSlug,
        email,
        userId: session.user.id,
    });

    const projectRespondent = await findOrCreateProjectRespondent({
        db,
        projectId: project.id,
        respondentId: respondent.id,
        userId: session.user.id,
    });

    const assessmentSession = await findOrCreateSession({
        db,
        projectId: project.id,
        respondentId: respondent.id,
        projectRespondentId: projectRespondent.id,
        userId: session.user.id,
        forceNew,
    });

    const params = new URLSearchParams({
        tenant: tenantSlug,
    });

    return {
        tenantSlug,
        sessionId: assessmentSession.id,
        projectQuestionnaireId: projectQuestionnaire.id,
        href:
            `/my/assessment/sessions/${encodeURIComponent(assessmentSession.id)}` +
            `/questionnaire/${encodeURIComponent(projectQuestionnaire.id)}` +
            `?${params.toString()}`,
    };
}