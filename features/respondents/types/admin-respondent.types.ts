// @humanet-respondent-directory-v1
// features/respondents/types/admin-respondent.types.ts

export type AdminRespondentQuestionnaireRunStatus =
  | "started"
  | "completed";

export type AdminRespondentQuestionnaireRun = {
  projectId: string;
  projectName: string | null;
  questionnaireId: string | null;
  questionnaireVersionId: string;
  questionnaireCode: string | null;
  questionnaireName: string;
  questionnaireVersion: string | null;
  status: AdminRespondentQuestionnaireRunStatus;
  responseCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type AdminRespondentListItem = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  respondentId: string;
  externalCode: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
  unitName: string | null;
  createdAt: Date;
  sessionsCount: number;
  questionnaireRuns: AdminRespondentQuestionnaireRun[];
};

export type AdminRespondentTenantReadError = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  message: string;
};

export type AdminRespondentDirectoryData = {
  respondents: AdminRespondentListItem[];
  tenantErrors: AdminRespondentTenantReadError[];
  tenantCount: number;
  readableTenantCount: number;
  generatedAt: Date;
};
