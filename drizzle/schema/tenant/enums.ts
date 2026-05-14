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

export const assessmentSessionStatusEnum = pgEnum(
  "assessment_session_status",
  ["in_progress", "completed", "abandoned", "expired", "not_started"],
);

export const assessmentProjectQuestionnaireStatusEnum = pgEnum(
  "assessment_project_questionnaire_status",
  ["active", "archived"],
);

export const assessmentResponseValueTypeEnum = pgEnum(
  "assessment_response_value_type",
  ["number", "text", "boolean", "json"],
);