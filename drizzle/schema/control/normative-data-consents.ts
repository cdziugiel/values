import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id, timestamps } from "../shared/common-columns";
import { users } from "./users";
import { tenants } from "./tenants";
import { normativeProfiles } from "./normative-profiles";

export const normativeDataConsents = pgTable(
  "normative_data_consents",
  {
    ...id,
    statisticalProfileId: uuid("statistical_profile_id")
      .notNull()
      .references(() => normativeProfiles.id, { onDelete: "restrict" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sourceTenantId: uuid("source_tenant_id")
      .references(() => tenants.id, { onDelete: "set null" }),
    sourceAssessmentSessionId: uuid("source_assessment_session_id"),
    consentType: text("consent_type").notNull().default("normative_data_processing"),
    consentVersion: text("consent_version").notNull(),
    purposeCode: text("purpose_code").notNull().default("psychometric_norm_development"),
    consentTextSnapshot: text("consent_text_snapshot").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
    ...auditColumns,
  },
  (table) => [
    index("normative_data_consents_profile_idx").on(table.statisticalProfileId),
    index("normative_data_consents_owner_idx").on(table.ownerUserId),
    index("normative_data_consents_accepted_at_idx").on(table.acceptedAt),
    index("normative_data_consents_withdrawn_at_idx").on(table.withdrawnAt),
  ],
);
