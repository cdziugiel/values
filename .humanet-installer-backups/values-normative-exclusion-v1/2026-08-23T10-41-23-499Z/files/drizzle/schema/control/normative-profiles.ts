import { date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { auditColumns, id, softDelete, timestamps } from "../shared/common-columns";
import { users } from "./users";

export const normativeProfiles = pgTable(
  "normative_profiles",
  {
    ...id,
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    revision: integer("revision").notNull().default(1),
    schemaVersion: text("schema_version").notNull().default("1.0"),
    dictionaryVersion: text("dictionary_version").notNull().default("2026-01"),
    dateOfBirth: date("date_of_birth").notNull(),
    birthYear: integer("birth_year").notNull(),
    sex: text("sex").notNull(),
    countryCode: text("country_code").notNull().default("PL"),
    voivodeshipCode: text("voivodeship_code"),
    localitySize: text("locality_size"),
    educationLevel: text("education_level"),
    educationFields: jsonb("education_fields").$type<string[]>().notNull().default([]),
    employmentStatus: text("employment_status"),
    industryCode: text("industry_code"),
    jobLevel: text("job_level"),
    jobFunction: text("job_function"),
    organizationSize: text("organization_size"),
    employmentSector: text("employment_sector"),
    recruitmentChannel: text("recruitment_channel").notNull().default("discount_incentive"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("normative_profiles_owner_user_uidx").on(table.ownerUserId),
    index("normative_profiles_sex_idx").on(table.sex),
    index("normative_profiles_voivodeship_idx").on(table.voivodeshipCode),
    index("normative_profiles_completed_at_idx").on(table.completedAt),
    index("normative_profiles_deleted_at_idx").on(table.deletedAt),
  ],
);
