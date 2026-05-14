import { and, eq, isNull } from "drizzle-orm";

import {
    assessmentProjectQuestionnaires,
    assessmentSessions,
    respondentIdentities,
    respondents,
} from "@/drizzle/schema/tenant-schema";
import { requireSession } from "@/server/auth/require-session";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

function normalizeEmail(value: string | null | undefined) {
    const normalized = value?.trim().toLowerCase();
    return normalized || null;
}

export async function resolveMyAssessmentSessionEntry({
    tenantSlug,
    sessionId,
    questionnaireVersionId,
}: {
    tenantSlug: string;
    sessionId: string;
    questionnaireVersionId: string;
}) {
    if (!tenantSlug) {
        return {
            ok: false as const,
            message: "Brakuje tenanta badania.",
        };
    }

    if (!sessionId) {
        return {
            ok: false as const,
            message: "Brakuje identyfikatora sesji.",
        };
    }

    if (!questionnaireVersionId) {
        return {
            ok: false as const,
            message: "Brakuje identyfikatora wersji kwestionariusza.",
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

    const rows = await db
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

    const row = rows[0];

    if (!row) {
        return {
            ok: false as const,
            message: "Nie znaleziono sesji badania.",
        };
    }

    if (normalizeEmail(row.respondentEmail) !== email) {
        return {
            ok: false as const,
            message: "Ta sesja badania nie należy do zalogowanego użytkownika.",
        };
    }

    const projectQuestionnaire =
        await db.query.assessmentProjectQuestionnaires.findFirst({
            where: and(
                eq(
                    assessmentProjectQuestionnaires.assessmentProjectId,
                    row.assessmentProjectId,
                ),
                eq(
                    assessmentProjectQuestionnaires.questionnaireVersionId,
                    questionnaireVersionId,
                ),
                eq(assessmentProjectQuestionnaires.status, "active"),
                isNull(assessmentProjectQuestionnaires.deletedAt),
            ),
        });

    if (!projectQuestionnaire) {
        return {
            ok: false as const,
            message: "Ten kwestionariusz nie jest aktywny w tej sesji badania.",
        };
    }

    return {
        ok: true as const,
        data: {
            tenantSlug,
            sessionId,
            sessionStatus: row.sessionStatus,
            projectQuestionnaireId: projectQuestionnaire.id,
        },
    };
}