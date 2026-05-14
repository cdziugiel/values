export type PublicAssessmentOption = {
  value: string | number | boolean;
  label: string;
};

export type PublicAssessmentItem = {
  id: string;
  code: string;
  type:
    | "likert"
    | "true_false"
    | "single_choice"
    | "multiple_choice"
    | "text"
    | "number";
  text: string;
  helpText: string | null;
  required: boolean;
  orderIndex: number;

  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;

  options: PublicAssessmentOption[];
  responseConfig: Record<string, unknown>;
};

export type PublicAssessmentPage = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  orderIndex: number;
  items: PublicAssessmentItem[];
};

export type PublicAssessmentFormData = {
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  versionId: string;
  version: string;
  versionName: string;
  pages: PublicAssessmentPage[];
};