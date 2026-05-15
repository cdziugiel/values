// drizzle/schema/tenant-schema/assessment-result-snapshots.ts

import {
  index,
  jsonb,
  pgTable,
  text,
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

export const assessmentResultSnapshots = pgTable(
  "assessment_result_snapshots",
  {
    ...id,

    assessmentSessionId: uuid("assessment_session_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),

    tenantSlug: text("tenant_slug").notNull(),

    payload: jsonb("payload").notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_result_snapshots_session_uidx").on(
      table.assessmentSessionId,
    ),
    index("assessment_result_snapshots_session_id_idx").on(
      table.assessmentSessionId,
    ),
    index("assessment_result_snapshots_tenant_slug_idx").on(table.tenantSlug),
    index("assessment_result_snapshots_deleted_at_idx").on(table.deletedAt),
  ],
);