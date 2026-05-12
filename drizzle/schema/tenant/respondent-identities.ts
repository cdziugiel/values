import { index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import {
  auditColumns,
  id,
  softDelete,
  timestamps,
} from "../shared/common-columns";
import { respondents } from "./respondents";

export const respondentIdentities = pgTable(
  "respondent_identities",
  {
    ...id,
    respondentId: uuid("respondent_id")
      .notNull()
      .references(() => respondents.id, { onDelete: "cascade" }),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    phone: text("phone"),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("respondent_identities_respondent_id_unique").on(
      table.respondentId,
    ),
    index("respondent_identities_email_idx").on(table.email),
    index("respondent_identities_deleted_at_idx").on(table.deletedAt),
  ],
);