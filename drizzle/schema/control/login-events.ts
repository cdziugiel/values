import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { id } from "../shared/common-columns";
import { users } from "./users";

export const loginEvents = pgTable(
  "login_events",
  {
    ...id,
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: text("email"),
    result: text("result").notNull(),
    reason: text("reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("login_events_user_id_idx").on(table.userId),
    index("login_events_email_idx").on(table.email),
    index("login_events_result_idx").on(table.result),
    index("login_events_created_at_idx").on(table.createdAt),
  ],
);