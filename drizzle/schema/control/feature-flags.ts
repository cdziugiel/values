import { boolean, index, jsonb, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";
import { tenants } from "./tenants";

export const featureFlags = pgTable(
  "feature_flags",
  {
    ...id,
    key: text("key").notNull(),
    description: text("description"),
    enabled: boolean("enabled").default(false).notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "cascade",
    }),
    config: jsonb("config"),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("feature_flags_key_tenant_unique").on(table.key, table.tenantId),
    index("feature_flags_key_idx").on(table.key),
    index("feature_flags_tenant_id_idx").on(table.tenantId),
  ],
);