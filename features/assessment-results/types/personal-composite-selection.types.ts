export const PERSONAL_COMPOSITE_SELECTION_MODES = [
  "latest_completed",
  "same_project",
  "manual",
] as const;

export type PersonalCompositeSelectionMode =
  (typeof PERSONAL_COMPOSITE_SELECTION_MODES)[number];

export type PersonalCompositeManualSelection = {
  bySlot?: Record<string, string>;
  byQuestionnaireId?: Record<string, string>;
};

export type PersonalCompositeSourceSelection = {
  mode: PersonalCompositeSelectionMode;
  manual?: PersonalCompositeManualSelection;
  assessmentProjectId?: string | null;
};

export type FrozenCompositeSelectedSource = {
  slot: string;
  label: string;
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  required: boolean;

  assessmentProjectId: string | null;
  assessmentProjectName: string | null;

  assessmentSessionId: string;
  assessmentResultSnapshotId: string;

  questionnaireVersionId: string | null;
  completedAt: string | Date | null;
  frozenAt: string | Date | null;
};

export type FrozenCompositeSelection = {
  mode: PersonalCompositeSelectionMode;
  frozenAt: string;
  reportTemplateVersionId: string;
  respondentId: string;
  assessmentProjectId?: string | null;
  selectedSources: FrozenCompositeSelectedSource[];
};