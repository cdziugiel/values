type AssessmentPackageCompletionInput = {
  activeProjectQuestionnaireIds: readonly string[];
  completedProjectQuestionnaireIds: ReadonlySet<string>;
};

/**
 * Aggregate package completion is derived exclusively from durable,
 * per-questionnaire completion evidence.
 *
 * The caller must create the current questionnaire snapshot first and then
 * pass the full set of projectQuestionnaireIds that have snapshots.
 */
export function areAllProjectQuestionnairesCompleted({
  activeProjectQuestionnaireIds,
  completedProjectQuestionnaireIds,
}: AssessmentPackageCompletionInput) {
  if (activeProjectQuestionnaireIds.length === 0) {
    return false;
  }

  return activeProjectQuestionnaireIds.every((projectQuestionnaireId) =>
    completedProjectQuestionnaireIds.has(projectQuestionnaireId),
  );
}
