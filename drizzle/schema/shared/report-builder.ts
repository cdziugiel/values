// drizzle/schema/report-builder.ts

import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  questionnaireVersions,
  questionnaires,
} from "@/drizzle/schema";

export const reportTemplates = pgTable(
  "report_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    questionnaireId: uuid("questionnaire_id")
      .notNull()
      .references(() => questionnaires.id, {
        onDelete: "restrict",
      }),

    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    status: varchar("status", { length: 40 }).notNull().default("draft"),
    // draft | active | archived

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
    questionnaireCodeUnique: uniqueIndex(
      "report_templates_questionnaire_code_unique",
    )
      .on(table.questionnaireId, table.code)
      .where(sql`deleted_at is null`),
  }),
);

export const reportTemplateVersions = pgTable(
  "report_template_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reportTemplateId: uuid("report_template_id")
      .notNull()
      .references(() => reportTemplates.id, {
        onDelete: "restrict",
      }),

    questionnaireVersionId: uuid("questionnaire_version_id")
      .notNull()
      .references(() => questionnaireVersions.id, {
        onDelete: "restrict",
      }),

    version: varchar("version", { length: 80 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    status: varchar("status", { length: 40 }).notNull().default("draft"),
    // draft | active | archived

    isDefault: boolean("is_default").notNull().default(false),

    globalCss: text("global_css"),
    globalJs: text("global_js"),

    pageSize: varchar("page_size", { length: 20 }).notNull().default("A4"),
    orientation: varchar("orientation", { length: 20 })
      .notNull()
      .default("portrait"),
    // portrait | landscape

    config: jsonb("config").notNull().default({}),
    dataBindings: jsonb("data_bindings").notNull().default({}),

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
    templateVersionUnique: uniqueIndex(
      "report_template_versions_template_version_unique",
    )
      .on(table.reportTemplateId, table.version)
      .where(sql`deleted_at is null`),
  }),
);

export const reportTemplatePages = pgTable(
  "report_template_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    reportTemplateVersionId: uuid("report_template_version_id")
      .notNull()
      .references(() => reportTemplateVersions.id, {
        onDelete: "cascade",
      }),

    code: varchar("code", { length: 120 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    orderIndex: integer("order_index").notNull().default(1),

    html: text("html").notNull().default(""),
    css: text("css").notNull().default(""),
    js: text("js").notNull().default(""),

    /**
     * Warunek widoczności strony.
     *
     * Przykład:
     * {
     *   "type": "score",
     *   "category": "vMEME",
     *   "code": "TRADITION",
     *   "metric": "weightedMeanScore",
     *   "operator": "gte",
     *   "value": 2
     * }
     */
    visibilityCondition: jsonb("visibility_condition"),

    /**
     * Lista komponentów aplikacyjnych dostępnych na stronie.
     *
     * Przykład:
     * [
     *   {
     *     "slot": "vmemeChart",
     *     "component": "DimensionRadarChart",
     *     "props": {
     *       "category": "vMEME"
     *     }
     *   }
     * ]
     */
    componentBindings: jsonb("component_bindings").notNull().default([]),

    /**
     * Dodatkowa konfiguracja strony, np. marginesy,
     * tło, tryb debugowania, blokowanie łamania strony itd.
     */
    config: jsonb("config").notNull().default({}),

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
    versionPageCodeUnique: uniqueIndex(
      "report_template_pages_version_code_unique",
    )
      .on(table.reportTemplateVersionId, table.code)
      .where(sql`deleted_at is null`),
  }),
);