// features/comparison-reports/types/comparison-report.types.ts

export type ComparisonObjectType =
  | "respondent"
  | "team"
  | "organization"
  | "shared_token";

export type ComparisonMode = "tenant" | "peer";

export type ComparisonDimensionScore = {
  dimensionId: string;
  code: string;
  name: string;
  category: string | null;
  score: number | null;
  respondentCount?: number;
};

export type ComparisonObjectResult = {
  type: ComparisonObjectType;
  id: string;
  label: string;
  n: number;

  respondentId?: string | null;
  assessmentSessionId?: string | null;
  assessmentProjectId?: string | null;

  questionnaireId?: string | null;
  questionnaireVersionId?: string | null;

  visibility: {
    canShow: boolean;
    reason?: "too_small_group" | "no_completed_sessions" | "no_permission";
  };

  scores: ComparisonDimensionScore[];
};

export type ComparisonDeltaRow = {
  dimensionId: string;
  code: string;
  name: string;
  category: string | null;
  leftScore: number | null;
  rightScore: number | null;
  delta: number | null;
  absDelta: number | null;
  meaning: "same" | "small" | "medium" | "large" | "missing";
};

export type ComparisonScoreScale = {
  min: number;
  max: number;
  label?: string;
};

export type ComparisonBlockedReason =
  | "different_questionnaire"
  | "different_questionnaire_version"
  | "no_common_dimensions"
  | "no_permission";

export type ComparisonReportData = {
  mode: ComparisonMode;
  left: ComparisonObjectResult;
  right: ComparisonObjectResult;
  rows: ComparisonDeltaRow[];
  metadata: {
    generatedAt: string;
    minGroupSize: number;
    warnings: string[];
    scoreScale?: ComparisonScoreScale;
    comparisonBlockedReason?: ComparisonBlockedReason;
  };
};