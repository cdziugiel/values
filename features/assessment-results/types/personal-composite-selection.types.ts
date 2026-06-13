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

  tenantSlug?: string | null;

  assessmentSessionId: string;
  sessionId?: string | null;

  assessmentProjectId?: string | null;

  projectQuestionnaireId?: string | null;

  assessmentResultSnapshotId?: string | null;
  snapshotId?: string | null;

  questionnaireId: string;
  questionnaireVersionId?: string | null;
  questionnaireCode?: string | null;
  questionnaireName?: string | null;

  completedAt?: string | Date | null;
};

export type FrozenCompositeSelection = {
  mode: PersonalCompositeSelectionMode;
  frozenAt: string;
  tenantSlug?: string;
  reportTemplateVersionId: string;
  respondentId: string;
  assessmentProjectId?: string | null;
  selectedSources: FrozenCompositeSelectedSource[];
};