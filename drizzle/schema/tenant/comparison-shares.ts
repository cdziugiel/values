// drizzle/schema/tenant/comparison-shares.ts
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";

import { assessmentSessions } from "./assessment-sessions";
import { respondents } from "./respondents";

export const comparisonShares = pgTable(
  "comparison_shares",
  {
    ...id,

    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => respondents.id, { onDelete: "cascade" }),

    assessmentSessionId: uuid("assessment_session_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),

    tokenHash: text("token_hash").notNull(),

    status: text("status").notNull().default("active"),

    label: text("label"),

    allowedScope: text("allowed_scope")
      .notNull()
      .default("comparison_snapshot"),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),

    isSingleUse: boolean("is_single_use").notNull().default(false),

    metadata: jsonb("metadata").$type<{
      questionnaireId?: string;
      questionnaireVersionId?: string;
      createdFrom?: "my_assessment" | "tenant_panel";
    }>(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("comparison_shares_token_hash_unique").on(table.tokenHash),
    index("comparison_shares_respondent_id_idx").on(table.respondentId),
    index("comparison_shares_session_id_idx").on(table.assessmentSessionId),
    index("comparison_shares_status_idx").on(table.status),
    index("comparison_shares_deleted_at_idx").on(table.deletedAt),
  ],
);