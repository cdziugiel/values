import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";
import { migrationStatusEnum } from "../shared/enums";
import { tenants } from "./tenants";

export const tenantDatabaseConnections = pgTable(
  "tenant_database_connections",
  {
    ...id,
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    databaseName: text("database_name").notNull(),
    databaseUrlEncrypted: text("database_url_encrypted").notNull(),
    schemaVersion: integer("schema_version").default(0).notNull(),
    migrationStatus: migrationStatusEnum("migration_status")
      .default("pending")
      .notNull(),
    lastMigratedAt: timestamp("last_migrated_at", { withTimezone: true }),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("tenant_database_connections_tenant_unique").on(table.tenantId),
    uniqueIndex("tenant_database_connections_database_name_unique").on(
      table.databaseName,
    ),
    index("tenant_database_connections_migration_status_idx").on(
      table.migrationStatus,
    ),
  ],
);