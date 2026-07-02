import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { users } from "./users";

/**
 * Globalny indeks techniczny pozwalający powiązać konto użytkownika
 * z respondentem znajdującym się w konkretnej tenant DB.
 *
 * Nie przechowuje wyników ani odpowiedzi psychometrycznych.
 */
export const respondentIdentityIndex = pgTable(
  "respondent_identity_index",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    /**
     * Respondent znajduje się fizycznie w bazie tego tenanta.
     */
    tenantSlug: varchar("tenant_slug", {
      length: 160,
    }).notNull(),

    /**
     * ID respondenta jest lokalne dla tenant DB.
     */
    respondentId: uuid("respondent_id").notNull(),

    /**
     * Znormalizowany e-mail służy do powiązania respondenta
     * z kontem użytkownika, także gdy konto powstało później.
     */
    normalizedEmail: varchar("normalized_email", {
      length: 320,
    }),

    /**
     * Powiązanie może zostać ustalone bezpośrednio po znalezieniu
     * konta użytkownika o tym samym adresie e-mail.
     */
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    status: varchar("status", {
      length: 32,
    })
      .notNull()
      .default("active"),

    lastSyncedAt: timestamp("last_synced_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

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
  (table) => ({
    /**
     * Jeden respondent może mieć tylko jeden aktywny wpis indeksu.
     */
    tenantRespondentUnique: uniqueIndex(
      "respondent_identity_index_tenant_respondent_uidx",
    ).on(table.tenantSlug, table.respondentId),

    /**
     * Główne indeksy wykorzystywane podczas pobierania raportów.
     */
    userIdIdx: index(
      "respondent_identity_index_user_id_idx",
    ).on(table.userId),

    normalizedEmailIdx: index(
      "respondent_identity_index_normalized_email_idx",
    ).on(table.normalizedEmail),

    tenantStatusIdx: index(
      "respondent_identity_index_tenant_status_idx",
    ).on(table.tenantSlug, table.status),
  }),
);

export type RespondentIdentityIndexRow =
  typeof respondentIdentityIndex.$inferSelect;

export type NewRespondentIdentityIndexRow =
  typeof respondentIdentityIndex.$inferInsert;