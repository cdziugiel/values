import {
    and,
    count,
    desc,
    eq,
    inArray,
    isNull,
    or,
} from "drizzle-orm";

import {
    reportAccessCodes,
    reportAccessGrants,
    reportAccessOrderItems,
    reportAccessOrders,
    reportAccessProducts,
    reportTemplates,
    reportTemplateVersions,
    billingProfiles,
    questionnaires,
    questionnaireVersions,
} from "@/drizzle/schema";



import {
    assessmentProjects,
    assessmentResponses,
    assessmentResultSnapshots,
    assessmentSessions,
    respondentIdentities,
    respondents,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
type TenantDb = any;



function isGrantCurrentlyActive(grant: {
    status: string;
    validFrom: Date | null;
    validUntil: Date | null;
}) {
    if (grant.status !== "active") {
        return false;
    }

    const now = new Date();

    if (grant.validFrom && grant.validFrom > now) {
        return false;
    }

    if (grant.validUntil && grant.validUntil < now) {
        return false;
    }

    return true;
}


function asRecord(value: unknown): Record<string, any> {
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, any>;
    }

    return {};
}

function readCompositeRequiredSources(dataBindings: unknown) {
    const bindings = asRecord(dataBindings);
    const sources = asRecord(bindings.sources);
    const personalReports = sources.personalReports;

    if (!Array.isArray(personalReports)) {
        return [];
    }

    return personalReports
        .map((item) => {
            const source = asRecord(item);

            return {
                slot: typeof source.slot === "string" ? source.slot : "",
                label: typeof source.label === "string" ? source.label : "",
                questionnaireId:
                    typeof source.questionnaireId === "string"
                        ? source.questionnaireId
                        : "",
                questionnaireCode:
                    typeof source.questionnaireCode === "string"
                        ? source.questionnaireCode
                        : "",
                questionnaireName:
                    typeof source.questionnaireName === "string"
                        ? source.questionnaireName
                        : "",
                required: Boolean(source.required),
            };
        })
        .filter((source) => source.slot && source.questionnaireId);
}

function dateTime(value: unknown) {
    if (!value) return 0;

    const date = value instanceof Date ? value : new Date(String(value));

    return Number.isFinite(date.getTime()) ? date.getTime() : 0;
}

export async function getPartnerAssessmentProjectRespondents({
    tenantSlug,
    projectId,
}: {
    tenantSlug: string;
    projectId: string;
}) {
    const ctx = await requireTenantContext({ tenantSlug });

    requirePermission(ctx, "assessment_project:read");

    const db = await getTenantDb(ctx);

    const project = await db.query.assessmentProjects.findFirst({
        where: and(
            eq(assessmentProjects.id, projectId),
            isNull(assessmentProjects.deletedAt),
        ),
        columns: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    if (!project) {
        return null;
    }

    const sessionRows = await db
        .select({
            sessionId: assessmentSessions.id,
            sessionStatus: assessmentSessions.status,
            sessionCreatedAt: assessmentSessions.createdAt,
            sessionUpdatedAt: assessmentSessions.updatedAt,
            sessionCompletedAt: assessmentSessions.completedAt,

            accessLinkId: assessmentSessions.accessLinkId,
            respondentId: respondents.id,
            respondentEmail: respondentIdentities.email,

            snapshotId: assessmentResultSnapshots.id,
            snapshotCreatedAt: assessmentResultSnapshots.createdAt,
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
        .leftJoin(
            assessmentResultSnapshots,
            and(
                eq(
                    assessmentResultSnapshots.assessmentSessionId,
                    assessmentSessions.id,
                ),
                isNull(assessmentResultSnapshots.deletedAt),
            ),
        )
        .where(
            and(
                eq(assessmentSessions.assessmentProjectId, projectId),
                isNull(assessmentSessions.deletedAt),
                isNull(respondents.deletedAt),
                isNull(respondentIdentities.deletedAt),
            ),
        )
        .orderBy(desc(assessmentSessions.updatedAt));

    const sessionIds = sessionRows.map((row: any) => row.sessionId);
    const responseQuestionnaireRows =
        sessionIds.length > 0
            ? await db
                .select({
                    sessionId: assessmentResponses.assessmentSessionId,
                    questionnaireId: assessmentResponses.questionnaireId,
                    questionnaireVersionId:
                        assessmentResponses.questionnaireVersionId,
                    responseCount: count(assessmentResponses.id),
                })
                .from(assessmentResponses)
                .where(
                    and(
                        inArray(
                            assessmentResponses.assessmentSessionId,
                            sessionIds,
                        ),
                        isNull(assessmentResponses.deletedAt),
                    ),
                )
                .groupBy(
                    assessmentResponses.assessmentSessionId,
                    assessmentResponses.questionnaireId,
                    assessmentResponses.questionnaireVersionId,
                )
            : [];

    const questionnaireVersionIds = Array.from(
        new Set(
            responseQuestionnaireRows
                .map((row: any) => row.questionnaireVersionId)
                .filter((value: unknown): value is string =>
                    typeof value === "string" && value.length > 0,
                ),
        ),
    );

    const questionnaireRows =
        questionnaireVersionIds.length > 0
            ? await controlDb
                .select({
                    questionnaireId: questionnaires.id,
                    questionnaireCode: questionnaires.code,
                    questionnaireName: questionnaires.name,
                    questionnaireVersionId: questionnaireVersions.id,
                    questionnaireVersion: questionnaireVersions.version,
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

    const questionnaireByVersionId = new Map(
        questionnaireRows.map((row) => [row.questionnaireVersionId, row]),
    );

    const responseQuestionnairesBySessionId = new Map<
        string,
        typeof responseQuestionnaireRows
    >();

    for (const row of responseQuestionnaireRows) {
        const existing =
            responseQuestionnairesBySessionId.get(row.sessionId) ?? [];

        existing.push(row);
        responseQuestionnairesBySessionId.set(row.sessionId, existing);
    }
    const grantRows =
        sessionIds.length > 0
            ? await controlDb
                .select({
                    id: reportAccessGrants.id,
                    tenantSlug: reportAccessGrants.tenantSlug,
                    assessmentSessionId: reportAccessGrants.assessmentSessionId,

                    source: reportAccessGrants.source,
                    status: reportAccessGrants.status,
                    validFrom: reportAccessGrants.validFrom,
                    validUntil: reportAccessGrants.validUntil,

                    reportTemplateId: reportAccessGrants.reportTemplateId,
                    reportTemplateVersionId:
                        reportAccessGrants.reportTemplateVersionId,

                    reportTemplateCode: reportTemplates.code,
                    reportTemplateName: reportTemplates.name,

                    reportTemplateVersionName: reportTemplateVersions.name,
                    reportTemplateVersion: reportTemplateVersions.version,
                })
                .from(reportAccessGrants)
                .innerJoin(
                    reportTemplates,
                    eq(reportTemplates.id, reportAccessGrants.reportTemplateId),
                )
                .innerJoin(
                    reportTemplateVersions,
                    eq(
                        reportTemplateVersions.id,
                        reportAccessGrants.reportTemplateVersionId,
                    ),
                )
                .where(
                    and(
                        eq(reportAccessGrants.tenantSlug, tenantSlug),
                        inArray(reportAccessGrants.assessmentSessionId, sessionIds),
                        isNull(reportAccessGrants.deletedAt),
                        isNull(reportTemplates.deletedAt),
                        isNull(reportTemplateVersions.deletedAt),
                    ),
                )
            : [];

    const grantsBySessionId = new Map<string, typeof grantRows>();

    for (const grant of grantRows) {
        if (!grant.assessmentSessionId) {
            continue;
        }

        const existing = grantsBySessionId.get(grant.assessmentSessionId) ?? [];
        existing.push(grant);
        grantsBySessionId.set(grant.assessmentSessionId, existing);
    }


    const activeReportAccessProducts = await controlDb
        .select({
            id: reportAccessProducts.id,
            reportTemplateId: reportAccessProducts.reportTemplateId,
            code: reportAccessProducts.code,
            name: reportAccessProducts.name,
            status: reportAccessProducts.status,
            currency: reportAccessProducts.currency,
            priceGross: reportAccessProducts.priceGross,

            reportTemplateKind: reportTemplates.kind,
            reportTemplateCode: reportTemplates.code,
            reportTemplateName: reportTemplates.name,
        })
        .from(reportAccessProducts)
        .innerJoin(
            reportTemplates,
            eq(reportTemplates.id, reportAccessProducts.reportTemplateId),
        )
        .where(
            and(
                eq(reportAccessProducts.status, "active"),
                eq(reportTemplates.status, "active"),
                isNull(reportAccessProducts.deletedAt),
                isNull(reportTemplates.deletedAt),
            ),
        );

    const accessCodeStatsRows =
        activeReportAccessProducts.length > 0
            ? await controlDb
                .select({
                    productId: reportAccessCodes.productId,
                    status: reportAccessCodes.status,
                    count: count(reportAccessCodes.id),
                })
                .from(reportAccessCodes)
                .where(
                    and(
                        eq(reportAccessCodes.tenantSlug, tenantSlug),
                        inArray(
                            reportAccessCodes.productId,
                            activeReportAccessProducts.map((product) => product.id),
                        ),
                        or(
                            isNull(reportAccessCodes.assessmentProjectId),
                            eq(reportAccessCodes.assessmentProjectId, projectId),
                        ),
                        isNull(reportAccessCodes.deletedAt),
                    ),
                )
                .groupBy(reportAccessCodes.productId, reportAccessCodes.status)
            : [];
    const billingProfile = await controlDb.query.billingProfiles.findFirst({
        where: and(
            eq(billingProfiles.ownerType, "tenant"),
            eq(billingProfiles.tenantSlug, tenantSlug),
            isNull(billingProfiles.deletedAt),
        ),
        orderBy: (profiles, { desc }) => [desc(profiles.updatedAt)],
    });

    const accessCodeStatsByProductId = new Map<
        string,
        {
            available: number;
            assigned: number;
            redeemed: number;
            expired: number;
            cancelled: number;
            total: number;
        }
    >();

    for (const row of accessCodeStatsRows) {
        const current =
            accessCodeStatsByProductId.get(row.productId) ?? {
                available: 0,
                assigned: 0,
                redeemed: 0,
                expired: 0,
                cancelled: 0,
                total: 0,
            };

        const value = Number(row.count ?? 0);

        current.total += value;

        if (row.status === "available") current.available += value;
        if (row.status === "assigned") current.assigned += value;
        if (row.status === "redeemed") current.redeemed += value;
        if (row.status === "expired") current.expired += value;
        if (row.status === "cancelled") current.cancelled += value;

        accessCodeStatsByProductId.set(row.productId, current);
    }

    const reportAccessProductsWithAvailability = activeReportAccessProducts.map(
        (product) => {
            const stats =
                accessCodeStatsByProductId.get(product.id) ?? {
                    available: 0,
                    assigned: 0,
                    redeemed: 0,
                    expired: 0,
                    cancelled: 0,
                    total: 0,
                };

            return {
                ...product,
                availableCount: stats.available,
                assignedCount: stats.assigned,
                redeemedCount: stats.redeemed,
                expiredCount: stats.expired,
                cancelledCount: stats.cancelled,
                totalCount: stats.total,
            };
        },
    );


    const reportAccessProductById = new Map(
        reportAccessProductsWithAvailability.map((product) => [product.id, product]),
    );

    const compositeReportTemplateVersionRows =
        reportAccessProductsWithAvailability.length > 0
            ? await controlDb
                .select({
                    productId: reportAccessProducts.id,

                    reportTemplateId: reportTemplates.id,
                    reportTemplateCode: reportTemplates.code,
                    reportTemplateName: reportTemplates.name,
                    reportTemplateDescription: reportTemplates.description,
                    reportTemplateKind: reportTemplates.kind,

                    reportTemplateVersionId: reportTemplateVersions.id,
                    reportTemplateVersionName: reportTemplateVersions.name,
                    reportTemplateVersion: reportTemplateVersions.version,
                    dataBindings: reportTemplateVersions.dataBindings,
                })
                .from(reportAccessProducts)
                .innerJoin(
                    reportTemplates,
                    eq(reportTemplates.id, reportAccessProducts.reportTemplateId),
                )
                .innerJoin(
                    reportTemplateVersions,
                    eq(reportTemplateVersions.reportTemplateId, reportTemplates.id),
                )
                .where(
                    and(
                        inArray(
                            reportAccessProducts.id,
                            reportAccessProductsWithAvailability.map((product) => product.id),
                        ),
                        eq(reportAccessProducts.status, "active"),
                        eq(reportTemplates.status, "active"),
                        eq(reportTemplates.kind, "personal_composite"),
                        eq(reportTemplateVersions.status, "active"),
                        isNull(reportAccessProducts.deletedAt),
                        isNull(reportTemplates.deletedAt),
                        isNull(reportTemplateVersions.deletedAt),
                    ),
                )
            : [];

    const activeReportTemplateVersionRows =
        activeReportAccessProducts.length > 0
            ? await controlDb
                .select({
                    reportTemplateId: reportTemplateVersions.reportTemplateId,
                    questionnaireVersionId:
                        reportTemplateVersions.questionnaireVersionId,
                })
                .from(reportTemplateVersions)
                .where(
                    and(
                        inArray(
                            reportTemplateVersions.reportTemplateId,
                            activeReportAccessProducts.map(
                                (product) => product.reportTemplateId,
                            ),
                        ),
                        eq(reportTemplateVersions.status, "active"),
                        isNull(reportTemplateVersions.deletedAt),
                    ),
                )
            : [];



    const compatibleQuestionnaireVersionIdsByReportTemplateId = new Map<
        string,
        Set<string>
    >();

    for (const row of activeReportTemplateVersionRows) {
        if (!row.questionnaireVersionId) {
            continue;
        }

        const current =
            compatibleQuestionnaireVersionIdsByReportTemplateId.get(
                row.reportTemplateId,
            ) ?? new Set<string>();

        current.add(row.questionnaireVersionId);

        compatibleQuestionnaireVersionIdsByReportTemplateId.set(
            row.reportTemplateId,
            current,
        );
    }

    const sessionsBase = sessionRows.map((session: any) => {
        const grants = grantsBySessionId.get(session.sessionId) ?? [];

        const responseQuestionnaires =
            responseQuestionnairesBySessionId.get(session.sessionId) ?? [];

        const validResponseQuestionnaires = responseQuestionnaires.filter(
            (row: any) =>
                typeof row.questionnaireVersionId === "string" &&
                row.questionnaireVersionId.length > 0,
        );

        const totalResponseCount = validResponseQuestionnaires.reduce(
            (sum: number, row: any) => sum + Number(row.responseCount ?? 0),
            0,
        );

        const singleResponseQuestionnaire =
            validResponseQuestionnaires.length === 1
                ? validResponseQuestionnaires[0]
                : null;

        const questionnaireMeta =
            singleResponseQuestionnaire?.questionnaireVersionId
                ? questionnaireByVersionId.get(
                    singleResponseQuestionnaire.questionnaireVersionId,
                )
                : null;

        const completedQuestionnaire = singleResponseQuestionnaire
            ? {
                questionnaireId: singleResponseQuestionnaire.questionnaireId ?? null,
                questionnaireVersionId:
                    singleResponseQuestionnaire.questionnaireVersionId ?? null,
                questionnaireCode: questionnaireMeta?.questionnaireCode ?? null,
                questionnaireName: questionnaireMeta?.questionnaireName ?? null,
                questionnaireVersion: questionnaireMeta?.questionnaireVersion ?? null,
                responseCount: Number(singleResponseQuestionnaire.responseCount ?? 0),
                isAmbiguous: false,
            }
            : validResponseQuestionnaires.length > 1
                ? {
                    questionnaireId: null,
                    questionnaireVersionId: null,
                    questionnaireCode: null,
                    questionnaireName: "Niejednoznaczne odpowiedzi",
                    questionnaireVersion: null,
                    responseCount: totalResponseCount,
                    isAmbiguous: true,
                }
                : null;

        return {
            ...session,
            hasSnapshot: Boolean(session.snapshotId),
            completedQuestionnaire,
            grants: grants.map((grant) => ({
                ...grant,
                isCurrentlyActive: isGrantCurrentlyActive(grant),
                partnerReportHref: `/t/${tenantSlug}/assessment-sessions/${session.sessionId}/report/${grant.reportTemplateVersionId}`,
            })),
        };
    });

    const sessions = sessionsBase.map((session: any) => {
        const completedQuestionnaire = session.completedQuestionnaire;

        const completedQuestionnaireVersionId =
            completedQuestionnaire && !completedQuestionnaire.isAmbiguous
                ? completedQuestionnaire.questionnaireVersionId
                : null;

        const compatibleReportAccessProducts = completedQuestionnaireVersionId
            ? reportAccessProductsWithAvailability.filter((product) => {
                if (product.availableCount <= 0) {
                    return false;
                }

                const compatibleQuestionnaireVersionIds =
                    compatibleQuestionnaireVersionIdsByReportTemplateId.get(
                        product.reportTemplateId,
                    );

                return Boolean(
                    compatibleQuestionnaireVersionIds?.has(
                        completedQuestionnaireVersionId,
                    ),
                );
            })
            : [];

        return {
            ...session,
            compatibleReportAccessProducts,
        };
    });


    const respondentIds = Array.from(
        new Set(
            sessionsBase
                .map((session: any) => session.respondentId)
                .filter((value: unknown): value is string => typeof value === "string"),
        ),
    );

    const compositeReportTemplateVersionIds = compositeReportTemplateVersionRows.map(
        (row) => row.reportTemplateVersionId,
    );

    const compositeGrantRows =
        respondentIds.length > 0 && compositeReportTemplateVersionIds.length > 0
            ? await controlDb
                .select({
                    id: reportAccessGrants.id,
                    subjectId: reportAccessGrants.subjectId,
                    assessmentProjectId: reportAccessGrants.assessmentProjectId,
                    reportTemplateId: reportAccessGrants.reportTemplateId,
                    reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
                    source: reportAccessGrants.source,
                    status: reportAccessGrants.status,
                    validFrom: reportAccessGrants.validFrom,
                    validUntil: reportAccessGrants.validUntil,

                    reportTemplateName: reportTemplates.name,
                    reportTemplateVersionName: reportTemplateVersions.name,
                    reportTemplateVersion: reportTemplateVersions.version,
                })
                .from(reportAccessGrants)
                .innerJoin(
                    reportTemplates,
                    eq(reportTemplates.id, reportAccessGrants.reportTemplateId),
                )
                .innerJoin(
                    reportTemplateVersions,
                    eq(reportTemplateVersions.id, reportAccessGrants.reportTemplateVersionId),
                )
                .where(
                    and(
                        eq(reportAccessGrants.tenantSlug, tenantSlug),
                        eq(reportAccessGrants.subjectType, "respondent"),
                        inArray(reportAccessGrants.subjectId, respondentIds),
                        eq(reportAccessGrants.assessmentProjectId, projectId),
                        inArray(
                            reportAccessGrants.reportTemplateVersionId,
                            compositeReportTemplateVersionIds,
                        ),
                        isNull(reportAccessGrants.deletedAt),
                        isNull(reportTemplates.deletedAt),
                        isNull(reportTemplateVersions.deletedAt),
                    ),
                )
            : [];

    const compositeGrantsByRespondentAndVersion = new Map<
        string,
        typeof compositeGrantRows
    >();

    for (const grant of compositeGrantRows) {
        if (!grant.subjectId) continue;

        const key = `${grant.subjectId}::${grant.reportTemplateVersionId}`;
        const current = compositeGrantsByRespondentAndVersion.get(key) ?? [];

        current.push(grant);
        compositeGrantsByRespondentAndVersion.set(key, current);
    }


    const sessionsByRespondentId = new Map<string, typeof sessions>();

    for (const session of sessions) {
        const current = sessionsByRespondentId.get(session.respondentId) ?? [];
        current.push(session);
        sessionsByRespondentId.set(session.respondentId, current);
    }

    const respondentsWithCompositeReports = Array.from(
        sessionsByRespondentId.entries(),
    ).map(([respondentId, respondentSessions]) => {
        const respondentEmail =
            respondentSessions.find((session: any) => session.respondentEmail)
                ?.respondentEmail ?? null;

        const compositeReports = compositeReportTemplateVersionRows.map((template) => {
            const product = reportAccessProductById.get(template.productId);
            const requiredSources = readCompositeRequiredSources(template.dataBindings);

            const selectedSources = requiredSources.map((source) => {
                const candidates = respondentSessions
                    .filter((session: any) => {
                        const completedQuestionnaire = session.completedQuestionnaire;

                        return (
                            session.sessionStatus === "completed" &&
                            session.hasSnapshot &&
                            completedQuestionnaire &&
                            !completedQuestionnaire.isAmbiguous &&
                            completedQuestionnaire.questionnaireId === source.questionnaireId
                        );
                    })
                    .sort(
                        (a: any, b: any) =>
                            dateTime(b.sessionCompletedAt) - dateTime(a.sessionCompletedAt),
                    );

                const selected = candidates[0] ?? null;

                return {
                    ...source,
                    available: Boolean(selected),
                    selectedAssessmentSessionId: selected?.sessionId ?? null,
                    selectedAssessmentResultSnapshotId: selected?.snapshotId ?? null,
                    selectedCompletedAt: selected?.sessionCompletedAt ?? null,
                    candidateCount: candidates.length,
                };
            });

            const missingRequiredSources = selectedSources.filter(
                (source) => source.required && !source.available,
            );

            const existingGrants =
                compositeGrantsByRespondentAndVersion.get(
                    `${respondentId}::${template.reportTemplateVersionId}`,
                ) ?? [];

            const activeExistingGrant =
                existingGrants.find((grant) => isGrantCurrentlyActive(grant)) ?? null;

            const availableCount = Number(product?.availableCount ?? 0);
            const canGrant =
                !activeExistingGrant &&
                missingRequiredSources.length === 0 &&
                availableCount > 0 &&
                Boolean(product);

            return {
                product: product
                    ? {
                        id: product.id,
                        code: product.code,
                        name: product.name,
                        reportTemplateId: product.reportTemplateId,
                        currency: product.currency,
                        priceGross: product.priceGross,
                        availableCount: product.availableCount,
                    }
                    : null,

                reportTemplateId: template.reportTemplateId,
                reportTemplateCode: template.reportTemplateCode,
                reportTemplateName: template.reportTemplateName,
                reportTemplateDescription: template.reportTemplateDescription,

                reportTemplateVersionId: template.reportTemplateVersionId,
                reportTemplateVersionName: template.reportTemplateVersionName,
                reportTemplateVersion: template.reportTemplateVersion,

                selectionMode: "same_project",
                selectedSources,
                missingRequiredSources,

                existingGrant: activeExistingGrant
                    ? {
                        id: activeExistingGrant.id,
                        reportTemplateVersionId: activeExistingGrant.reportTemplateVersionId,
                        source: activeExistingGrant.source,
                    }
                    : null,

                availableCount,
                canGrant,

                status: activeExistingGrant
                    ? "already_granted"
                    : missingRequiredSources.length > 0
                        ? "missing_sources"
                        : availableCount <= 0
                            ? "missing_pool"
                            : "ready",
            };
        });

        return {
            respondentId,
            respondentEmail,
            sessions: respondentSessions,
            compositeReports,
        };
    });

console.log("REPORT ACCESS PRODUCTS DEBUG", {
  activeCount: activeReportAccessProducts.length,
  products: activeReportAccessProducts.map((product) => ({
    id: product.id,
    code: product.code,
    name: product.name,
    status: product.status,
    reportTemplateId: product.reportTemplateId,
  })),
});

    return {
        tenant: {
            id: ctx.tenantId,
            slug: ctx.tenantSlug,
            name: ctx.tenantSlug,
        },
        project,
        sessions,
        respondents: respondentsWithCompositeReports,
        reportAccessProducts: reportAccessProductsWithAvailability,
        billingProfile,
    };
}