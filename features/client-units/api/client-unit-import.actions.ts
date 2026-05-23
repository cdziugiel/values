"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  clientOrganizations,
  clientUnits,
} from "@/drizzle/schema/tenant-schema";
import { writeTenantAuditLog } from "@/server/audit/write-tenant-audit-log";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  normalizeClientUnitLookup,
  parseClientUnitsCsvFile,
  type ClientUnitImportError,
} from "../lib/client-unit-csv";

export type ImportClientUnitsCsvActionState = {
  status: "idle" | "success" | "error";
  message: string;
  errors: ClientUnitImportError[];
  importedCount: number;
};

function normalizeFormText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
}

function unitKey(clientOrganizationId: string, name: string) {
  return [clientOrganizationId, normalizeClientUnitLookup(name)].join("::");
}

export async function importClientUnitsCsvAction(
  _previousState: ImportClientUnitsCsvActionState,
  formData: FormData,
): Promise<ImportClientUnitsCsvActionState> {
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

    requirePermission(ctx, "client_unit:create");
    requirePermission(ctx, "client_unit:update");

    const db = await getTenantDb(ctx);

    const parsedFile = await parseClientUnitsCsvFile(file);

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
        message: "Plik nie zawiera poprawnych jednostek organizacyjnych.",
        errors: [],
        importedCount: 0,
      };
    }

    const organizationNames = Array.from(
      new Set(
        parsedFile.rows.map((row) =>
          normalizeClientUnitLookup(row.clientOrganizationName),
        ),
      ),
    );

    const organizations = await db.query.clientOrganizations.findMany({
      where: isNull(clientOrganizations.deletedAt),
      columns: {
        id: true,
        name: true,
      },
    });

    const organizationByName = new Map(
      organizations.map((organization) => [
        normalizeClientUnitLookup(organization.name),
        organization,
      ]),
    );

    const validationErrors: ClientUnitImportError[] = [];

    for (const row of parsedFile.rows) {
      const organization = organizationByName.get(
        normalizeClientUnitLookup(row.clientOrganizationName),
      );

      if (!organization) {
        validationErrors.push({
          row: row.rowNumber,
          message: `Nie znaleziono organizacji: ${row.clientOrganizationName}.`,
        });
      }
    }

    if (validationErrors.length > 0) {
      return {
        status: "error",
        message: `Import zatrzymany. Znaleziono ${validationErrors.length} błędów biznesowych.`,
        errors: validationErrors,
        importedCount: 0,
      };
    }

    const organizationIds = parsedFile.rows
      .map((row) =>
        organizationByName.get(
          normalizeClientUnitLookup(row.clientOrganizationName),
        )?.id,
      )
      .filter((id): id is string => Boolean(id));

    const existingUnits =
      organizationIds.length > 0
        ? await db.query.clientUnits.findMany({
            where: and(
              inArray(clientUnits.clientOrganizationId, organizationIds),
              isNull(clientUnits.deletedAt),
            ),
            columns: {
              id: true,
              clientOrganizationId: true,
              parentId: true,
              name: true,
              type: true,
            },
          })
        : [];

    const existingUnitByKey = new Map(
      existingUnits.map((unit) => [
        unitKey(unit.clientOrganizationId, unit.name),
        unit,
      ]),
    );

    const importRowByKey = new Map(
      parsedFile.rows.map((row) => {
        const organization = organizationByName.get(
          normalizeClientUnitLookup(row.clientOrganizationName),
        );

        return [unitKey(organization!.id, row.name), row];
      }),
    );

    for (const row of parsedFile.rows) {
      if (!row.parentName) {
        continue;
      }

      const organization = organizationByName.get(
        normalizeClientUnitLookup(row.clientOrganizationName),
      );

      if (!organization) {
        continue;
      }

      const parentKey = unitKey(organization.id, row.parentName);
      const existingParent = existingUnitByKey.get(parentKey);
      const parentFromFile = importRowByKey.get(parentKey);

      if (!existingParent && !parentFromFile) {
        validationErrors.push({
          row: row.rowNumber,
          message: `Nie znaleziono jednostki nadrzędnej "${row.parentName}" w organizacji "${row.clientOrganizationName}".`,
        });
      }
    }

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

    await db.transaction(async (tx) => {
      const unitIdByKey = new Map<string, string>();

      for (const existingUnit of existingUnits) {
        unitIdByKey.set(
          unitKey(existingUnit.clientOrganizationId, existingUnit.name),
          existingUnit.id,
        );
      }

      for (const row of parsedFile.rows) {
        const organization = organizationByName.get(
          normalizeClientUnitLookup(row.clientOrganizationName),
        );

        if (!organization) {
          throw new Error("Client organization not found during import.");
        }

        const key = unitKey(organization.id, row.name);
        const existingUnit = existingUnitByKey.get(key);

        if (existingUnit) {
          await tx
            .update(clientUnits)
            .set({
              type: row.type,
              updatedBy: ctx.userId,
              updatedAt: new Date(),
            })
            .where(eq(clientUnits.id, existingUnit.id));

          unitIdByKey.set(key, existingUnit.id);
          updatedCount += 1;
          continue;
        }

        const [createdUnit] = await tx
          .insert(clientUnits)
          .values({
            clientOrganizationId: organization.id,
            parentId: null,
            name: row.name.trim(),
            type: row.type,
            createdBy: ctx.userId,
            updatedBy: ctx.userId,
          })
          .returning({
            id: clientUnits.id,
          });

        if (!createdUnit) {
          throw new Error("Nie udało się utworzyć jednostki organizacyjnej.");
        }

        unitIdByKey.set(key, createdUnit.id);
        createdCount += 1;
      }

      for (const row of parsedFile.rows) {
        const organization = organizationByName.get(
          normalizeClientUnitLookup(row.clientOrganizationName),
        );

        if (!organization) {
          throw new Error("Client organization not found during parent update.");
        }

        const key = unitKey(organization.id, row.name);
        const unitId = unitIdByKey.get(key);

        if (!unitId) {
          throw new Error("Client unit not found during parent update.");
        }

        const parentId = row.parentName
          ? unitIdByKey.get(unitKey(organization.id, row.parentName)) ?? null
          : null;

        if (parentId === unitId) {
          throw new Error("Client unit cannot be its own parent.");
        }

        await tx
          .update(clientUnits)
          .set({
            parentId,
            updatedBy: ctx.userId,
            updatedAt: new Date(),
          })
          .where(eq(clientUnits.id, unitId));
      }
    });

    await writeTenantAuditLog({
      db,
      ctx,
      action: "client_units_imported",
      entityType: "client_unit",
      entityId: ctx.tenantId,
      after: {
        importedCount: parsedFile.rows.length,
        createdCount,
        updatedCount,
        organizationNames,
      },
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-units`);

    return {
      status: "success",
      message: `Import zakończony. Utworzono ${createdCount}, zaktualizowano ${updatedCount} jednostek.`,
      errors: [],
      importedCount: parsedFile.rows.length,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaimportować jednostek organizacyjnych.",
      errors: [],
      importedCount: 0,
    };
  }
}