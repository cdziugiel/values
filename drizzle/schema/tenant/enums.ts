import { pgEnum } from "drizzle-orm/pg-core";

export const clientOrganizationStatusEnum = pgEnum(
  "client_organization_status",
  ["active", "inactive", "archived"],
);

export const clientUnitTypeEnum = pgEnum("client_unit_type", [
  "organization",
  "division",
  "department",
  "team",
  "other",
]);

export const assessmentProjectStatusEnum = pgEnum(
  "assessment_project_status",
  ["draft", "active", "closed", "archived"],
);