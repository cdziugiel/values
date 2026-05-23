export type AssessmentResultMetricKey =
  | "averageRawScore"
  | "averageWeightedScore"
  | "averageMeanScore"
  | "averageWeightedMeanScore"
  | "averageCompleteness";

export type AssessmentResultMetricConfig = {
  key: AssessmentResultMetricKey;
  label: string;
  description: string;
  format: "number" | "percent";
};

export type DimensionCategoryAssignment = {
  categoryCode: string;
  categoryName: string;
  valueCode: string;
  valueName: string;
};

export type DimensionAggregateForExplorer = {
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;

  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;

  sessionsCount: number;
  averageRawScore: number | null;
  averageWeightedScore: number | null;
  averageMeanScore: number | null;
  averageWeightedMeanScore: number | null;
  averageCompleteness: number | null;

  categories?: DimensionCategoryAssignment[];
};

export type DimensionScoreForExplorer = {
  questionnaireVersionId: string;
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  rawScore: number;
  weightedScore: number;
  meanScore: number;
  weightedMeanScore: number;
  completeness: number;
};

export type RespondentResultForExplorer = {
  sessionId: string;
  scores: DimensionScoreForExplorer[];
};

export type CrossCategoryResultForExplorer = {
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;

  xCategoryCode: string;
  xCategoryName: string;
  xDimensionId: string;
  xDimensionCode: string;
  xDimensionName: string;

  yCategoryCode: string;
  yCategoryName: string;
  yDimensionId: string;
  yDimensionCode: string;
  yDimensionName: string;

  itemsCount: number;
  sessionsCount: number;
  answeredCount: number;
  expectedCount: number;

  averageRawScore: number | null;
  averageWeightedScore: number | null;
  averageMeanScore: number | null;
  averageWeightedMeanScore: number | null;
  averageCompleteness: number | null;
};