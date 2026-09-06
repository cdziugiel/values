import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { id, timestamps } from "../shared/common-columns";
import { tenants } from "./tenants";
import { normativeProfiles } from "./normative-profiles";

export const normativeProfileSessionLinks = pgTable(
  "normative_profile_session_links",
  {
    ...id,
    statisticalProfileId: uuid("statistical_profile_id")
      .notNull()
      .references(() => normativeProfiles.id, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    assessmentSessionId: uuid("assessment_session_id").notNull(),
    respondentId: uuid("respondent_id").notNull(),
    assessmentProjectId: uuid("assessment_project_id").notNull(),
    projectRespondentId: uuid("project_respondent_id").notNull(),
    profileRevision: integer("profile_revision").notNull(),
    profileSnapshot: jsonb("profile_snapshot").$type<Record<string, unknown>>().notNull(),

    // v1.1 — metadane źródła konkretnej obserwacji / fali panelowej.
    recruitmentChannel: text("recruitment_channel"),
    recruitmentProvider: text("recruitment_provider"),
    externalRespondentId: text("external_respondent_id"),
    sampleWave: text("sample_wave"),
    sampleProjectCode: text("sample_project_code"),
    quotaCell: text("quota_cell"),
    panelMetadata: jsonb("panel_metadata").$type<Record<string, unknown> | null>(),

    assessmentCompletedAt: timestamp("assessment_completed_at", { withTimezone: true }).notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("normative_profile_session_links_tenant_session_uidx").on(
      table.tenantId,
      table.assessmentSessionId,
    ),
    index("normative_profile_session_links_profile_idx").on(table.statisticalProfileId),
    index("normative_profile_session_links_tenant_idx").on(table.tenantId),
    index("normative_profile_session_links_sample_wave_idx").on(table.sampleWave),
    index("normative_profile_session_links_external_respondent_idx").on(
      table.recruitmentProvider,
      table.externalRespondentId,
    ),
  ],
);
