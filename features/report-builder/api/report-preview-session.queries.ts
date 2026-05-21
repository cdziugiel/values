// features/report-builder/api/report-preview-session.queries.ts

import { and, desc, eq, isNotNull, isNull, or } from "drizzle-orm";

import { controlDb } from "@/server/db/control-db";
import { getTenantDbByConnection } from "@/server/db/tenant-db-by-connection";
import { decryptSecret } from "@/server/security/encryption";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import {
    tenantDatabaseConnections,
    tenants,
} from "@/drizzle/schema/control";

import { questionnaireReportTemplateBindings } from "@/drizzle/schema/shared/report-template-bindings";

import {
    assessmentProjectQuestionnaires,
    assessmentProjects,
    assessmentSessions,
    respondentIdentities,
    respondents,
} from "@/drizzle/schema/tenant-schema";

export type ReportPreviewSessionOption = {
    tenantSlug: string;
    tenantName: string;

    projectId: string;
    projectName: string;

    projectQuestionnaireId: string;
    sessionId: string;

    respondentId: string;
    respondentLabel: string;
    respondentEmail: string | null;

    startedAt: Date | null;
    completedAt: Date | null;
    questionnaireVersionId: string;
};

export async function listReportPreviewSessionOptions(input: {
    reportTemplateVersionId: string;
}): Promise<ReportPreviewSessionOption[]> {
    await requireSuperAdmin();

    const [binding] = await controlDb
        .select({
            questionnaireVersionId:
                questionnaireReportTemplateBindings.questionnaireVersionId,
        })
        .from(questionnaireReportTemplateBindings)
        .where(
            and(
                eq(
                    questionnaireReportTemplateBindings.reportTemplateVersionId,
                    input.reportTemplateVersionId,
                ),
                eq(questionnaireReportTemplateBindings.status, "active"),
                isNull(questionnaireReportTemplateBindings.deletedAt),
            ),
        )
        .limit(1);

    if (!binding) {
        return [];
    }

    const tenantRows = await controlDb
        .select({
            tenantId: tenants.id,
            tenantSlug: tenants.slug,
            tenantName: tenants.name,
            databaseName: tenantDatabaseConnections.databaseName,
            schemaVersion: tenantDatabaseConnections.schemaVersion,
            databaseUrlEncrypted: tenantDatabaseConnections.databaseUrlEncrypted,
        })
        .from(tenants)
        .innerJoin(
            tenantDatabaseConnections,
            eq(tenantDatabaseConnections.tenantId, tenants.id),
        )
        .where(eq(tenants.status, "active"));

    const result: ReportPreviewSessionOption[] = [];

    for (const tenant of tenantRows) {
        if (!tenant.databaseName || tenant.schemaVersion == null) {
            continue;
        }

        const databaseUrl = decryptSecret(tenant.databaseUrlEncrypted);

        const tenantDb = getTenantDbByConnection({
            tenantId: tenant.tenantId,
            databaseName: tenant.databaseName,
            schemaVersion: tenant.schemaVersion,
            databaseUrl,
        });

        const rows = await tenantDb
            .select({
                projectId: assessmentProjects.id,
                projectName: assessmentProjects.name,

                projectQuestionnaireId: assessmentProjectQuestionnaires.id,

                sessionId: assessmentSessions.id,
                respondentId: respondents.id,

                respondentExternalCode: respondents.externalCode,
                respondentFirstName: respondentIdentities.firstName,
                respondentLastName: respondentIdentities.lastName,
                respondentEmail: respondentIdentities.email,

                startedAt: assessmentSessions.startedAt,
                completedAt: assessmentSessions.completedAt,
                questionnaireVersionId:
                    assessmentProjectQuestionnaires.questionnaireVersionId,
            })
            .from(assessmentSessions)
            .innerJoin(
                assessmentProjects,
                eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
            )
            .innerJoin(
                assessmentProjectQuestionnaires,
                and(
                    eq(
                        assessmentProjectQuestionnaires.assessmentProjectId,
                        assessmentSessions.assessmentProjectId,
                    ),
                    eq(
                        assessmentProjectQuestionnaires.questionnaireVersionId,
                        binding.questionnaireVersionId,
                    ),
                ),
            )
            .innerJoin(
                respondents,
                eq(respondents.id, assessmentSessions.respondentId),
            )
            .leftJoin(
                respondentIdentities,
                eq(respondentIdentities.respondentId, respondents.id),
            )
            .where(
                and(
                    or(
                        eq(assessmentSessions.status, "completed"),
                        isNotNull(assessmentSessions.completedAt),
                    ),
                    isNull(assessmentSessions.deletedAt),
                    isNull(assessmentProjects.deletedAt),
                    isNull(assessmentProjectQuestionnaires.deletedAt),
                    isNull(respondents.deletedAt),
                ),
            )
            .orderBy(desc(assessmentSessions.completedAt))
            .limit(50);

        for (const row of rows) {
            const fullName = [
                row.respondentFirstName,
                row.respondentLastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim();

            result.push({
                tenantSlug: tenant.tenantSlug,
                tenantName: tenant.tenantName,

                projectId: row.projectId,
                projectName: row.projectName,

                projectQuestionnaireId: row.projectQuestionnaireId,
                sessionId: row.sessionId,

                respondentId: row.respondentId,
                respondentLabel:
                    fullName ||
                    row.respondentEmail ||
                    row.respondentExternalCode ||
                    "Respondent bez nazwy",
                respondentEmail: row.respondentEmail,

                startedAt: row.startedAt,
                completedAt: row.completedAt,
                questionnaireVersionId: row.questionnaireVersionId,
            });
        }
    }

    return result;
}