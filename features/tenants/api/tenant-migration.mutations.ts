import { and, eq, isNull } from "drizzle-orm";

import {
    systemAuditLog,
    tenantDatabaseConnections,
    tenants,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { runTenantMigrations } from "@/server/db/migrate-tenant-database";
import { decryptSecret } from "@/server/security/encryption";

type MigrateTenantDatabaseInput = {
    actorUserId: string;
    tenantId: string;
};

export type TenantMigrationResult = {
    tenantId: string;
    tenantSlug: string;
    ok: boolean;
    message: string;
};

export async function migrateTenantDatabaseAsSuperAdmin({
    actorUserId,
    tenantId,
}: MigrateTenantDatabaseInput): Promise<TenantMigrationResult> {
    const tenant = await controlDb.query.tenants.findFirst({
        where: and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)),
        columns: {
            id: true,
            slug: true,
            name: true,
            status: true,
        },
    });

    if (!tenant) {
        return {
            tenantId,
            tenantSlug: "unknown",
            ok: false,
            message: "Tenant nie istnieje.",
        };
    }

    const connection = await controlDb.query.tenantDatabaseConnections.findFirst({
        where: eq(tenantDatabaseConnections.tenantId, tenant.id),
    });

    if (!connection) {
        return {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            ok: false,
            message: "Brak połączenia do bazy tenanta.",
        };
    }

    await controlDb
        .update(tenantDatabaseConnections)
        .set({
            migrationStatus: "running",
            updatedBy: actorUserId,
            updatedAt: new Date(),
        })
        .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

    try {
        const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

        await runTenantMigrations({
            databaseUrl,
        });

        const nextSchemaVersion = Number(connection.schemaVersion ?? 0) + 1;

        await controlDb
            .update(tenantDatabaseConnections)
            .set({
                migrationStatus: "success",
                schemaVersion: nextSchemaVersion,
                lastMigratedAt: new Date(),
                updatedBy: actorUserId,
                updatedAt: new Date(),
            })
            .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

        await controlDb.insert(systemAuditLog).values({
            actorUserId,
            tenantId: tenant.id,
            actorRole: "SUPER_ADMIN",
            action: "tenant_database_migrated",
            entityType: "tenant_database_connection",
            entityId: connection.id,
            after: {
                tenantSlug: tenant.slug,
                databaseName: connection.databaseName,
                schemaVersion: nextSchemaVersion,
            },
        });

        return {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            ok: true,
            message: `Migracja tenanta "${tenant.slug}" zakończona.`,
        };
    } catch (error) {
        await controlDb
            .update(tenantDatabaseConnections)
            .set({
                migrationStatus: "failed",
                updatedBy: actorUserId,
                updatedAt: new Date(),
            })
            .where(eq(tenantDatabaseConnections.tenantId, tenant.id));

        await controlDb.insert(systemAuditLog).values({
            actorUserId,
            tenantId: tenant.id,
            actorRole: "SUPER_ADMIN",
            action: "tenant_database_migration_failed",
            entityType: "tenant_database_connection",
            entityId: connection.id,
            after: {
                tenantSlug: tenant.slug,
                databaseName: connection.databaseName,
                errorName: error instanceof Error ? error.name : "UnknownError",
                errorMessage:
                    error instanceof Error ? error.message : "Unknown error",
            },
        });

        return {
            tenantId: tenant.id,
            tenantSlug: tenant.slug,
            ok: false,
            message:
                error instanceof Error
                    ? `Migracja tenanta "${tenant.slug}" nie powiodła się: ${error.message}`
                    : `Migracja tenanta "${tenant.slug}" nie powiodła się.`,
        };
    }
}

export async function migrateAllActiveTenantDatabasesAsSuperAdmin({
    actorUserId,
}: {
    actorUserId: string;
}) {
    const rows = await controlDb
        .select({
            tenantId: tenants.id,
            tenantSlug: tenants.slug,
        })
        .from(tenants)
        .innerJoin(
            tenantDatabaseConnections,
            eq(tenantDatabaseConnections.tenantId, tenants.id),
        )
        .where(and(eq(tenants.status, "active"), isNull(tenants.deletedAt)));

    const results: TenantMigrationResult[] = [];

    for (const row of rows) {
        const result = await migrateTenantDatabaseAsSuperAdmin({
            actorUserId,
            tenantId: row.tenantId,
        });

        results.push(result);
    }

    return results;
}