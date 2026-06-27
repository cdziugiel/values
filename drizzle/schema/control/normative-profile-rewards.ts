import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id, timestamps } from "../shared/common-columns";
import { discountCodes } from "./discount-codes";
import { tenants } from "./tenants";
import { users } from "./users";
import { normativeProfiles } from "./normative-profiles";

export const normativeProfileRewardStatusEnum = pgEnum(
  "normative_profile_reward_status",
  ["pending", "issued", "redeemed", "expired", "revoked"],
);

export const normativeProfileRewards = pgTable(
  "normative_profile_rewards",
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
    rewardType: text("reward_type").notNull().default("discount_code"),
    status: normativeProfileRewardStatusEnum("status").notNull().default("pending"),
    usageLimit: integer("usage_limit").notNull().default(4),
    discountCodeId: uuid("discount_code_id").references(() => discountCodes.id, { onDelete: "set null" }),
    discountCodePreview: text("discount_code_preview"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    eligibleAgainAt: timestamp("eligible_again_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
    ...auditColumns,
  },
  (table) => [
    index("normative_profile_rewards_profile_idx").on(table.statisticalProfileId),
    index("normative_profile_rewards_owner_idx").on(table.ownerUserId),
    index("normative_profile_rewards_status_idx").on(table.status),
    index("normative_profile_rewards_eligible_again_at_idx").on(table.eligibleAgainAt),
  ],
);
