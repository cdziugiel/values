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

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    group: varchar("group", { length: 60 }).notNull(),
    kind: varchar("kind", { length: 60 }).notNull(),

    code: varchar("code", { length: 120 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    status: varchar("status", { length: 40 })
      .notNull()
      .default("draft"),

    currency: varchar("currency", { length: 8 })
      .notNull()
      .default("PLN"),

    priceNet: numeric("price_net", {
      precision: 12,
      scale: 2,
    }).notNull(),

    vatRate: numeric("vat_rate", {
      precision: 5,
      scale: 2,
    }).notNull(),

    priceGross: numeric("price_gross", {
      precision: 12,
      scale: 2,
    }).notNull(),

    config: jsonb("config").notNull().default({}),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    deletedAt: timestamp("deleted_at", {
      withTimezone: true,
    }),
  },
);