import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { clientOrganizations } from "./client-organizations";
import { clientUnits } from "./client-units";

export const respondents = pgTable(
  "respondents",
  {
    ...id,
    externalCode: text("external_code"),
    clientOrganizationId: uuid("client_organization_id").references(
      () => clientOrganizations.id,
      { onDelete: "set null" },
    ),
    clientUnitId: uuid("client_unit_id").references(() => clientUnits.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata"),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("respondents_external_code_idx").on(table.externalCode),
    index("respondents_client_organization_id_idx").on(
      table.clientOrganizationId,
    ),
    index("respondents_client_unit_id_idx").on(table.clientUnitId),
    index("respondents_deleted_at_idx").on(table.deletedAt),
    index("respondents_created_at_idx").on(table.createdAt),
  ],
);