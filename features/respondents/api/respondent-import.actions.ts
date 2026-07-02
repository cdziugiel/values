"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { bulkUpsertRespondentIdentityIndex } from "@/server/respondents/respondent-identity-index";
import {
    clientOrganizations,
    clientUnits,
    respondentIdentities,
    respondents,
    clientUnitMemberships,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
    parseRespondentsCsvFile,
    type RespondentImportError,
} from "../lib/respondent-csv";

export type ImportRespondentsCsvActionState = {
    status: "idle" | "success" | "error";
    message: string;
    errors: RespondentImportError[];
    importedCount: number;
};

function normalizeRole(value: string | undefined | null) {
    const normalized = value?.trim();

    return normalized || "member";
}

async function syncImportedPrimaryUnitMembership({
    tx,
    userId,
    respondentId,
    clientUnitId,
    role,
    isLeader,
}: {
    tx: any;
    userId: string;
    respondentId: string;
    clientUnitId: string | null;
    role: string | undefined | null;
    isLeader: boolean;
}) {
    const now = new Date();

    await tx
        .update(clientUnitMemberships)
        .set({
            deletedAt: now,
            updatedAt: now,
            updatedBy: userId,
        })
        .where(
            and(
                eq(clientUnitMemberships.respondentId, respondentId),
                isNull(clientUnitMemberships.deletedAt),
            ),
        );

    if (!clientUnitId) {
        return;
    }

    await tx.insert(clientUnitMemberships).values({
        respondentId,
        clientUnitId,
        role: normalizeRole(role),
        isLeader,
        metadata: {},
        createdBy: userId,
        updatedBy: userId,
    });
}

function normalizeFormText(value: FormDataEntryValue | null) {
    if (typeof value !== "string") {
        return undefined;
    }

    const normalized = value.trim();

    return normalized || undefined;
}

function normalizeLookup(value: string | null | undefined) {
    return String(value ?? "")
        .trim()
        .toLowerCase();
}

function normalizeNullableText(value: string | undefined) {
    const normalized = value?.trim();

    return normalized || null;
}

function normalizeNullableEmail(value: string | undefined) {
    const normalized = value?.trim().toLowerCase();

    return normalized || null;
}

export async function importRespondentsCsvAction(
    _previousState: ImportRespondentsCsvActionState,
    formData: FormData,
): Promise<ImportRespondentsCsvActionState> {
    const tenantSlug = normalizeFormText(formData.get("tenantSlug"));
    const file = formData.get("file");

    if (!tenantSlug) {
        return {
            status: "error",
            message: "Brakuje identyfikatora partnera.",
            errors: [],
            importedCount: 0,
        };
    }

    if (!(file instanceof File) || file.size === 0) {
        return {
            status: "error",
            message: "Nie przesłano pliku CSV.",
            errors: [],
            importedCount: 0,
        };
    }

    try {
        const ctx = await requireTenantContext({
            tenantSlug,
        });

        requirePermission(ctx, "respondent:create");

        const db = await getTenantDb(ctx);

        const parsedFile = await parseRespondentsCsvFile(file);

        if (parsedFile.errors.length > 0) {
            return {
                status: "error",
                message: `Import zatrzymany. Plik zawiera ${parsedFile.errors.length} błędów.`,
                errors: parsedFile.errors,
                importedCount: 0,
            };
        }

        if (parsedFile.rows.length === 0) {
            return {
                status: "error",
                message: "Plik nie zawiera poprawnych respondentów.",
                errors: [],
                importedCount: 0,
            };
        }

        const organizations = await db.query.clientOrganizations.findMany({
            where: isNull(clientOrganizations.deletedAt),
            columns: {
                id: true,
                name: true,
            },
        });

        const units = await db.query.clientUnits.findMany({
            where: isNull(clientUnits.deletedAt),
            columns: {
                id: true,
                name: true,
                clientOrganizationId: true,
            },
        });

        const organizationByName = new Map(
            organizations.map((organization) => [
                normalizeLookup(organization.name),
                organization,
            ]),
        );

        const unitsByName = new Map<string, typeof units>();

        for (const unit of units) {
            const key = normalizeLookup(unit.name);
            const existing = unitsByName.get(key) ?? [];
            existing.push(unit);
            unitsByName.set(key, existing);
        }

        const emails = parsedFile.rows
            .map((row) => row.email)
            .filter((email): email is string => Boolean(email));

        const externalCodes = parsedFile.rows
            .map((row) => row.externalCode)
            .filter((code): code is string => Boolean(code));

        const existingIdentities =
            emails.length > 0
                ? await db.query.respondentIdentities.findMany({
                    where: and(
                        inArray(respondentIdentities.email, emails),
                        isNull(respondentIdentities.deletedAt),
                    ),
                    columns: {
                        respondentId: true,
                        email: true,
                    },
                })
                : [];

        const existingIdentityByEmail = new Map(
            existingIdentities
                .filter((identity) => identity.email)
                .map((identity) => [
                    identity.email!.toLowerCase(),
                    identity,
                ]),
        );

        const existingRespondents =
            externalCodes.length > 0
                ? await db.query.respondents.findMany({
                    where: and(
                        inArray(respondents.externalCode, externalCodes),
                        isNull(respondents.deletedAt),
                    ),
                    columns: {
                        id: true,
                        externalCode: true,
                    },
                })
                : [];

        const existingRespondentByExternalCode = new Map(
            existingRespondents
                .filter((respondent) => respondent.externalCode)
                .map((respondent) => [
                    respondent.externalCode!.toLowerCase(),
                    respondent,
                ]),
        );


        const validationErrors: RespondentImportError[] = [];

        const resolvedRows = parsedFile.rows.map((row) => {
            const existingRespondent = row.externalCode
                ? existingRespondentByExternalCode.get(row.externalCode.toLowerCase())
                : undefined;
            if (row.email) {
                const existingIdentity = existingIdentityByEmail.get(row.email.toLowerCase());

                if (
                    existingIdentity &&
                    existingIdentity.respondentId !== existingRespondent?.id
                ) {
                    validationErrors.push({
                        row: row.rowNumber,
                        message: `Email jest już przypisany do innego respondenta: ${row.email}.`,
                    });
                }
            }



            const organization = row.clientOrganizationName
                ? organizationByName.get(normalizeLookup(row.clientOrganizationName))
                : undefined;

            if (row.clientOrganizationName && !organization) {
                validationErrors.push({
                    row: row.rowNumber,
                    message: `Nie znaleziono organizacji: ${row.clientOrganizationName}.`,
                });
            }

            const matchingUnits = row.clientUnitName
                ? unitsByName.get(normalizeLookup(row.clientUnitName)) ?? []
                : [];

            const unit =
                matchingUnits.length === 0
                    ? undefined
                    : organization
                        ? matchingUnits.find(
                            (candidate) =>
                                candidate.clientOrganizationId === organization.id,
                        )
                        : matchingUnits.length === 1
                            ? matchingUnits[0]
                            : undefined;

            if (row.clientUnitName && !unit) {
                validationErrors.push({
                    row: row.rowNumber,
                    message:
                        matchingUnits.length > 1 && !organization
                            ? `Jednostka "${row.clientUnitName}" występuje w wielu organizacjach. Podaj także clientOrganizationName.`
                            : `Nie znaleziono jednostki: ${row.clientUnitName}.`,
                });
            }

            return {
                row,
                existingRespondentId: existingRespondent?.id ?? null,
                clientOrganizationId: organization?.id ?? null,
                clientUnitId: unit?.id ?? null,
            };
        });

        if (validationErrors.length > 0) {
            return {
                status: "error",
                message: `Import zatrzymany. Znaleziono ${validationErrors.length} błędów biznesowych.`,
                errors: validationErrors,
                importedCount: 0,
            };
        }

        let createdCount = 0;
        let updatedCount = 0;

        const identityIndexRows: Array<{
            tenantSlug: string;
            respondentId: string;
            email: string | null;
        }> = [];

        await db.transaction(async (tx) => {
            for (const resolvedRow of resolvedRows) {
                const respondentId = resolvedRow.existingRespondentId;

                if (respondentId) {
                    await tx
                        .update(respondents)
                        .set({
                            clientOrganizationId: resolvedRow.clientOrganizationId,
                            clientUnitId: resolvedRow.clientUnitId,
                            updatedBy: ctx.userId,
                            updatedAt: new Date(),
                        })
                        .where(eq(respondents.id, respondentId));

                    const existingIdentity = await tx.query.respondentIdentities.findFirst({
                        where: and(
                            eq(respondentIdentities.respondentId, respondentId),
                            isNull(respondentIdentities.deletedAt),
                        ),
                        columns: {
                            id: true,
                        },
                    });

                    if (existingIdentity) {
                        await tx
                            .update(respondentIdentities)
                            .set({
                                email: normalizeNullableEmail(resolvedRow.row.email),
                                firstName: normalizeNullableText(resolvedRow.row.firstName),
                                lastName: normalizeNullableText(resolvedRow.row.lastName),
                                phone: normalizeNullableText(resolvedRow.row.phone),
                                updatedBy: ctx.userId,
                                updatedAt: new Date(),
                            })
                            .where(eq(respondentIdentities.id, existingIdentity.id));
                    } else {
                        await tx.insert(respondentIdentities).values({
                            respondentId,
                            email: normalizeNullableEmail(resolvedRow.row.email),
                            firstName: normalizeNullableText(resolvedRow.row.firstName),
                            lastName: normalizeNullableText(resolvedRow.row.lastName),
                            phone: normalizeNullableText(resolvedRow.row.phone),
                            createdBy: ctx.userId,
                            updatedBy: ctx.userId,
                        });
                    }

                    identityIndexRows.push({
                        tenantSlug: ctx.tenantSlug,
                        respondentId,
                        email: normalizeNullableEmail(resolvedRow.row.email),
                    });
                    await syncImportedPrimaryUnitMembership({
                        tx,
                        userId: ctx.userId,
                        respondentId,
                        clientUnitId: resolvedRow.clientUnitId,
                        role: resolvedRow.row.clientUnitRole,
                        isLeader: Boolean(resolvedRow.row.isLeader),
                    });
                    updatedCount += 1;
                    continue;
                }

                const [createdRespondent] = await tx
                    .insert(respondents)
                    .values({
                        externalCode: normalizeNullableText(resolvedRow.row.externalCode),
                        clientOrganizationId: resolvedRow.clientOrganizationId,
                        clientUnitId: resolvedRow.clientUnitId,
                        metadata: {},
                        createdBy: ctx.userId,
                        updatedBy: ctx.userId,
                    })
                    .returning({
                        id: respondents.id,
                    });

                if (!createdRespondent) {
                    throw new Error("Nie udało się utworzyć respondenta.");
                }

                await tx.insert(respondentIdentities).values({
                    respondentId: createdRespondent.id,
                    email: normalizeNullableEmail(resolvedRow.row.email),
                    firstName: normalizeNullableText(resolvedRow.row.firstName),
                    lastName: normalizeNullableText(resolvedRow.row.lastName),
                    phone: normalizeNullableText(resolvedRow.row.phone),
                    createdBy: ctx.userId,
                    updatedBy: ctx.userId,
                });
                identityIndexRows.push({
                    tenantSlug: ctx.tenantSlug,
                    respondentId: createdRespondent.id,
                    email: normalizeNullableEmail(resolvedRow.row.email),
                });
                await syncImportedPrimaryUnitMembership({
                    tx,
                    userId: ctx.userId,
                    respondentId: createdRespondent.id,
                    clientUnitId: resolvedRow.clientUnitId,
                    role: resolvedRow.row.clientUnitRole,
                    isLeader: Boolean(resolvedRow.row.isLeader),
                });
                createdCount += 1;
            }
        });
        let identityIndexSyncFailed = false;

        try {
            await bulkUpsertRespondentIdentityIndex(identityIndexRows);
        } catch (error) {
            identityIndexSyncFailed = true;

            console.error("RESPONDENT_IDENTITY_INDEX_BULK_SYNC_FAILED", {
                tenantSlug: ctx.tenantSlug,
                respondentsCount: identityIndexRows.length,
                errorName:
                    error instanceof Error ? error.name : "UnknownError",
            });
        }
        await writeTenantAuditLog({
            db,
            ctx,
            action: "respondents_imported",
            entityType: "respondent",
            entityId: null,
            after: {
                importedCount: resolvedRows.length,
                createdCount,
                updatedCount,
                membershipFieldsImported: true,
            },
        });

        revalidatePath(`/t/${ctx.tenantSlug}/respondents`);

        return {
            status: "success",
            message: identityIndexSyncFailed
                ? `Zaimportowano ${resolvedRows.length} respondentów. Synchronizacja indeksu raportowego wymaga ponowienia przez administratora.`
                : `Zaimportowano ${resolvedRows.length} respondentów.`,
            errors: [],
            importedCount: resolvedRows.length,
        };
    } catch (error) {
        return {
            status: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Nie udało się zaimportować respondentów.",
            errors: [],
            importedCount: 0,
        };
    }
}