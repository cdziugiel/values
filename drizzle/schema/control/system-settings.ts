import { index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";

export const systemSettings = pgTable(
  "system_settings",
  {
    ...id,
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("system_settings_key_unique").on(table.key),
    index("system_settings_deleted_at_idx").on(table.deletedAt),
  ],
);