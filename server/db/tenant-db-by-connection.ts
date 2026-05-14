import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as tenantSchema from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";

type TenantDbByConnectionInput = {
  tenantId: string;
  databaseName: string;
  schemaVersion: number;
  databaseUrl: string;
};

type TenantDbCacheEntry = {
  sql: postgres.Sql;
  db: TenantDb;
};

const globalForTenantDbByConnection = globalThis as unknown as {
  tenantDbByConnectionCache?: Map<string, TenantDbCacheEntry>;
};

const tenantDbByConnectionCache =
  globalForTenantDbByConnection.tenantDbByConnectionCache ??
  new Map<string, TenantDbCacheEntry>();

if (process.env.NODE_ENV !== "production") {
  globalForTenantDbByConnection.tenantDbByConnectionCache =
    tenantDbByConnectionCache;
}

export function getTenantDbByConnection({
  tenantId,
  databaseName,
  schemaVersion,
  databaseUrl,
}: TenantDbByConnectionInput): TenantDb {
  const cacheKey = [tenantId, databaseName, schemaVersion].join(":");

  const cached = tenantDbByConnectionCache.get(cacheKey);

  if (cached) {
    return cached.db;
  }

  const sql = postgres(databaseUrl, {
    max: 5,
  });

  const db = drizzle(sql, {
    schema: tenantSchema,
  });

  tenantDbByConnectionCache.set(cacheKey, {
    sql,
    db,
  });

  return db;
}