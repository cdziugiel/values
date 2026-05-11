export type MyAssessmentQuestionnaireStatus =
  | "available"
  | "in_progress"
  | "completed"
  | "locked"
  | "coming_soon"
  | "disabled";

export type MyAssessmentQuestionnaire = {
  code: string;
  name: string;
  description: string;
  status: MyAssessmentQuestionnaireStatus;
  estimatedMinutes?: number;
};

export type MyAssessment = {
  id: string;
  code: string;
  name: string;
  description: string;
  questionnaires: MyAssessmentQuestionnaire[];
};