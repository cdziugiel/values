import { timestamp, uuid } from "drizzle-orm/pg-core";

export const id = {
  id: uuid("id").defaultRandom().primaryKey(),
};

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const auditColumns = {
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};

export const softDelete = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};