import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { questionnairePages } from "./questionnaire-pages";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "./common-columns";
import {
  questionnaireItemTypeEnum,
  questionnaireStatusEnum,
  questionnaireVersionStatusEnum,
} from "./enums";

export const questionnaires = pgTable(
  "questionnaires",
  {
    ...id,

    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    status: questionnaireStatusEnum("status").default("draft").notNull(),

    metadata: jsonb("metadata").default({}).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("questionnaires_code_uidx").on(table.code),
    index("questionnaires_status_idx").on(table.status),
    index("questionnaires_deleted_at_idx").on(table.deletedAt),
  ],
);

export const questionnaireVersions = pgTable(
  "questionnaire_versions",
  {
    ...id,

    questionnaireId: uuid("questionnaire_id")
      .notNull()
      .references(() => questionnaires.id, { onDelete: "cascade" }),

    version: text("version").notNull(),
    name: text("name").notNull(),
    description: text("description"),

    status: questionnaireVersionStatusEnum("status").default("draft").notNull(),

    scoringConfig: jsonb("scoring_config").default({}).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("questionnaire_versions_questionnaire_version_uidx").on(
      table.questionnaireId,
      table.version,
    ),
    index("questionnaire_versions_questionnaire_id_idx").on(
      table.questionnaireId,
    ),
    index("questionnaire_versions_status_idx").on(table.status),
    index("questionnaire_versions_deleted_at_idx").on(table.deletedAt),
  ],
);

export const questionnaireItems = pgTable(
  "questionnaire_items",
  {
    ...id,


    questionnaireVersionId: uuid("questionnaire_version_id")
      .notNull()
      .references(() => questionnaireVersions.id, { onDelete: "cascade" }),
    questionnairePageId: uuid("questionnaire_page_id").references(
      () => questionnairePages.id,
      { onDelete: "set null" },
    ),
    code: text("code").notNull(),
    orderIndex: integer("order_index").default(0).notNull(),

    type: questionnaireItemTypeEnum("type").default("likert").notNull(),

    text: text("text").notNull(),
    helpText: text("help_text"),

    required: boolean("required").default(true).notNull(),

    scaleMin: integer("scale_min"),
    scaleMax: integer("scale_max"),
    scaleMinLabel: text("scale_min_label"),
    scaleMaxLabel: text("scale_max_label"),

    options: jsonb("options").default([]).notNull(),
    responseConfig: jsonb("response_config").default({}).notNull(),
    
    scoringKey: jsonb("scoring_key").default({}).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("questionnaire_items_version_code_uidx").on(
      table.questionnaireVersionId,
      table.code,
    ),
    index("questionnaire_items_version_id_idx").on(
      table.questionnaireVersionId,
    ),
    index("questionnaire_items_order_idx").on(table.orderIndex),
    index("questionnaire_items_deleted_at_idx").on(table.deletedAt),
  ],
);