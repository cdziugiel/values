import { index, pgTable, text } from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { clientOrganizationStatusEnum } from "./enums";

export const clientOrganizations = pgTable(
  "client_organizations",
  {
    ...id,
    name: text("name").notNull(),
    industry: text("industry"),
    size: text("size"),
    status: clientOrganizationStatusEnum("status").default("active").notNull(),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("client_organizations_status_idx").on(table.status),
    index("client_organizations_deleted_at_idx").on(table.deletedAt),
    index("client_organizations_created_at_idx").on(table.createdAt),
  ],
);