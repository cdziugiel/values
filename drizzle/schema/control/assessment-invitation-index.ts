// drizzle/schema/control/assessment-invitation-index.ts

import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  id,
  timestamps,
  softDelete,
} from "../shared/common-columns";
import { tenants } from "./tenants";
import { users } from "./users";

export const assessmentInvitationIndex = pgTable(
  "assessment_invitation_index",
  {
    ...id,

    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    tenantSlug: text("tenant_slug").notNull(),
    tenantName: text("tenant_name").notNull(),

    respondentEmailNormalized: text("respondent_email_normalized").notNull(),

    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    tenantRespondentId: uuid("tenant_respondent_id").notNull(),
    tenantProjectId: uuid("tenant_project_id").notNull(),
    tenantProjectRespondentId: uuid("tenant_project_respondent_id").notNull(),

    tenantProjectQuestionnaireId: uuid("tenant_project_questionnaire_id")
      .notNull(),

    tenantSessionId: uuid("tenant_session_id"),
    tenantAccessLinkId: uuid("tenant_access_link_id"),

    questionnaireId: uuid("questionnaire_id").notNull(),
    questionnaireVersionId: uuid("questionnaire_version_id").notNull(),

    projectNameSnapshot: text("project_name_snapshot"),
    questionnaireNameSnapshot: text("questionnaire_name_snapshot"),
    questionnaireVersionNameSnapshot: text("questionnaire_version_name_snapshot"),

    status: text("status").notNull().default("invited"),

    invitedAt: timestamp("invited_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    ...timestamps,
    ...softDelete,
  },
  (table) => [
    index("assessment_invitation_index_email_idx").on(
      table.respondentEmailNormalized,
    ),
    index("assessment_invitation_index_user_id_idx").on(table.userId),
    index("assessment_invitation_index_tenant_id_idx").on(table.tenantId),
    index("assessment_invitation_index_status_idx").on(table.status),
    index("assessment_invitation_index_session_idx").on(table.tenantSessionId),

    uniqueIndex("assessment_invitation_index_unique_invitation_questionnaire").on(
      table.tenantId,
      table.tenantProjectRespondentId,
      table.tenantProjectQuestionnaireId,
    ),
  ],
);