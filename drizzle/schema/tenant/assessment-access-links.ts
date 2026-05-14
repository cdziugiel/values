import {
  index,
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
import { assessmentProjectRespondents } from "./assessment-project-respondents";
import { assessmentProjects } from "./assessment-projects";
import { assessmentAccessLinkStatusEnum } from "./enums";
import { respondents } from "./respondents";

export const assessmentAccessLinks = pgTable(
  "assessment_access_links",
  {
    ...id,

    assessmentProjectId: uuid("assessment_project_id")
      .notNull()
      .references(() => assessmentProjects.id, { onDelete: "cascade" }),

    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => respondents.id, { onDelete: "cascade" }),

    projectRespondentId: uuid("project_respondent_id")
      .notNull()
      .references(() => assessmentProjectRespondents.id, {
        onDelete: "cascade",
      }),

    tokenHash: text("token_hash").notNull(),

    status: assessmentAccessLinkStatusEnum("status")
      .default("active")
      .notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_access_links_token_hash_uidx").on(table.tokenHash),
    index("assessment_access_links_project_id_idx").on(
      table.assessmentProjectId,
    ),
    index("assessment_access_links_respondent_id_idx").on(table.respondentId),
    index("assessment_access_links_project_respondent_id_idx").on(
      table.projectRespondentId,
    ),
    index("assessment_access_links_status_idx").on(table.status),
    index("assessment_access_links_expires_at_idx").on(table.expiresAt),
    index("assessment_access_links_deleted_at_idx").on(table.deletedAt),
  ],
);