import {
  index,
  integer,
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
import { assessmentProjects } from "./assessment-projects";
import { assessmentProjectQuestionnaireStatusEnum } from "./enums";

export const assessmentProjectQuestionnaires = pgTable(
  "assessment_project_questionnaires",
  {
    ...id,

    assessmentProjectId: uuid("assessment_project_id")
      .notNull()
      .references(() => assessmentProjects.id, { onDelete: "cascade" }),

    questionnaireId: uuid("questionnaire_id").notNull(),
    questionnaireVersionId: uuid("questionnaire_version_id").notNull(),

    orderIndex: integer("order_index").default(0).notNull(),

    status: assessmentProjectQuestionnaireStatusEnum("status")
      .default("active")
      .notNull(),

    snapshot: text("snapshot"),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_project_questionnaires_project_version_uidx").on(
      table.assessmentProjectId,
      table.questionnaireVersionId,
    ),
    index("assessment_project_questionnaires_project_id_idx").on(
      table.assessmentProjectId,
    ),
    index("assessment_project_questionnaires_questionnaire_id_idx").on(
      table.questionnaireId,
    ),
    index("assessment_project_questionnaires_version_id_idx").on(
      table.questionnaireVersionId,
    ),
    index("assessment_project_questionnaires_status_idx").on(table.status),
    index("assessment_project_questionnaires_deleted_at_idx").on(
      table.deletedAt,
    ),
  ],
);