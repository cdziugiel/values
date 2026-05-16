// drizzle/schema/shared/questionnaire-item-dimension-scores.ts
import {
  boolean,
  index,
  numeric,
  pgTable,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "./common-columns";
import { questionnaireDimensions } from "./questionnaire-dimensions";
import { questionnaireItems } from "./questionnaires";

export const questionnaireItemDimensionScores = pgTable(
  "questionnaire_item_dimension_scores",
  {
    ...id,

    questionnaireItemId: uuid("questionnaire_item_id")
      .notNull()
      .references(() => questionnaireItems.id, { onDelete: "cascade" }),

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
    uniqueIndex("questionnaire_item_dimension_scores_item_dimension_active_uidx")
    .on(table.questionnaireItemId, table.questionnaireDimensionId)
    .where(sql`${table.deletedAt} is null`),
    
    index("questionnaire_item_dimension_scores_item_id_idx").on(
      table.questionnaireItemId,
    ),
    index("questionnaire_item_dimension_scores_dimension_id_idx").on(
      table.questionnaireDimensionId,
    ),
    index("questionnaire_item_dimension_scores_deleted_at_idx").on(
      table.deletedAt,
    ),
  ],
);