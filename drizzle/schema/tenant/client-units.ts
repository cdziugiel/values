import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { clientOrganizations } from "./client-organizations";
import { clientUnitTypeEnum } from "./enums";

export const clientUnits = pgTable(
  "client_units",
  {
    ...id,
    clientOrganizationId: uuid("client_organization_id")
      .notNull()
      .references(() => clientOrganizations.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    name: text("name").notNull(),
    type: clientUnitTypeEnum("type").default("department").notNull(),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("client_units_client_organization_id_idx").on(
      table.clientOrganizationId,
    ),
    index("client_units_parent_id_idx").on(table.parentId),
    index("client_units_type_idx").on(table.type),
    index("client_units_deleted_at_idx").on(table.deletedAt),
  ],
);