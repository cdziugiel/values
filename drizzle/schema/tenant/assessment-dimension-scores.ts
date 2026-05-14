import {
  index,
  numeric,
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

export const assessmentDimensionScores = pgTable(
  "assessment_dimension_scores",
  {
    ...id,

    assessmentSessionId: uuid("assessment_session_id")
      .notNull()
      .references(() => assessmentSessions.id, { onDelete: "cascade" }),

    questionnaireId: uuid("questionnaire_id").notNull(),
    questionnaireVersionId: uuid("questionnaire_version_id").notNull(),
    questionnaireDimensionId: uuid("questionnaire_dimension_id").notNull(),

    dimensionCode: text("dimension_code").notNull(),
    dimensionName: text("dimension_name").notNull(),

    rawScore: numeric("raw_score", {
      precision: 14,
      scale: 4,
      mode: "number",
    }).notNull(),

    weightedScore: numeric("weighted_score", {
      precision: 14,
      scale: 4,
      mode: "number",
    }).notNull(),

    meanScore: numeric("mean_score", {
      precision: 14,
      scale: 4,
      mode: "number",
    }).notNull(),

    weightedMeanScore: numeric("weighted_mean_score", {
      precision: 14,
      scale: 4,
      mode: "number",
    }).notNull(),

    normalizedScore: numeric("normalized_score", {
      precision: 14,
      scale: 4,
      mode: "number",
    }),

    answeredItemsCount: numeric("answered_items_count", {
      precision: 10,
      scale: 0,
      mode: "number",
    }).notNull(),

    expectedItemsCount: numeric("expected_items_count", {
      precision: 10,
      scale: 0,
      mode: "number",
    }).notNull(),

    completeness: numeric("completeness", {
      precision: 8,
      scale: 4,
      mode: "number",
    }).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("assessment_dimension_scores_session_dimension_uidx").on(
      table.assessmentSessionId,
      table.questionnaireDimensionId,
    ),
    index("assessment_dimension_scores_session_id_idx").on(
      table.assessmentSessionId,
    ),
    index("assessment_dimension_scores_questionnaire_version_id_idx").on(
      table.questionnaireVersionId,
    ),
    index("assessment_dimension_scores_dimension_id_idx").on(
      table.questionnaireDimensionId,
    ),
    index("assessment_dimension_scores_deleted_at_idx").on(table.deletedAt),
  ],
);