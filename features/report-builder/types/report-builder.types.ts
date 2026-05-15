// features/report-builder/types/report-builder.types.ts

export type ReportPrimitive = string | number | boolean | null;

export type ReportDimension = {
  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  dimensionDescription?: string | null;

  dimensionCategory: string;
  dimensionCategoryLabel: string;
  dimensionCategoryOrderIndex: number;
  dimensionOrderIndex: number;
};

export type ReportResponseDimension = ReportDimension & {
  weight: number;
  reverseScored: boolean;
};

export type ReportScore = {
  id?: string | null;

  questionnaireId?: string | null;
  questionnaireVersionId?: string | null;

  dimensionId: string;
  dimensionCode: string;
  dimensionName: string;

  dimensionCategory: string;
  dimensionCategoryLabel: string;
  dimensionCategoryOrderIndex: number;
  dimensionOrderIndex: number;

  rawScore?: number | null;
  weightedScore?: number | null;
  meanScore?: number | null;
  weightedMeanScore?: number | null;
  normalizedScore?: number | null;

  answeredItemsCount?: number | null;
  expectedItemsCount?: number | null;
  completeness?: number | null;
};

export type ReportResponse = {
  itemId: string;
  itemCode?: string | null;
  itemType: string;
  itemText: string;
  itemHelpText?: string | null;
  itemRequired?: boolean | null;
  itemOrderIndex?: number | null;

  questionnaireId?: string | null;
  questionnaireVersionId?: string | null;
  questionnaireName?: string | null;
  questionnaireVersionName?: string | null;

  pageId?: string | null;
  pageCode?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageOrderIndex?: number | null;

  scaleMin?: number | null;
  scaleMax?: number | null;
  scaleMinLabel?: string | null;
  scaleMaxLabel?: string | null;

  responseExists: boolean;
  responseValueType?: string | null;
  responseRawValue?: unknown;
  responseNumericValue?: number | null;
  responseDisplayValue?: string | number | boolean | null;

  dimensions: ReportResponseDimension[];
};

export type ReportQuestionnaire = {
  questionnaireId: string;
  questionnaireCode?: string | null;
  questionnaireName?: string | null;
  questionnaireDescription?: string | null;
  questionnaireVersionId: string;
  questionnaireVersionName?: string | null;
  questionnaireVersion?: string | null;
};

export type ReportDimensionCategory = {
  key: string;
  label: string;
  orderIndex: number;
};

export type ReportSnapshotPayload = {
  version?: number;
  tenantSlug?: string | null;
  frozenAt?: string | Date | null;

  session?: {
    id?: string | null;
    status?: string | null;
    completedAt?: string | Date | null;
    createdAt?: string | Date | null;
    updatedAt?: string | Date | null;
  } | null;

  project?: {
    id?: string | null;
    name?: string | null;
    description?: string | null;
  } | null;

  questionnaires?: ReportQuestionnaire[] | null;
  dimensionCategories?: ReportDimensionCategory[] | null;
  dimensions?: ReportDimension[] | null;
  scores?: ReportScore[] | null;
  responses?: ReportResponse[] | null;

  analytics?: unknown;
};

export type ReportDimensionSelector = {
  category: string;
  code: string;
};

export type ReportIntersectionScore = {
  filter: ReportDimensionSelector;
  target: ReportDimensionSelector;

  rawSum: number;
  weightedSum: number;
  weightSum: number;

  meanScore: number | null;
  weightedMeanScore: number | null;

  answeredItemsCount: number;
  expectedItemsCount: number;
  completeness: number;

  responses: ReportResponse[];
};

export type ReportScoreSortMode =
  | "order"
  | "mean_desc"
  | "mean_asc"
  | "weighted_mean_desc"
  | "weighted_mean_asc"
  | "code"
  | "name";

export type ReportDataApi = {
  payload: ReportSnapshotPayload;

  scores: ReportScore[];
  responses: ReportResponse[];
  dimensions: ReportDimension[];
  dimensionCategories: ReportDimensionCategory[];

  score: (
    category: string,
    code: string,
    options?: {
      prefer?: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";
    },
  ) => number | null;

  scoreRow: (category: string, code: string) => ReportScore | null;

  scoresByCategory: (
    category: string,
    options?: {
      sort?: ReportScoreSortMode;
    },
  ) => ReportScore[];

  dimension: (category: string, code: string) => ReportDimension | null;

  dimensionsByCategory: (category: string) => ReportDimension[];

  responsesByDimension: (
    category: string,
    code: string,
    options?: {
      onlyAnswered?: boolean;
    },
  ) => ReportResponse[];

  responsesByIntersection: (
    filterCategory: string,
    filterCode: string,
    targetCategory: string,
    targetCode?: string,
    options?: {
      onlyAnswered?: boolean;
    },
  ) => ReportResponse[];

  scoreByIntersection: (
    filterCategory: string,
    filterCode: string,
    targetCategory: string,
    targetCode: string,
  ) => ReportIntersectionScore;

  scoresByIntersection: (
    filterCategory: string,
    filterCode: string,
    targetCategory: string,
  ) => ReportIntersectionScore[];

  topScores: (
    category: string,
    limit?: number,
    options?: {
      metric?: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";
    },
  ) => ReportScore[];

  lowScores: (
    category: string,
    limit?: number,
    options?: {
      metric?: "weightedMeanScore" | "meanScore" | "normalizedScore" | "rawScore";
    },
  ) => ReportScore[];
};