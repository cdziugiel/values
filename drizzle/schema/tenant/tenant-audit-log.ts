import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { id } from "../shared/common-columns";

export const tenantAuditLog = pgTable(
  "tenant_audit_log",
  {
    ...id,
    actorUserId: uuid("actor_user_id"),
    actorRole: text("actor_role"),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tenant_audit_log_actor_user_id_idx").on(table.actorUserId),
    index("tenant_audit_log_action_idx").on(table.action),
    index("tenant_audit_log_entity_idx").on(table.entityType, table.entityId),
    index("tenant_audit_log_created_at_idx").on(table.createdAt),
  ],
);