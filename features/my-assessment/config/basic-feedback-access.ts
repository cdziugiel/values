/**
 * Określa, czy dostęp do bezpłatnej informacji zwrotnej
 * wymaga ukończenia profilu normalizacyjnego.
 *
 * true:
 * - bez danych normalizacyjnych użytkownik widzi wyłącznie
 *   ofertę pełnego raportu;
 * - po uzupełnieniu danych otrzymuje także darmowy wynik.
 *
 * false:
 * - darmowa informacja zwrotna jest dostępna niezależnie
 *   od przekazania danych normalizacyjnych.
 */
export const REQUIRE_NORMATIVE_PROFILE_FOR_BASIC_FEEDBACK =
  true;

export function canViewBasicFeedback({
  normativeProfileCompleted,
  fullReportUnlocked,
}: {
  normativeProfileCompleted: boolean;
  fullReportUnlocked: boolean;
}) {
  if (fullReportUnlocked) {
    return true;
  }

  if (
    !REQUIRE_NORMATIVE_PROFILE_FOR_BASIC_FEEDBACK
  ) {
    return true;
  }

  return normativeProfileCompleted;
}