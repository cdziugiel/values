import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  numeric,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "./common-columns";
import { questionnaireDimensions } from "./questionnaire-dimensions";
import { questionnairePages } from "./questionnaire-pages";

export const questionnairePageDimensionScores = pgTable(
  "questionnaire_page_dimension_scores",
  {
    ...id,

    questionnairePageId: uuid("questionnaire_page_id")
      .notNull()
      .references(() => questionnairePages.id, { onDelete: "cascade" }),

    questionnaireDimensionId: uuid("questionnaire_dimension_id")
      .notNull()
      .references(() => questionnaireDimensions.id, { onDelete: "cascade" }),

    weight: numeric("weight", { precision: 8, scale: 4 })
      .default("1")
      .notNull(),

    reverseScored: boolean("reverse_scored").default(false).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("questionnaire_page_dimension_scores_page_dimension_active_uidx")
      .on(table.questionnairePageId, table.questionnaireDimensionId)
      .where(sql`${table.deletedAt} is null`),

    index("questionnaire_page_dimension_scores_page_id_idx").on(
      table.questionnairePageId,
    ),

    index("questionnaire_page_dimension_scores_dimension_id_idx").on(
      table.questionnaireDimensionId,
    ),

    index("questionnaire_page_dimension_scores_deleted_at_idx").on(
      table.deletedAt,
    ),
  ],
);