import {
  index,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { assessmentAccessLinks } from "./assessment-access-links";
import { assessmentProjectRespondents } from "./assessment-project-respondents";
import { assessmentProjects } from "./assessment-projects";
import { assessmentSessionStatusEnum } from "./enums";
import { respondents } from "./respondents";

export const assessmentSessions = pgTable(
  "assessment_sessions",
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

    accessLinkId: uuid("access_link_id")
      .notNull()
      .references(() => assessmentAccessLinks.id, {
        onDelete: "cascade",
      }),

    status: assessmentSessionStatusEnum("status")
      .default("in_progress")
      .notNull(),

    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("assessment_sessions_project_id_idx").on(table.assessmentProjectId),
    index("assessment_sessions_respondent_id_idx").on(table.respondentId),
    index("assessment_sessions_project_respondent_id_idx").on(
      table.projectRespondentId,
    ),
    index("assessment_sessions_access_link_id_idx").on(table.accessLinkId),
    index("assessment_sessions_status_idx").on(table.status),
    index("assessment_sessions_deleted_at_idx").on(table.deletedAt),
  ],
);