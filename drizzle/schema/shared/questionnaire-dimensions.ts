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
} from "./common-columns";
import { questionnaireVersions } from "./questionnaires";

export const questionnaireDimensions = pgTable(
  "questionnaire_dimensions",
  {
    ...id,

    questionnaireVersionId: uuid("questionnaire_version_id")
      .notNull()
      .references(() => questionnaireVersions.id, { onDelete: "cascade" }),

    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    orderIndex: integer("order_index").default(0).notNull(),

    metadata: jsonb("metadata").default({}).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("questionnaire_dimensions_version_code_uidx").on(
      table.questionnaireVersionId,
      table.code,
    ),
    index("questionnaire_dimensions_version_id_idx").on(
      table.questionnaireVersionId,
    ),
    index("questionnaire_dimensions_order_idx").on(table.orderIndex),
    index("questionnaire_dimensions_deleted_at_idx").on(table.deletedAt),
  ],
);