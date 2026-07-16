import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";

import { reportTemplateVersions } from "../shared/report-builder";
import { questionnaireVersions } from "../shared/questionnaires";

export const reportPreviewSnapshots = pgTable(
  "report_preview_snapshots",
  {
    ...id,

    reportTemplateVersionId: uuid("report_template_version_id")
      .notNull()
      .references(() => reportTemplateVersions.id, {
        onDelete: "cascade",
      }),

    questionnaireVersionId: uuid("questionnaire_version_id")
      .notNull()
      .references(() => questionnaireVersions.id, {
        onDelete: "cascade",
      }),

    payload: jsonb("payload").notNull(),

    expiresAt: timestamp("expires_at", {
      withTimezone: true,
    }).notNull(),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("report_preview_snapshots_template_version_idx").on(
      table.reportTemplateVersionId,
    ),
    index("report_preview_snapshots_questionnaire_version_idx").on(
      table.questionnaireVersionId,
    ),
    index("report_preview_snapshots_created_by_idx").on(table.createdBy),
    index("report_preview_snapshots_expires_at_idx").on(table.expiresAt),
    index("report_preview_snapshots_deleted_at_idx").on(table.deletedAt),
  ],
);
