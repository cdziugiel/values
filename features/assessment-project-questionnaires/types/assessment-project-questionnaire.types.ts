export type AssessmentProjectQuestionnaireListItem = {
  id: string;
  assessmentProjectId: string;
  questionnaireId: string;
  questionnaireVersionId: string;
  orderIndex: number;
  status: string;
  createdAt: Date;
};