export function assertComparisonQuestionnaireMatchesProduct({
  actualQuestionnaireId,
  expectedQuestionnaireId,
  subjectLabel,
}: {
  actualQuestionnaireId: string | null | undefined;
  expectedQuestionnaireId: string;
  subjectLabel: string;
}) {
  if (!actualQuestionnaireId) {
    throw new Error(
      `${subjectLabel} nie zawiera informacji o rodzaju kwestionariusza.`,
    );
  }

  if (actualQuestionnaireId !== expectedQuestionnaireId) {
    throw new Error(
      `${subjectLabel} dotyczy innego kwestionariusza niż wybrany produkt raportowy.`,
    );
  }
}
