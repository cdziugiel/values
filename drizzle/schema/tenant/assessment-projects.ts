import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { clientOrganizations } from "./client-organizations";
import { assessmentProjectStatusEnum } from "./enums";

export const assessmentProjects = pgTable(
  "assessment_projects",
  {
    ...id,
    clientOrganizationId: uuid("client_organization_id").references(
      () => clientOrganizations.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    description: text("description"),
    status: assessmentProjectStatusEnum("status").default("draft").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    index("assessment_projects_client_organization_id_idx").on(
      table.clientOrganizationId,
    ),
    index("assessment_projects_status_idx").on(table.status),
    index("assessment_projects_starts_at_idx").on(table.startsAt),
    index("assessment_projects_ends_at_idx").on(table.endsAt),
    index("assessment_projects_deleted_at_idx").on(table.deletedAt),
    index("assessment_projects_created_at_idx").on(table.createdAt),
  ],
);