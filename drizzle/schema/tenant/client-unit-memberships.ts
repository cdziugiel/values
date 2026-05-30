import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { clientUnits } from "./client-units";
import { respondents } from "./respondents";

export const clientUnitMemberships = pgTable(
  "client_unit_memberships",
  {
    ...id,

    clientUnitId: uuid("client_unit_id")
      .notNull()
      .references(() => clientUnits.id, { onDelete: "cascade" }),

    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => respondents.id, { onDelete: "cascade" }),

    /**
     * Swobodna rola biznesowa osoby w jednostce, np.:
     * member, manager, director, team_lead, hr_partner, consultant.
     *
     * Nie używamy tu na razie enumu, żeby nie blokować importów
     * i różnic w nazewnictwie u różnych klientów.
     */
    role: text("role").default("member").notNull(),

    /**
     * Flaga analityczna/raportowa.
     * true  -> osoba liczona jako lider / zwierzchnik jednostki
     * false -> osoba liczona jako członek zespołu
     */
    isLeader: boolean("is_leader").default(false).notNull(),

    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),

    metadata: jsonb("metadata"),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("client_unit_memberships_client_unit_id_idx").on(table.clientUnitId),
    index("client_unit_memberships_respondent_id_idx").on(table.respondentId),
    index("client_unit_memberships_role_idx").on(table.role),
    index("client_unit_memberships_is_leader_idx").on(table.isLeader),
    index("client_unit_memberships_deleted_at_idx").on(table.deletedAt),
    index("client_unit_memberships_created_at_idx").on(table.createdAt),

    uniqueIndex("client_unit_memberships_unit_respondent_active_uidx")
      .on(table.clientUnitId, table.respondentId)
      .where(sql`${table.deletedAt} is null`),
  ],
);