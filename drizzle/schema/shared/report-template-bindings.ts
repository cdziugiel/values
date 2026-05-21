// drizzle/schema/shared/report-template-bindings.ts
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { questionnaireVersions } from "./questionnaires";
import { reportTemplateVersions } from "./report-builder";

export const questionnaireReportTemplateBindings = pgTable(
  "questionnaire_report_template_bindings",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    questionnaireVersionId: uuid("questionnaire_version_id")
      .notNull()
      .references(() => questionnaireVersions.id, {
        onDelete: "cascade",
      }),

    reportTemplateVersionId: uuid("report_template_version_id")
      .notNull()
      .references(() => reportTemplateVersions.id, {
        onDelete: "restrict",
      }),

    isDefault: boolean("is_default").notNull().default(true),

    status: text("status").notNull().default("active"),
    // active | inactive

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    questionnaireVersionIdx: index(
      "qrtb_questionnaire_version_idx",
    ).on(table.questionnaireVersionId),

    reportTemplateVersionIdx: index(
      "qrtb_report_template_version_idx",
    ).on(table.reportTemplateVersionId),

    oneActiveDefaultPerQuestionnaireVersion: uniqueIndex(
      "qrtb_one_default_per_questionnaire_version_idx",
    )
      .on(table.questionnaireVersionId, table.isDefault)
      .where(sql`deleted_at is null`),
  }),
);