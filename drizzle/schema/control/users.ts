import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";
import { globalRoleEnum, userStatusEnum } from "../shared/enums";

export const users = pgTable(
  "users",
  {
    ...id,
    email: text("email").notNull(),
    name: text("name"),
    image: text("image"),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    passwordHash: text("password_hash"),
    externalAuthId: text("external_auth_id"),
    globalRole: globalRoleEnum("global_role").default("USER").notNull(),
    status: userStatusEnum("status").default("active").notNull(),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    index("users_status_idx").on(table.status),
    index("users_global_role_idx").on(table.globalRole),
  ],
);