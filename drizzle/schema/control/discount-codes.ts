import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const discountCodeStatusEnum = pgEnum("discount_code_status", [
  "active",
  "paused",
  "archived",
]);

export const discountCodeTypeEnum = pgEnum("discount_code_type", [
  "fixed_amount",
  "percent",
]);

export const discountCodeAppliesToEnum = pgEnum("discount_code_applies_to", [
  "report_unlock",
  "report_access_purchase",
  "all_report_access",
]);

export const discountCodes = pgTable(
  "discount_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    codeHash: text("code_hash").notNull(),
    codePreview: text("code_preview").notNull(),

    name: text("name").notNull(),
    description: text("description"),

    status: discountCodeStatusEnum("status").notNull().default("active"),
    discountType: discountCodeTypeEnum("discount_type").notNull(),

    discountValueCents: integer("discount_value_cents"),
    discountPercentBps: integer("discount_percent_bps"),
    allowZeroFinalPrice: boolean("allow_zero_final_price")
      .notNull()
      .default(true),
    maximumDiscountCents: integer("maximum_discount_cents"),
    minimumOrderValueCents: integer("minimum_order_value_cents"),

    appliesTo: discountCodeAppliesToEnum("applies_to")
      .notNull()
      .default("all_report_access"),

    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),

    maxRedemptions: integer("max_redemptions"),
    maxRedemptionsPerUser: integer("max_redemptions_per_user"),
    maxRedemptionsPerTenant: integer("max_redemptions_per_tenant"),

    /**
     * Opcjonalne przypisanie indywidualnego kodu do konkretnego użytkownika.
     * Walidacja checkoutu musi odrzucić użycie przez inną osobę.
     */
    assignedUserId: uuid("assigned_user_id"),

    /**
     * Jawne pochodzenie kodu. sourceReferenceId jest np. ID rewardu z tenant DB.
     * Brak FK jest celowy — obiekt źródłowy znajduje się w innej bazie.
     */
    sourceType: text("source_type"),
    sourceReferenceId: uuid("source_reference_id"),

    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    codeHashUidx: uniqueIndex("discount_codes_code_hash_uidx").on(
      table.codeHash,
    ),
    sourceReferenceUidx: uniqueIndex(
      "discount_codes_source_reference_uidx",
    ).on(table.sourceType, table.sourceReferenceId),
    assignedUserIdIdx: index("discount_codes_assigned_user_id_idx").on(
      table.assignedUserId,
    ),
  }),
);
