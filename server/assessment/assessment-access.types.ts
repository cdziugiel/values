export type ResolvedAssessmentAccess = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };

  accessLink: {
    id: string;
    status: string;
    expiresAt: Date;
    lastAccessedAt: Date | null;
    usedAt: Date | null;
  };

  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    startsAt: Date | null;
    endsAt: Date | null;
  };

  projectRespondent: {
    id: string;
    status: string;
    invitedAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
  };

  respondent: {
    id: string;
    externalCode: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};