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
  | "respondent:create"
  | "respondent:update"
  | "assessment_result:read"
  | "report:generate"
  | "report:read"
  | "report:download"
  | "questionnaire:manage"
  | "scoring_model:manage"
  | "client_unit:read"
  | "client_unit:create"
  | "client_unit:update"
  | "assessment_project_respondent:read"
  | "assessment_project_respondent:create"
  | "assessment_project_respondent:update"
  
  ;

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
    "respondent:create",
    "respondent:update",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "questionnaire:manage",
    "scoring_model:manage",
    "client_unit:read",
    "client_unit:create",
    "client_unit:update",
    "assessment_project_respondent:read",
    "assessment_project_respondent:create",
    "assessment_project_respondent:update",
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
    "respondent:create",
    "respondent:update",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "client_unit:read",
    "client_unit:create",
    "client_unit:update",
    "assessment_project_respondent:read",
    "assessment_project_respondent:create",
    "assessment_project_respondent:update",
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
    "respondent:create",
    "respondent:update",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "client_unit:read",
    "client_unit:create",
    "client_unit:update",
    "assessment_project_respondent:read",
    "assessment_project_respondent:create",
    "assessment_project_respondent:update",
  ],
  
  TENANT_MEMBER: [
    "tenant:read",
    "client_organization:read",
    "assessment_project:read",
    "respondent:read",
    "report:read",
    "client_unit:read",
    "respondent:read",
    "assessment_project_respondent:read",
    "assessment_result:read",
  ],


  CLIENT_COMPANY_ADMIN: [
    "tenant:read",
    "client_organization:read",
    "assessment_project:read",
    "respondent:read",
    "report:read",
    "client_unit:read",
    "respondent:read",
    "assessment_project_respondent:read",
    "assessment_result:read",
  ],

  CLIENT_MANAGER: [
    "tenant:read",
    "client_organization:read",
    "assessment_project:read",
    "respondent:read",
    "report:read",
    "client_unit:read",
    "respondent:read",
    "assessment_project_respondent:read",
    "assessment_result:read",
  ],

  PSYCHOMETRIC_ADMIN: [
    "tenant:read",
    "assessment_result:read",
    "report:generate",
    "report:read",
    "report:download",
    "questionnaire:manage",
    "scoring_model:manage",
    "respondent:create",
    "respondent:update",
    "assessment_project_respondent:read",
    "assessment_project_respondent:create",
    "assessment_project_respondent:update",
  ],

  BILLING_ADMIN: ["tenant:read"],
};

export function getPermissionsForTenantRole(role: TenantRole): Permission[] {
  return TENANT_ROLE_PERMISSIONS[role] ?? [];
}