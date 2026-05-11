import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";
import { tenantStatusEnum } from "../shared/enums";

export const tenants = pgTable(
  "tenants",
  {
    ...id,
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: tenantStatusEnum("status").default("active").notNull(),
    planId: text("plan_id"),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("tenants_slug_unique").on(table.slug),
    index("tenants_status_idx").on(table.status),
  ],
);