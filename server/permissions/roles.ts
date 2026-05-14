export type GlobalRole = "SUPER_ADMIN" | "USER";

export type TenantRole =
  | "TENANT_OWNER"
  | "TENANT_ADMIN"
  | "TENANT_MEMBER"
  | "CONSULTANT"
  | "CLIENT_COMPANY_ADMIN"
  | "CLIENT_MANAGER"
  | "PSYCHOMETRIC_ADMIN"
  | "BILLING_ADMIN";

export type Permission =
  | "tenant:read"
  | "tenant:manage"
  | "user:invite"
  | "client_organization:read"
  | "client_organization:create"
  | "assessment_project:read"
  | "assessment_project:create"
  | "assessment_project:update"
  | "respondent:read"
  | "respondent:invite"
  | "assessment_result:read"
  | "report:generate"
  | "report:read"
  | "report:download"
  | "questionnaire:manage"
  | "scoring_model:manage"
  | "client_unit:read"
  | "client_unit:create"
  | "client_unit:update";

export const TENANT_ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  TENANT_OWNER: [
    "tenant:read",
    "tenant:manage",
    "user:invite",
    "client_organization:read",
    "client_organization:create",
    "assessment_project:read",
    "assessment_project:create",
    "assessment_project:update",
    "respondent:read",
    "respondent:invite",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "questionnaire:manage",
    "scoring_model:manage",
    "client_unit:read",
    "client_unit:create",
    "client_unit:update",
  ],

  TENANT_ADMIN: [
    "tenant:read",
    "user:invite",
    "client_organization:read",
    "client_organization:create",
    "assessment_project:read",
    "assessment_project:create",
    "assessment_project:update",
    "respondent:read",
    "respondent:invite",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "client_unit:read",
    "client_unit:create",
    "client_unit:update",
  ],

  TENANT_MEMBER: [
    "tenant:read",
    "client_organization:read",
    "assessment_project:read",
    "respondent:read",
    "report:read",
    "client_unit:read",
  ],

  CONSULTANT: [
    "tenant:read",
    "client_organization:read",
    "client_organization:create",
    "assessment_project:read",
    "assessment_project:create",
    "assessment_project:update",
    "respondent:read",
    "respondent:invite",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "client_unit:read",
    "client_unit:create",
    "client_unit:update",
  ],

  CLIENT_COMPANY_ADMIN: [
    "tenant:read",
    "client_organization:read",
    "assessment_project:read",
    "respondent:read",
    "report:read",
    "client_unit:read",
  ],

  CLIENT_MANAGER: [
    "tenant:read",
    "client_organization:read",
    "assessment_project:read",
    "respondent:read",
    "report:read",
    "client_unit:read",
  ],

  PSYCHOMETRIC_ADMIN: [
    "tenant:read",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "questionnaire:manage",
    "scoring_model:manage",
  ],

  BILLING_ADMIN: ["tenant:read"],
};

export function getPermissionsForTenantRole(role: TenantRole): Permission[] {
  return TENANT_ROLE_PERMISSIONS[role] ?? [];
}