import { index, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";
import { membershipStatusEnum, tenantRoleEnum } from "../shared/enums";
import { tenants } from "./tenants";
import { users } from "./users";

export const tenantMemberships = pgTable(
  "tenant_memberships",
  {
    ...id,
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    role: tenantRoleEnum("role").notNull(),
    status: membershipStatusEnum("status").default("active").notNull(),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("tenant_memberships_user_tenant_unique").on(
      table.userId,
      table.tenantId,
    ),
    index("tenant_memberships_user_id_idx").on(table.userId),
    index("tenant_memberships_tenant_id_idx").on(table.tenantId),
    index("tenant_memberships_role_idx").on(table.role),
    index("tenant_memberships_status_idx").on(table.status),
  ],
);