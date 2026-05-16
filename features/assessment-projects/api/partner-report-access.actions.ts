"use server";

import crypto from "crypto";
import { and, eq, isNull, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import {
    reportAccessCodes,
    reportAccessGrants,
    reportAccessOrderItems,
    reportAccessOrders,
    reportAccessProducts,
    billingProfiles,
} from "@/drizzle/schema";

import { assessmentProjects, assessmentSessions } from "@/drizzle/schema/tenant-schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import { autoGrantReportAccessForCompletedSession } from "@/features/report-access/api/report-access-auto-grant.mutations";

function nullableString(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();
    return normalized || null;
}

function booleanValue(value: FormDataEntryValue | null) {
    return value === "on" || value === "true" || value === "1";
}

function buildBillingSnapshot(input: {
    invoiceRequested: boolean;
    billingType: string | null;
    companyName: string | null;
    taxId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    postalCode: string | null;
    city: string | null;
    street: string | null;
    buildingNumber: string | null;
    apartmentNumber: string | null;
    invoiceEmail: string | null;
}) {
    return {
        invoiceRequested: input.invoiceRequested,
        type: input.billingType ?? "company",

        companyName: input.companyName,
        taxId: input.taxId,

        firstName: input.firstName,
        lastName: input.lastName,

        email: input.email,
        phone: input.phone,

        address: {
            country: input.country ?? "PL",
            postalCode: input.postalCode,
            city: input.city,
            street: input.street,
            buildingNumber: input.buildingNumber,
            apartmentNumber: input.apartmentNumber,
        },

        invoiceEmail: input.invoiceEmail ?? input.email,
    };
}

export type PartnerGrantReportAccessState = {
    status: "idle" | "success" | "error";
    message: string;
};

function fail(message: string): PartnerGrantReportAccessState {
    return {
        status: "error",
        message,
    };
}

function success(message: string): PartnerGrantReportAccessState {
    return {
        status: "success",
        message,
    };
}

function normalizeString(value: FormDataEntryValue | null) {
    const normalized = String(value ?? "").trim();

    return normalized || null;
}
function moneyNumber(value: unknown) {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
}

function moneyString(value: number) {
    return value.toFixed(2);
}

function multiplyMoney(unit: number, quantity: number) {
    return Number((unit * quantity).toFixed(2));
}

function createAccessCode() {
    const random = crypto
        .randomUUID()
        .replaceAll("-", "")
        .slice(0, 16)
        .toUpperCase();

    return `HV-${random.slice(0, 4)}-${random.slice(4, 8)}-${random.slice(
        8,
        12,
    )}-${random.slice(12, 16)}`;
}

function hashAccessCode(code: string) {
    return crypto.createHash("sha256").update(code).digest("hex");
}

function previewAccessCode(code: string) {
    const parts = code.split("-");

    if (parts.length >= 5) {
        return `${parts[0]}-${parts[1]}-****-****-${parts[4]}`;
    }

    return `${code.slice(0, 7)}…`;
}

async function createUniqueAccessCode() {
    let code = createAccessCode();
    let codeHash = hashAccessCode(code);

    let existing = await controlDb.query.reportAccessCodes.findFirst({
        where: and(
            eq(reportAccessCodes.codeHash, codeHash),
            isNull(reportAccessCodes.deletedAt),
        ),
    });

    while (existing) {
        code = createAccessCode();
        codeHash = hashAccessCode(code);

        existing = await controlDb.query.reportAccessCodes.findFirst({
            where: and(
                eq(reportAccessCodes.codeHash, codeHash),
                isNull(reportAccessCodes.deletedAt),
            ),
        });
    }

    return {
        code,
        codeHash,
        codePreview: previewAccessCode(code),
    };
}

export async function grantReportAccessToCompletedSessionAction(
    _previousState: PartnerGrantReportAccessState,
    formData: FormData,
): Promise<PartnerGrantReportAccessState> {
    const tenantSlug = normalizeString(formData.get("tenantSlug"));
    const sessionId = normalizeString(formData.get("sessionId"));
    const productId = normalizeString(formData.get("productId"));

    if (!tenantSlug || !sessionId || !productId) {
        return fail("Brakuje tenanta, sesji albo produktu dostępu.");
    }

    const authSession = await requireSession();

    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    const session = await db.query.assessmentSessions.findFirst({
        where: and(
            eq(assessmentSessions.id, sessionId),
            isNull(assessmentSessions.deletedAt),
        ),
        columns: {
            id: true,
            status: true,
            assessmentProjectId: true,
            accessLinkId: true,
        },
    });

    if (!session) {
        return fail("Nie znaleziono sesji badania.");
    }

    if (session.status !== "completed") {
        return fail("Dostęp do raportu można nadać dopiero po zakończeniu sesji.");
    }

    const product = await controlDb.query.reportAccessProducts.findFirst({
        where: and(
            eq(reportAccessProducts.id, productId),
            eq(reportAccessProducts.status, "active"),
            isNull(reportAccessProducts.deletedAt),
        ),
    });

    if (!product) {
        return fail("Nie znaleziono aktywnego produktu dostępu.");
    }

    const existingGrant = await controlDb.query.reportAccessGrants.findFirst({
        where: and(
            eq(reportAccessGrants.tenantSlug, tenantSlug),
            eq(reportAccessGrants.assessmentSessionId, sessionId),
            eq(reportAccessGrants.reportTemplateId, product.reportTemplateId),
            eq(reportAccessGrants.status, "active"),
            isNull(reportAccessGrants.deletedAt),
        ),
    });

    if (existingGrant) {
        revalidatePath(`/dashboard/partner-assessment/${tenantSlug}/projects/${session.assessmentProjectId}`);

        return success("Ta sesja ma już aktywny dostęp do tego typu raportu.");
    }

    const now = new Date();

    const validUntil =
        typeof product.validityDays === "number" && product.validityDays > 0
            ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
            : null;

    const availableCode = await controlDb.query.reportAccessCodes.findFirst({
        where: and(
            eq(reportAccessCodes.tenantSlug, tenantSlug),
            eq(reportAccessCodes.productId, product.id),
            eq(reportAccessCodes.status, "available"),

            or(
                isNull(reportAccessCodes.assessmentProjectId),
                eq(reportAccessCodes.assessmentProjectId, session.assessmentProjectId),
            ),

            isNull(reportAccessCodes.assessmentSessionId),
            isNull(reportAccessCodes.assessmentAccessLinkId),
            isNull(reportAccessCodes.assignedToEmail),
            isNull(reportAccessCodes.assignedToUserId),
            isNull(reportAccessCodes.deletedAt),
        ),
        orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    });

    if (!availableCode) {
        return fail(
            "Brak dostępnych dostępów w puli dla tego produktu. Najpierw wygeneruj lub kup dostęp dla tenanta.",
        );
    }

    await controlDb
        .update(reportAccessCodes)
        .set({
            status: "assigned",

            assessmentProjectId: session.assessmentProjectId,
            assessmentSessionId: session.id,
            assessmentAccessLinkId: session.accessLinkId,

            metadata: {
                ...(typeof availableCode.metadata === "object" &&
                    availableCode.metadata !== null &&
                    !Array.isArray(availableCode.metadata)
                    ? availableCode.metadata
                    : {}),
                assignedFrom: "partner_assessment_project_session",
                assignedByUserId: authSession.user.id,
                assignedAt: now.toISOString(),
                autoGrantImmediately: true,
            },

            updatedAt: now,
            updatedBy: authSession.user.id,
        })
        .where(eq(reportAccessCodes.id, availableCode.id));

    const autoGrantResult = await autoGrantReportAccessForCompletedSession({
        db,
        tenantSlug,
        sessionId: session.id,
        actorUserId: authSession.user.id,
        actorEmail: authSession.user.email ?? null,
    });

    revalidatePath(
        `/dashboard/partner-assessment/${tenantSlug}/projects/${session.assessmentProjectId}`,
    );

    if (!autoGrantResult.ok) {
        return fail(autoGrantResult.message);
    }

    if (!autoGrantResult.granted) {
        return success(autoGrantResult.message);
    }

    return success("Nadano dostęp do raportu dla tej sesji.");
}

export async function bulkGrantReportAccessToCompletedSessionsAction(
    _previousState: PartnerGrantReportAccessState,
    formData: FormData,
): Promise<PartnerGrantReportAccessState> {
    const tenantSlug = normalizeString(formData.get("tenantSlug"));
    const projectId = normalizeString(formData.get("projectId"));
    const productId = normalizeString(formData.get("productId"));

    const rawSessionIds = formData.getAll("sessionIds");
    const sessionIds = rawSessionIds
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);

    if (!tenantSlug || !projectId || !productId) {
        return fail("Brakuje tenanta, projektu albo produktu dostępu.");
    }

    if (sessionIds.length === 0) {
        return fail("Nie zaznaczono żadnej sesji.");
    }

    const authSession = await requireSession();

    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    const product = await controlDb.query.reportAccessProducts.findFirst({
        where: and(
            eq(reportAccessProducts.id, productId),
            eq(reportAccessProducts.status, "active"),
            isNull(reportAccessProducts.deletedAt),
        ),
    });

    if (!product) {
        return fail("Nie znaleziono aktywnego produktu dostępu.");
    }

    const availableCodes = await controlDb.query.reportAccessCodes.findMany({
        where: and(
            eq(reportAccessCodes.tenantSlug, tenantSlug),
            eq(reportAccessCodes.productId, product.id),
            eq(reportAccessCodes.status, "available"),

            or(
                isNull(reportAccessCodes.assessmentProjectId),
                eq(reportAccessCodes.assessmentProjectId, projectId),
            ),

            isNull(reportAccessCodes.assessmentSessionId),
            isNull(reportAccessCodes.assessmentAccessLinkId),
            isNull(reportAccessCodes.assignedToEmail),
            isNull(reportAccessCodes.assignedToUserId),
            isNull(reportAccessCodes.deletedAt),
        ),
        orderBy: (codes, { asc }) => [asc(codes.createdAt)],
        limit: sessionIds.length,
    });
    if (availableCodes.length < sessionIds.length) {
        return fail(
            `Brakuje wolnych dostępów w puli. Zaznaczono ${sessionIds.length}, dostępnych jest ${availableCodes.length}.`,
        );
    }

    const sessions = await db.query.assessmentSessions.findMany({
        where: and(
            inArray(assessmentSessions.id, sessionIds),
            eq(assessmentSessions.assessmentProjectId, projectId),
            eq(assessmentSessions.status, "completed"),
            isNull(assessmentSessions.deletedAt),
        ),
        columns: {
            id: true,
            status: true,
            assessmentProjectId: true,
            accessLinkId: true,
        },
    });

    if (sessions.length === 0) {
        return fail("Nie znaleziono zakończonych sesji do nadania dostępu.");
    }

    if (sessions.length !== sessionIds.length) {
        return fail(
            "Część zaznaczonych sesji nie istnieje, nie należy do projektu albo nie jest zakończona.",
        );
    }

    let grantedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    const now = new Date();

    for (let index = 0; index < sessions.length; index += 1) {
        const session = sessions[index];
        const availableCode = availableCodes[index];

        const existingGrant = await controlDb.query.reportAccessGrants.findFirst({
            where: and(
                eq(reportAccessGrants.tenantSlug, tenantSlug),
                eq(reportAccessGrants.assessmentSessionId, session.id),
                eq(reportAccessGrants.reportTemplateId, product.reportTemplateId),
                eq(reportAccessGrants.status, "active"),
                isNull(reportAccessGrants.deletedAt),
            ),
        });

        if (existingGrant) {
            skippedCount += 1;
            continue;
        }

        await controlDb
            .update(reportAccessCodes)
            .set({
                status: "assigned",

                assessmentProjectId: session.assessmentProjectId,
                assessmentSessionId: session.id,
                assessmentAccessLinkId: session.accessLinkId,

                metadata: {
                    ...(typeof availableCode.metadata === "object" &&
                        availableCode.metadata !== null &&
                        !Array.isArray(availableCode.metadata)
                        ? availableCode.metadata
                        : {}),
                    assignedFrom: "partner_assessment_project_bulk",
                    assignedByUserId: authSession.user.id,
                    assignedAt: now.toISOString(),
                    autoGrantImmediately: true,
                },

                updatedAt: now,
                updatedBy: authSession.user.id,
            })
            .where(eq(reportAccessCodes.id, availableCode.id));

        const autoGrantResult = await autoGrantReportAccessForCompletedSession({
            db,
            tenantSlug,
            sessionId: session.id,
            actorUserId: authSession.user.id,
            actorEmail: authSession.user.email ?? null,
        });

        if (autoGrantResult.ok && autoGrantResult.granted) {
            grantedCount += 1;
            continue;
        }

        if (autoGrantResult.ok && !autoGrantResult.granted) {
            skippedCount += 1;
            continue;
        }

        errors.push(autoGrantResult.message);
    }

    revalidatePath(`/dashboard/partner-assessment/${tenantSlug}/projects/${projectId}`);

    if (errors.length > 0) {
        return fail(
            `Nadano dostęp: ${grantedCount}. Pominięto: ${skippedCount}. Błędy: ${errors.join("; ")}`,
        );
    }

    return success(
        `Nadano dostęp do raportu dla ${grantedCount} sesji. Pominięto: ${skippedCount}.`,
    );
}




export async function generateProjectReportAccessPoolAction(
    _previousState: PartnerGrantReportAccessState,
    formData: FormData,
): Promise<PartnerGrantReportAccessState> {
    const tenantSlug = normalizeString(formData.get("tenantSlug"));
    const projectId = normalizeString(formData.get("projectId"));
    const productId = normalizeString(formData.get("productId"));

    const quantityRaw = Number(formData.get("quantity") ?? 0);
    const quantity = Number.isFinite(quantityRaw)
        ? Math.min(Math.max(Math.floor(quantityRaw), 1), 500)
        : 0;

    if (!tenantSlug || !projectId || !productId) {
        return fail("Brakuje tenanta, projektu albo produktu dostępu.");
    }

    if (quantity < 1) {
        return fail("Podaj liczbę dostępów większą od zera.");
    }

    const invoiceRequested = booleanValue(formData.get("invoiceRequested"));
    const saveBillingProfile = booleanValue(formData.get("saveBillingProfile"));

    const billingType = nullableString(formData.get("billingType")) ?? "company";

    const companyName = nullableString(formData.get("companyName"));
    const taxId = nullableString(formData.get("taxId"));

    const firstName = nullableString(formData.get("firstName"));
    const lastName = nullableString(formData.get("lastName"));

    const billingEmail = nullableString(formData.get("billingEmail"));
    const phone = nullableString(formData.get("phone"));

    const country = nullableString(formData.get("country")) ?? "PL";
    const postalCode = nullableString(formData.get("postalCode"));
    const city = nullableString(formData.get("city"));
    const street = nullableString(formData.get("street"));
    const buildingNumber = nullableString(formData.get("buildingNumber"));
    const apartmentNumber = nullableString(formData.get("apartmentNumber"));

    const invoiceEmail = nullableString(formData.get("invoiceEmail"));

    const authSession = await requireSession();

    const ctx = await requireTenantContext({ tenantSlug });
    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    const project = await db.query.assessmentProjects.findFirst({
        where: and(
            eq(assessmentProjects.id, projectId),
            isNull(assessmentProjects.deletedAt),
        ),
        columns: {
            id: true,
        },
    });

    if (invoiceRequested) {
        if (billingType === "company" && (!companyName || !taxId)) {
            return fail("Dla faktury firmowej podaj nazwę firmy i NIP.");
        }

        if (billingType === "individual" && (!firstName || !lastName)) {
            return fail("Dla faktury osoby fizycznej podaj imię i nazwisko.");
        }

        if (!billingEmail && !invoiceEmail) {
            return fail("Podaj e-mail do danych rozliczeniowych lub e-mail do faktury.");
        }

        if (!city || !street || !postalCode) {
            return fail("Podaj pełny adres do faktury: kod pocztowy, miasto i ulicę.");
        }
    }

    if (!project) {
        return fail("Nie znaleziono projektu badawczego.");
    }

    const product = await controlDb.query.reportAccessProducts.findFirst({
        where: and(
            eq(reportAccessProducts.id, productId),
            eq(reportAccessProducts.status, "active"),
            isNull(reportAccessProducts.deletedAt),
        ),
    });

    if (!product) {
        return fail("Nie znaleziono aktywnego produktu dostępu.");
    }

    const now = new Date();

    const unitNet = moneyNumber(product.priceNet);
    const unitGross = moneyNumber(product.priceGross);
    const unitVat = Math.max(0, Number((unitGross - unitNet).toFixed(2)));

    const totalNet = multiplyMoney(unitNet, quantity);
    const totalVat = multiplyMoney(unitVat, quantity);
    const totalGross = multiplyMoney(unitGross, quantity);

    const validUntil =
        typeof product.validityDays === "number" && product.validityDays > 0
            ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
            : null;

    const billingSnapshot = buildBillingSnapshot({
        invoiceRequested,
        billingType,
        companyName,
        taxId,
        firstName,
        lastName,
        email: billingEmail,
        phone,
        country,
        postalCode,
        city,
        street,
        buildingNumber,
        apartmentNumber,
        invoiceEmail,
    });


    const orderResult = await controlDb.transaction(async (tx) => {

        let billingProfileId: string | null = null;

        if (invoiceRequested && saveBillingProfile) {
            const [profile] = await tx
                .insert(billingProfiles)
                .values({
                    ownerType: "tenant",

                    tenantSlug,
                    tenantId: ctx.tenantId,
                    userId: authSession.user.id,

                    type: billingType,

                    companyName,
                    taxId,

                    firstName,
                    lastName,

                    email: billingEmail,
                    phone,

                    country,
                    postalCode,
                    city,
                    street,
                    buildingNumber,
                    apartmentNumber,

                    invoiceEmail: invoiceEmail ?? billingEmail,

                    createdAt: now,
                    updatedAt: now,
                    createdBy: authSession.user.id,
                    updatedBy: authSession.user.id,
                })
                .returning({
                    id: billingProfiles.id,
                });

            billingProfileId = profile.id;
        }

        const [order] = await tx
            .insert(reportAccessOrders)
            .values({
                buyerType: "tenant",

                tenantSlug,
                tenantId: ctx.tenantId,
                buyerUserId: authSession.user.id,

                status: "paid",
                paymentProvider: "placeholder",
                paymentProviderOrderId: `placeholder:${crypto.randomUUID()}`,

                currency: product.currency,

                totalNet: moneyString(totalNet),
                totalVat: moneyString(totalVat),
                totalGross: moneyString(totalGross),

                invoiceRequested,
                billingProfileId,
                billingSnapshot,

                metadata: {
                    source: "partner_assessment_project_pool",
                    projectId,
                    productId: product.id,
                    quantity,
                    placeholderPayment: true,
                },

                paidAt: now,

                createdAt: now,
                updatedAt: now,
                createdBy: authSession.user.id,
                updatedBy: authSession.user.id,
            })
            .returning({
                id: reportAccessOrders.id,
            });

        await tx.insert(reportAccessOrderItems).values({
            orderId: order.id,
            productId: product.id,

            quantity,

            unitNet: moneyString(unitNet),
            unitVat: moneyString(unitVat),
            unitGross: moneyString(unitGross),

            totalNet: moneyString(totalNet),
            totalVat: moneyString(totalVat),
            totalGross: moneyString(totalGross),

            createdAt: now,
            updatedAt: now,
        });

        const codeValues = [];

        for (let index = 0; index < quantity; index += 1) {
            const accessCode = await createUniqueAccessCode();

            codeValues.push({
                tenantSlug,
                tenantId: ctx.tenantId,

                productId: product.id,
                orderId: order.id,

                codeHash: accessCode.codeHash,
                codePreview: accessCode.codePreview,

                status: "available",

                assessmentProjectId: projectId,

                validFrom: now,
                validUntil,

                metadata: {
                    generatedFrom: "partner_assessment_project_pool_order",
                    generatedByUserId: authSession.user.id,
                    projectId,
                    orderId: order.id,
                    productCode: product.code,
                    productName: product.name,
                },

                createdAt: now,
                updatedAt: now,
                createdBy: authSession.user.id,
                updatedBy: authSession.user.id,
            });
        }

        if (codeValues.length > 0) {
            await tx.insert(reportAccessCodes).values(codeValues);
        }

        return {
            orderId: order.id,
        };
    });

    revalidatePath(
        `/dashboard/partner-assessment/${tenantSlug}/projects/${projectId}`,
    );

    return success(
        `Utworzono zamówienie placeholder i wygenerowano ${quantity} dostępów do puli projektu. ID zamówienia: ${orderResult.orderId}`,
    );
}