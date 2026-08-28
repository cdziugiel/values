type AssessmentPackageCompletionInput = {
  activeProjectQuestionnaireIds: readonly string[];
  completedProjectQuestionnaireIds: ReadonlySet<string>;
  currentProjectQuestionnaireId: string;
};

export function areAllProjectQuestionnairesCompleted({
  activeProjectQuestionnaireIds,
  completedProjectQuestionnaireIds,
  currentProjectQuestionnaireId,
}: AssessmentPackageCompletionInput) {
  if (activeProjectQuestionnaireIds.length === 0) {
    return false;
  }

  return activeProjectQuestionnaireIds.every(
    (projectQuestionnaireId) =>
      projectQuestionnaireId === currentProjectQuestionnaireId ||
      completedProjectQuestionnaireIds.has(projectQuestionnaireId),
  );
}
