export type MyAssessmentQuestionnaireStatus =
  | "available"
  | "in_progress"
  | "completed"
  | "locked"
  | "coming_soon"
  | "disabled";

export type MyAssessmentQuestionnaireSource = "public" | "invited";

export type MyAssessmentQuestionnaireAccessType =
  | "invitation"
  | "organization"
  | "public";



export type MyAssessmentQuestionnaire = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: MyAssessmentQuestionnaireStatus;
  estimatedMinutes?: number | null;

  source: MyAssessmentQuestionnaireSource;
  actionHref: string | null;

  accessType?: "invitation" | "organization" | "public";
  accessLabel?: string;

  questionnaireId: string | null;
  questionnaireVersionId: string | null;
  questionnaireVersionName: string | null;
  projectQuestionnaireId?: string | null;
  tenantSlug?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  sessionId?: string | null;
  sessionStatus?: string | null;
  secondaryActionHref?: string | null;
  secondaryActionLabel?: string | null;
  completedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export type MyAssessment = {
  id: string;
  code: string;
  name: string;
  description: string;
  publicQuestionnaires: MyAssessmentQuestionnaire[];
  invitedQuestionnaires: MyAssessmentQuestionnaire[];
};