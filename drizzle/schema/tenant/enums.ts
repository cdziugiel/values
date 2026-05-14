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

export const assessmentProjectRespondentStatusEnum = pgEnum(
  "assessment_project_respondent_status",
  ["invited", "started", "completed", "excluded", "archived"],
);

export const assessmentAccessLinkStatusEnum = pgEnum(
  "assessment_access_link_status",
  ["active", "used", "revoked", "expired"],
);