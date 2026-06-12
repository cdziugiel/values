// server/db/tenant-db.ts

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { tenantDatabaseConnections } from "@/drizzle/schema";
import * as tenantSchema from "@/drizzle/schema/tenant-schema";
import { controlDb } from "@/server/db/control-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";
import { decryptSecret } from "@/server/security/encryption";

export type TenantDb = ReturnType<typeof drizzle<typeof tenantSchema>>;

type TenantDbCacheEntry = {
  sql: postgres.Sql;
  db: TenantDb;
};

const globalForTenantDb = globalThis as unknown as {
  tenantDbCache?: Map<string, TenantDbCacheEntry>;
};

const tenantDbCache =
  globalForTenantDb.tenantDbCache ?? new Map<string, TenantDbCacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForTenantDb.tenantDbCache = tenantDbCache;
}

export async function getTenantDb(ctx: TenantContext): Promise<TenantDb> {
  const connection = await controlDb.query.tenantDatabaseConnections.findFirst({
    where: eq(tenantDatabaseConnections.tenantId, ctx.tenantId),
    columns: {
      tenantId: true,
      databaseName: true,
      databaseUrlEncrypted: true,
      migrationStatus: true,
      schemaVersion: true,
      lastMigratedAt: true,
    },
  });

  if (!connection) {
    throw new Error(`Tenant database connection not found: ${ctx.tenantSlug}`);
  }

  if (connection.migrationStatus !== "success") {
    throw new Error(
      `Tenant database is not ready: ${ctx.tenantSlug}, status=${connection.migrationStatus}`,
    );
  }

  const cacheKey = [
    connection.tenantId,
    connection.databaseName,
    connection.schemaVersion,
    connection.lastMigratedAt?.toISOString() ?? "no-migration-date",
  ].join(":");

  const cached = tenantDbCache.get(cacheKey);

  if (cached) {
    return cached.db;
  }

  const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

  const sql = postgres(databaseUrl, {
    max: 10,
  });

  const db = drizzle(sql, {
    schema: tenantSchema,
  });

  tenantDbCache.set(cacheKey, {
    sql,
    db,
  });

  return db;
}