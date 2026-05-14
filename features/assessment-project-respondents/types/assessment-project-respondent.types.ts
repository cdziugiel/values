import type { AssessmentProjectRespondentStatus } from "../forms/assessment-project-respondent.schema";

export type AssessmentProjectRespondentListItem = {
  id: string;
  assessmentProjectId: string;
  respondentId: string;
  status: AssessmentProjectRespondentStatus;
  invitedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  externalCode: string | null;
  clientOrganizationName: string | null;
  clientUnitName: string | null;
  activeAccessLinkId: string | null;
  accessLinkExpiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AssessmentProjectRespondentOption = {
  id: string;
  label: string;
  email: string | null;
};