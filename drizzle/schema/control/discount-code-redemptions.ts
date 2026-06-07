import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { discountCodes } from "./discount-codes";

export const discountCodeRedemptionStatusEnum = pgEnum(
  "discount_code_redemption_status",
  ["redeemed", "cancelled"],
);

export const discountCodeRedemptionContextEnum = pgEnum(
  "discount_code_redemption_context",
  ["report_unlock", "report_access_purchase"],
);

export const discountCodeRedemptions = pgTable("discount_code_redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),

  discountCodeId: uuid("discount_code_id")
    .notNull()
    .references(() => discountCodes.id),

  status: discountCodeRedemptionStatusEnum("status")
    .notNull()
    .default("redeemed"),

  redemptionContext: discountCodeRedemptionContextEnum("redemption_context")
    .notNull(),

  /**
   * To są identyfikatory logiczne. Część obiektów może żyć w tenant DB,
   * więc nie robimy tutaj cross-db foreign keys.
   */
  userId: uuid("user_id"),
  tenantId: uuid("tenant_id"),

  orderId: uuid("order_id"),
  reportAccessOrderId: uuid("report_access_order_id"),
  reportAccessGrantId: uuid("report_access_grant_id"),
  assessmentSessionId: uuid("assessment_session_id"),

  originalAmountCents: integer("original_amount_cents").notNull(),
  discountAmountCents: integer("discount_amount_cents").notNull(),
  finalAmountCents: integer("final_amount_cents").notNull(),
  currency: text("currency").notNull().default("PLN"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});