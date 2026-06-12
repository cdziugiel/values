import {
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { assessmentProjectQuestionnaires } from "./assessment-project-questionnaires";
import { assessmentSessions } from "./assessment-sessions";

export const assessmentResultSnapshots = pgTable(
  "assessment_result_snapshots",
  {
    ...id,

    assessmentSessionId: uuid("assessment_session_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),

    projectQuestionnaireId: uuid("project_questionnaire_id").references(
      () => assessmentProjectQuestionnaires.id,
      { onDelete: "cascade" },
    ),

    questionnaireId: uuid("questionnaire_id"),
    questionnaireVersionId: uuid("questionnaire_version_id"),

    tenantSlug: text("tenant_slug").notNull(),

    payload: jsonb("payload").notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_result_snapshots_session_questionnaire_uidx")
      .on(table.assessmentSessionId, table.projectQuestionnaireId)
      .where(
        sql`deleted_at is null and project_questionnaire_id is not null`,
      ),

    index("assessment_result_snapshots_session_id_idx").on(
      table.assessmentSessionId,
    ),
    index("assessment_result_snapshots_project_questionnaire_id_idx").on(
      table.projectQuestionnaireId,
    ),
    index("assessment_result_snapshots_questionnaire_id_idx").on(
      table.questionnaireId,
    ),
    index("assessment_result_snapshots_questionnaire_version_id_idx").on(
      table.questionnaireVersionId,
    ),
    index("assessment_result_snapshots_tenant_slug_idx").on(table.tenantSlug),
    index("assessment_result_snapshots_deleted_at_idx").on(table.deletedAt),
  ],
);