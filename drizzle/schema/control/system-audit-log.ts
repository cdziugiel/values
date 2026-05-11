import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { id } from "../shared/common-columns";
import { tenants } from "./tenants";
import { users } from "./users";

export const systemAuditLog = pgTable(
  "system_audit_log",
  {
    ...id,
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("system_audit_log_actor_user_id_idx").on(table.actorUserId),
    index("system_audit_log_tenant_id_idx").on(table.tenantId),
    index("system_audit_log_action_idx").on(table.action),
    index("system_audit_log_created_at_idx").on(table.createdAt),
  ],
);