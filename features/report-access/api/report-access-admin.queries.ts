import { and, desc, eq, isNull } from "drizzle-orm";

import {
    reportAccessCodes,
    reportAccessProducts,
    reportTemplates,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";

export async function getReportAccessAdminData() {
    const templates = await controlDb
        .select({
            id: reportTemplates.id,
            code: reportTemplates.code,
            name: reportTemplates.name,
            description: reportTemplates.description,
            status: reportTemplates.status,
        })
        .from(reportTemplates)
        .where(isNull(reportTemplates.deletedAt))
        .orderBy(reportTemplates.name);

    const products = await controlDb
        .select({
            id: reportAccessProducts.id,
            reportTemplateId: reportAccessProducts.reportTemplateId,

            code: reportAccessProducts.code,
            name: reportAccessProducts.name,
            description: reportAccessProducts.description,
            status: reportAccessProducts.status,

            accessCount: reportAccessProducts.accessCount,
            currency: reportAccessProducts.currency,
            priceNet: reportAccessProducts.priceNet,
            vatRate: reportAccessProducts.vatRate,
            priceGross: reportAccessProducts.priceGross,

            createdAt: reportAccessProducts.createdAt,
            updatedAt: reportAccessProducts.updatedAt,

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
                isNull(reportAccessProducts.deletedAt),
                isNull(reportTemplates.deletedAt),
            ),
        )
        .orderBy(desc(reportAccessProducts.updatedAt));

    const recentCodes = await controlDb
        .select({
            id: reportAccessCodes.id,
            tenantSlug: reportAccessCodes.tenantSlug,
            codePreview: reportAccessCodes.codePreview,
            status: reportAccessCodes.status,
            assignedEmail: reportAccessCodes.assignedToEmail,
            redeemedAt: reportAccessCodes.redeemedAt,
            expiresAt: reportAccessCodes.validUntil,
            createdAt: reportAccessCodes.createdAt,

            productId: reportAccessProducts.id,
            productCode: reportAccessProducts.code,
            productName: reportAccessProducts.name,
            assignedToEmail: reportAccessCodes.assignedToEmail,
            assignedToUserId: reportAccessCodes.assignedToUserId,

            assessmentProjectId: reportAccessCodes.assessmentProjectId,
            assessmentSessionId: reportAccessCodes.assessmentSessionId,
            assessmentAccessLinkId: reportAccessCodes.assessmentAccessLinkId,
        })
        .from(reportAccessCodes)
        .innerJoin(
            reportAccessProducts,
            eq(reportAccessProducts.id, reportAccessCodes.productId),
        )
        .where(
            and(
                isNull(reportAccessCodes.deletedAt),
                isNull(reportAccessProducts.deletedAt),
            ),
        )
        .orderBy(desc(reportAccessCodes.createdAt))
        .limit(50);

    return {
        templates,
        products,
        recentCodes,
    };
}