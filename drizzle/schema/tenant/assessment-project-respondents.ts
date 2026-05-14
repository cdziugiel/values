import {
  index,
  pgTable,
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
import { assessmentProjects } from "./assessment-projects";
import { assessmentProjectRespondentStatusEnum } from "./enums";
import { respondents } from "./respondents";

export const assessmentProjectRespondents = pgTable(
  "assessment_project_respondents",
  {
    ...id,

    assessmentProjectId: uuid("assessment_project_id")
      .notNull()
      .references(() => assessmentProjects.id, { onDelete: "cascade" }),

    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => respondents.id, { onDelete: "cascade" }),

    status: assessmentProjectRespondentStatusEnum("status")
      .default("invited")
      .notNull(),

    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_project_respondents_project_respondent_uidx").on(
      table.assessmentProjectId,
      table.respondentId,
    ),
    index("assessment_project_respondents_project_id_idx").on(
      table.assessmentProjectId,
    ),
    index("assessment_project_respondents_respondent_id_idx").on(
      table.respondentId,
    ),
    index("assessment_project_respondents_status_idx").on(table.status),
    index("assessment_project_respondents_deleted_at_idx").on(table.deletedAt),
  ],
);