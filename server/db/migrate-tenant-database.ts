import path from "node:path";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import * as tenantSchema from "@/drizzle/schema/tenant-schema";

type RunTenantMigrationsInput = {
  databaseUrl: string;
};

function toSafeDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  url.password = "***";
  return url.toString();
}

export async function runTenantMigrations({
  databaseUrl,
}: RunTenantMigrationsInput) {
  const sql = postgres(databaseUrl, {
    max: 1,
  });

  const db = drizzle(sql, {
    schema: tenantSchema,
  });

  try {
    console.log("Running tenant migrations", {
      databaseUrl: toSafeDatabaseUrl(databaseUrl),
      migrationsFolder: path.join(
        process.cwd(),
        "drizzle",
        "migrations",
        "tenant",
      ),
    });

    await migrate(db, {
      migrationsFolder: path.join(
        process.cwd(),
        "drizzle",
        "migrations",
        "tenant",
      ),

      /**
       * Important:
       * Tenant databases are physically separated, so keeping Drizzle migration
       * metadata in public.__drizzle_migrations is enough and avoids runtime
       * CREATE SCHEMA "drizzle" issues during tenant provisioning.
       */
      migrationsSchema: "public",
      migrationsTable: "__drizzle_migrations",
    });

    console.log("Tenant migrations completed");
  } catch (error) {
    console.error("Tenant migration failed full error:");
    console.dir(error, { depth: null });

    throw error;
  } finally {
    await sql.end();
  }
}