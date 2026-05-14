import {
  index,
  integer,
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
import { assessmentResponseValueTypeEnum } from "./enums";

export const assessmentResponses = pgTable(
  "assessment_responses",
  {
    ...id,

    assessmentSessionId: uuid("assessment_session_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),

    questionnaireId: uuid("questionnaire_id").notNull(),
    questionnaireVersionId: uuid("questionnaire_version_id").notNull(),
    questionnaireItemId: uuid("questionnaire_item_id").notNull(),

    itemCode: text("item_code").notNull(),

    valueType: assessmentResponseValueTypeEnum("value_type")
      .default("number")
      .notNull(),

    numberValue: integer("number_value"),
    textValue: text("text_value"),
    jsonValue: jsonb("json_value"),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_responses_session_item_uidx").on(
      table.assessmentSessionId,
      table.questionnaireItemId,
    ),
    index("assessment_responses_session_id_idx").on(
      table.assessmentSessionId,
    ),
    index("assessment_responses_questionnaire_version_id_idx").on(
      table.questionnaireVersionId,
    ),
    index("assessment_responses_item_id_idx").on(table.questionnaireItemId),
    index("assessment_responses_deleted_at_idx").on(table.deletedAt),
  ],
);