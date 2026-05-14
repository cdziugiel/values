export type MyAssessmentQuestionnaireStatus =
  | "available"
  | "in_progress"
  | "completed"
  | "locked"
  | "coming_soon"
  | "disabled";

export type MyAssessmentQuestionnaireSource = "public" | "invited";

export type MyAssessmentQuestionnaire = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: MyAssessmentQuestionnaireStatus;
  estimatedMinutes?: number | null;

  source: MyAssessmentQuestionnaireSource;
  actionHref: string | null;

  questionnaireId: string | null;
  questionnaireVersionId: string | null;
  questionnaireVersionName: string | null;

  tenantSlug?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  sessionId?: string | null;
  sessionStatus?: string | null;
};

export type MyAssessment = {
  id: string;
  code: string;
  name: string;
  description: string;
  publicQuestionnaires: MyAssessmentQuestionnaire[];
  invitedQuestionnaires: MyAssessmentQuestionnaire[];
};