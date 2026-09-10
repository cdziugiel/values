import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
    schemaVersion: text("schema_version").notNull().default("1.2"),
    dictionaryVersion: text("dictionary_version").notNull().default("2026-09-10"),
    dateOfBirth: date("date_of_birth").notNull(),
    birthYear: integer("birth_year").notNull(),
    sex: text("sex").notNull(),
    countryCode: text("country_code").notNull().default("PL"),
    voivodeshipCode: text("voivodeship_code"),
    localitySize: text("locality_size"),
    educationLevel: text("education_level"),
    educationFields: jsonb("education_fields").$type<string[]>().notNull().default([]),

    // @humanet-normative-work-situation-v1_2-db
    workSituation: text("work_situation"),

    // v1.1 legacy — historyczny screener 7-dniowy.
    workedLastWeek: boolean("worked_last_week"),
    hasJobTemporaryAbsence: boolean("has_job_temporary_absence"),
    isWorkingForNorms: boolean("is_working_for_norms"),
    employmentForm: text("employment_form"),
    workTime: text("work_time"),
    industryClassification: text("industry_classification"),
    industrySection: text("industry_section"),
    occupationMajorGroup: text("occupation_major_group"),
    managesPeople: boolean("manages_people"),
    ownershipSector: text("ownership_sector"),
    organizationTenure: text("organization_tenure"),

    // Pola HUMANET / legacy pozostają dla zgodności z istniejącymi raportami i adminem.
    employmentStatus: text("employment_status"),
    industryCode: text("industry_code"),
    jobLevel: text("job_level"),
    jobFunction: text("job_function"),
    organizationSize: text("organization_size"),
    employmentSector: text("employment_sector"),

    recruitmentChannel: text("recruitment_channel").notNull().default("discount_incentive"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),

    // @humanet-normative-exclusion-v1: manual quality-control exclusion; never hard-delete research observations.
    excludedFromNorms: boolean("excluded_from_norms").notNull().default(false),
    normativeExclusionReason: text("normative_exclusion_reason"),
    normativeExcludedAt: timestamp("normative_excluded_at", { withTimezone: true }),
    normativeExcludedByUserId: uuid("normative_excluded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    ...timestamps,
    ...auditColumns,
    ...softDelete,
  },
  (table) => [
    uniqueIndex("normative_profiles_owner_user_uidx").on(table.ownerUserId),
    index("normative_profiles_sex_idx").on(table.sex),
    index("normative_profiles_voivodeship_idx").on(table.voivodeshipCode),
    index("normative_profiles_work_situation_idx").on(table.workSituation),
    index("normative_profiles_working_idx").on(table.isWorkingForNorms),
    index("normative_profiles_occupation_major_group_idx").on(table.occupationMajorGroup),
    index("normative_profiles_completed_at_idx").on(table.completedAt),
    index("normative_profiles_excluded_from_norms_idx").on(table.excludedFromNorms),
    index("normative_profiles_deleted_at_idx").on(table.deletedAt),
  ],
);
