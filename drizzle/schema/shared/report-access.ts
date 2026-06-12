import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  reportTemplates,
  reportTemplateVersions,
} from "./report-builder";

export const reportAccessProducts = pgTable(
  "report_access_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Typ raportu, np. INDIVIDUAL_REPORT.
     * Produkt NIE wskazuje konkretnej wersji raportu,
     * tylko typ/template raportu.
     */
    reportTemplateId: uuid("report_template_id")
      .notNull()
      .references(() => reportTemplates.id, {
        onDelete: "restrict",
      }),

    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    status: varchar("status", { length: 40 }).notNull().default("draft"),
    // draft | active | archived

    accessCount: integer("access_count").notNull().default(1),
    validityDays: integer("validity_days"),

    currency: varchar("currency", { length: 8 }).notNull().default("PLN"),

    priceNet: numeric("price_net", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    vatRate: numeric("vat_rate", {
      precision: 5,
      scale: 2,
    }).notNull().default("23"),

    priceGross: numeric("price_gross", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

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
    reportTemplateIdx: index("rap_report_template_idx").on(
      table.reportTemplateId,
    ),

    codeUnique: uniqueIndex("rap_code_unique")
      .on(table.code)
      .where(sql`deleted_at is null`),
  }),
);

export const reportAccessOrders = pgTable(
  "report_access_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    buyerType: varchar("buyer_type", { length: 40 }).notNull(),
    // user | tenant

    tenantSlug: varchar("tenant_slug", { length: 120 }),
    tenantId: uuid("tenant_id"),

    buyerUserId: uuid("buyer_user_id"),

    status: varchar("status", { length: 40 }).notNull().default("draft"),
    // draft | pending_payment | paid | failed | cancelled | refunded

    paymentProvider: varchar("payment_provider", { length: 80 }),
    paymentProviderOrderId: varchar("payment_provider_order_id", {
      length: 255,
    }),
    paymentProviderSessionId: varchar("payment_provider_session_id", {
      length: 255,
    }),

    currency: varchar("currency", { length: 8 }).notNull().default("PLN"),

    totalNet: numeric("total_net", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    totalVat: numeric("total_vat", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    totalGross: numeric("total_gross", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    invoiceRequested: boolean("invoice_requested").notNull().default(false),
    billingProfileId: uuid("billing_profile_id"),
    billingSnapshot: jsonb("billing_snapshot").notNull().default({}),

    metadata: jsonb("metadata").notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    createdBy: uuid("created_by"),
    updatedBy: uuid("updated_by"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    buyerUserIdx: index("rao_buyer_user_idx").on(table.buyerUserId),
    tenantSlugIdx: index("rao_tenant_slug_idx").on(table.tenantSlug),
    statusIdx: index("rao_status_idx").on(table.status),
  }),
);

export const reportAccessOrderItems = pgTable(
  "report_access_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    orderId: uuid("order_id")
      .notNull()
      .references(() => reportAccessOrders.id, {
        onDelete: "cascade",
      }),

    productId: uuid("product_id")
      .notNull()
      .references(() => reportAccessProducts.id, {
        onDelete: "restrict",
      }),

    quantity: integer("quantity").notNull().default(1),

    unitNet: numeric("unit_net", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    unitVat: numeric("unit_vat", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    unitGross: numeric("unit_gross", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    totalNet: numeric("total_net", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    totalVat: numeric("total_vat", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    totalGross: numeric("total_gross", {
      precision: 12,
      scale: 2,
    }).notNull().default("0"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    orderIdx: index("raoi_order_idx").on(table.orderId),
    productIdx: index("raoi_product_idx").on(table.productId),
  }),
);

export const reportAccessCodes = pgTable(
  "report_access_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    productId: uuid("product_id")
      .notNull()
      .references(() => reportAccessProducts.id, {
        onDelete: "restrict",
      }),

    orderId: uuid("order_id").references(() => reportAccessOrders.id, {
      onDelete: "set null",
    }),

    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    codePreview: varchar("code_preview", { length: 40 }).notNull(),

    status: varchar("status", { length: 40 }).notNull().default("available"),
    // available | assigned | redeemed | expired | cancelled

    tenantSlug: varchar("tenant_slug", { length: 120 }),
    tenantId: uuid("tenant_id"),

    ownerUserId: uuid("owner_user_id"),
    purchasedByUserId: uuid("purchased_by_user_id"),

    assignedToEmail: varchar("assigned_to_email", { length: 320 }),
    assignedToUserId: uuid("assigned_to_user_id"),
    subjectType: varchar("subject_type", { length: 60 }),
    subjectId: uuid("subject_id"),
    /**
     * Tenantowe identyfikatory trzymamy jako uuid bez FK,
     * bo znajdują się w tenant DB, nie w control DB.
     */
    assessmentProjectId: uuid("assessment_project_id"),
    assessmentSessionId: uuid("assessment_session_id"),
    assessmentAccessLinkId: uuid("assessment_access_link_id"),

    redeemedByUserId: uuid("redeemed_by_user_id"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),

    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),

    metadata: jsonb("metadata").notNull().default({}),

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
    codeHashUnique: uniqueIndex("rac_code_hash_unique")
      .on(table.codeHash)
      .where(sql`deleted_at is null`),

    productIdx: index("rac_product_idx").on(table.productId),
    orderIdx: index("rac_order_idx").on(table.orderId),
    sessionIdx: index("rac_session_idx").on(table.assessmentSessionId),
    tenantSlugIdx: index("rac_tenant_slug_idx").on(table.tenantSlug),
    statusIdx: index("rac_status_idx").on(table.status),
  }),
);

export const reportAccessGrants = pgTable(
  "report_access_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    source: varchar("source", { length: 40 }).notNull(),
    // purchase | access_code | invitation | admin_grant | placeholder_payment

    status: varchar("status", { length: 40 }).notNull().default("active"),
    // active | revoked | expired

    productId: uuid("product_id").references(() => reportAccessProducts.id, {
      onDelete: "set null",
    }),

    orderId: uuid("order_id").references(() => reportAccessOrders.id, {
      onDelete: "set null",
    }),

    accessCodeId: uuid("access_code_id").references(() => reportAccessCodes.id, {
      onDelete: "set null",
    }),

    /**
     * Typ raportu, np. Raport indywidualny.
     */
    reportTemplateId: uuid("report_template_id")
      .notNull()
      .references(() => reportTemplates.id, {
        onDelete: "restrict",
      }),

    /**
     * Zamrożona wersja raportu, do której user dostał dostęp.
     * To pole jest kluczowe: nawet jeśli później opublikujesz nową wersję,
     * user nadal widzi tę wersję, którą kupił/odblokował.
     */
    reportTemplateVersionId: uuid("report_template_version_id")
      .notNull()
      .references(() => reportTemplateVersions.id, {
        onDelete: "restrict",
      }),

    tenantSlug: varchar("tenant_slug", { length: 120 }).notNull(),
    tenantId: uuid("tenant_id"),

    userId: uuid("user_id"),
    email: varchar("email", { length: 320 }),

    subjectType: varchar("subject_type", { length: 60 })
      .notNull()
      .default("assessment_session"),
    // assessment_session | respondent | assessment_project | client_organization | client_unit | team | custom_cohort

    subjectId: uuid("subject_id"),


    assessmentProjectId: uuid("assessment_project_id"),
    assessmentSessionId: uuid("assessment_session_id"),
    assessmentAccessLinkId: uuid("assessment_access_link_id"),

    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),

    metadata: jsonb("metadata").notNull().default({}),

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
    sessionIdx: index("rag_session_idx").on(table.assessmentSessionId),
    userIdx: index("rag_user_idx").on(table.userId),
    tenantSlugIdx: index("rag_tenant_slug_idx").on(table.tenantSlug),
    templateIdx: index("rag_template_idx").on(table.reportTemplateId),
    subjectIdx: index("rag_subject_idx").on(table.subjectType, table.subjectId),
    templateVersionIdx: index("rag_template_version_idx").on(
      table.reportTemplateVersionId,
    ),

oneActiveGrantPerSessionReportAndScope: uniqueIndex(
  "rag_one_active_grant_per_session_report_scope_idx",
)
  .on(
    table.tenantSlug,
    table.assessmentSessionId,
    table.reportTemplateId,
    sql`COALESCE(metadata->>'projectQuestionnaireId', '')`,
    sql`COALESCE(metadata->>'questionnaireVersionId', '')`,
  )
  .where(
    sql`
      deleted_at is null
      and status = 'active'
      and assessment_session_id is not null
      and report_template_id is not null
    `,
  ),
  }),
);

export const billingProfiles = pgTable(
  "billing_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    ownerType: varchar("owner_type", { length: 40 }).notNull(),
    // user | tenant

    tenantSlug: varchar("tenant_slug", { length: 120 }),
    tenantId: uuid("tenant_id"),
    userId: uuid("user_id"),

    type: varchar("type", { length: 40 }).notNull(),
    // company | individual

    companyName: varchar("company_name", { length: 255 }),
    taxId: varchar("tax_id", { length: 80 }),

    firstName: varchar("first_name", { length: 120 }),
    lastName: varchar("last_name", { length: 120 }),

    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 80 }),

    country: varchar("country", { length: 80 }).notNull().default("PL"),
    postalCode: varchar("postal_code", { length: 40 }),
    city: varchar("city", { length: 160 }),
    street: varchar("street", { length: 255 }),
    buildingNumber: varchar("building_number", { length: 40 }),
    apartmentNumber: varchar("apartment_number", { length: 40 }),

    invoiceEmail: varchar("invoice_email", { length: 320 }),

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
    userIdx: index("bp_user_idx").on(table.userId),
    tenantSlugIdx: index("bp_tenant_slug_idx").on(table.tenantSlug),
  }),
);