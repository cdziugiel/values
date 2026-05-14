import type { AssessmentProjectStatus } from "../forms/assessment-project.schema";

export type AssessmentProjectListItem = {
  id: string;
  clientOrganizationId: string | null;
  clientOrganizationName: string | null;
  name: string;
  description: string | null;
  status: AssessmentProjectStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AssessmentProjectOrganizationOption = {
  id: string;
  name: string;
};