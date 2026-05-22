// features/questionnaire-admin/types/questionnaire-admin.types.ts
export type QuestionnaireAdminListItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  versionCount: number;
};

export type QuestionnaireVersionListItem = {
  id: string;
  questionnaireId: string;
  version: string;
  name: string;
  description: string | null;
  status: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type QuestionnairePageEditorItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  orderIndex: number;
  dimensionScores: QuestionnairePageDimensionScoreEditorItem[];
};

export type QuestionnaireDimensionEditorItem = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  orderIndex: number;
};

export type QuestionnaireItemDimensionScoreEditorItem = {
  id: string;
  questionnaireItemId: string;
  questionnaireDimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  weight: string;
  reverseScored: boolean;
};

export type QuestionnaireItemEditorItem = {
  id: string;
  questionnaireVersionId: string;
  questionnairePageId: string | null;
  pageTitle: string | null;
  code: string;
  orderIndex: number;
  type: string;
  text: string;
  helpText: string | null;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  dimensionScores: QuestionnaireItemDimensionScoreEditorItem[];
  options: unknown;
  responseConfig: unknown;
};

export type QuestionnaireVersionEditorData = {
  version: QuestionnaireVersionListItem;
  pages: QuestionnairePageEditorItem[];
  dimensions: QuestionnaireDimensionEditorItem[];
  items: QuestionnaireItemEditorItem[];
};

export type QuestionnairePageDimensionScoreEditorItem = {
  id: string;
  questionnairePageId: string;
  questionnaireDimensionId: string;
  dimensionCode: string;
  dimensionName: string;
  weight: string;
  reverseScored: boolean;
};


export type QuestionnaireItemType =
  | "likert"
  | "true_false"
  | "single_choice"
  | "multiple_choice"
  | "current_desired"
  | "text"
  | "number";

export type ImportedQuestionnaireDimension = {
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  orderIndex: number;
};

export type ImportedQuestionnairePage = {
  code: string;
  title: string;
  description: string | null;
  orderIndex: number;
};

export type ImportedQuestionnaireItem = {
  code: string;
  pageCode: string | null;
  orderIndex: number;
  type: QuestionnaireItemType;
  text: string;
  helpText: string | null;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  options: unknown;
  responseConfig: unknown;
};

export type ImportedQuestionnaireItemDimension = {
  itemCode: string;
  dimensionCode: string;
  weight: string;
  reverseScored: boolean;
};

export type ImportedQuestionnairePageDimension = {
  pageCode: string;
  dimensionCode: string;
  weight: string;
  reverseScored: boolean;
};

export type ReplaceQuestionnaireVersionStructureFromImportInput = {
  versionId: string;
  dimensions: ImportedQuestionnaireDimension[];
  pages: ImportedQuestionnairePage[];
  items: ImportedQuestionnaireItem[];
  itemDimensions: ImportedQuestionnaireItemDimension[];
  pageDimensions: ImportedQuestionnairePageDimension[];
};

export type ReplaceQuestionnaireVersionStructureFromImportResult = {
  dimensionsCount: number;
  pagesCount: number;
  itemsCount: number;
  itemDimensionsCount: number;
  pageDimensionsCount: number;
};