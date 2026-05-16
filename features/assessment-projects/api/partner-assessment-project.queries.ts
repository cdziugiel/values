import {
    and,
    count,
    desc,
    eq,
    inArray,
    isNull,
    or,
    sql,
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
} from "@/drizzle/schema";



import {
    assessmentProjects,
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
        const existing = grantsBySessionId.get(grant.assessmentSessionId) ?? [];
        existing.push(grant);
        grantsBySessionId.set(grant.assessmentSessionId, existing);
    }

    const sessions = sessionRows.map((session: any) => {
        const grants = grantsBySessionId.get(session.sessionId) ?? [];

        return {
            ...session,
            hasSnapshot: Boolean(session.snapshotId),
            grants: grants.map((grant) => ({
                ...grant,
                isCurrentlyActive: isGrantCurrentlyActive(grant),
                partnerReportHref: `/t/${tenantSlug}/assessment-sessions/${session.sessionId}/report/${grant.reportTemplateVersionId}`,
            })),
        };
    });

    const activeReportAccessProducts = await controlDb
        .select({
            id: reportAccessProducts.id,
            reportTemplateId: reportAccessProducts.reportTemplateId,
            code: reportAccessProducts.code,
            name: reportAccessProducts.name,
            status: reportAccessProducts.status,
            currency: reportAccessProducts.currency,
            priceGross: reportAccessProducts.priceGross,
        })
        .from(reportAccessProducts)
        .where(
            and(
                eq(reportAccessProducts.status, "active"),
                isNull(reportAccessProducts.deletedAt),
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
    const availableCodeCountRows =
        activeReportAccessProducts.length > 0
            ? await controlDb
                .select({
                    productId: reportAccessCodes.productId,
                    availableCount: count(reportAccessCodes.id),
                })
                .from(reportAccessCodes)
                .where(
                    and(
                        eq(reportAccessCodes.tenantSlug, tenantSlug),
                        inArray(
                            reportAccessCodes.productId,
                            activeReportAccessProducts.map((product) => product.id),
                        ),
                        eq(reportAccessCodes.status, "available"),
                        isNull(reportAccessCodes.assessmentSessionId),
                        isNull(reportAccessCodes.assessmentAccessLinkId),
                        isNull(reportAccessCodes.assignedToEmail),
                        isNull(reportAccessCodes.assignedToUserId),
                        isNull(reportAccessCodes.deletedAt),
                    ),
                )
                .groupBy(reportAccessCodes.productId)
            : [];

    const availableCodeCountByProductId = new Map(
        availableCodeCountRows.map((row) => [
            row.productId,
            Number(row.availableCount ?? 0),
        ]),
    );


    return {
        tenant: {
            id: ctx.tenantId,
            slug: ctx.tenantSlug,
            name: ctx.tenantSlug,
        },
        project,
        sessions,
        reportAccessProducts: reportAccessProductsWithAvailability,
        billingProfile,
    };
}