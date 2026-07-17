import { z } from "zod";

/**
 * Wartość wyniku może być pusta podczas edycji formularza.
 * Puste wartości nie powinny trafiać do wygenerowanych metryk.
 */
export const syntheticPreviewScoreValueSchema = z
  .number({
    message: "Wynik musi być liczbą.",
  })
  .finite("Wynik musi być skończoną liczbą.")
  .nullable();

/**
 * Wynik podstawowy dla wymiaru należącego do wybranej
 * kategorii scoreCategory.
 *
 * Przykład:
 *
 * {
 *   dimensionCode: "TRADITION",
 *   value: 2.5
 * }
 */
export const syntheticPreviewScoreSchema = z.object({
  dimensionCode: z
    .string()
    .trim()
    .min(1, "Brakuje kodu wymiaru.")
    .max(200, "Kod wymiaru jest zbyt długi."),

  value: syntheticPreviewScoreValueSchema,
});

/**
 * values:
 *
 * {
 *   BELIEFS: {
 *     TRADITION: 3,
 *     EXPANSION: 1.5
 *   }
 * }
 *
 * Dla macierzy:
 *
 * primaryCategory = "AREA"
 * filterCategory = "vMEME"
 */
const syntheticCrossScoreValuesSchema = z.record(
  z.string().trim().min(1),
  z.record(
    z.string().trim().min(1),
    syntheticPreviewScoreValueSchema,
  ),
);

export const syntheticCrossScoreMatrixSchema = z
  .object({
    primaryCategory: z
      .string()
      .trim()
      .min(
        1,
        "Brakuje kategorii głównej crossScores.",
      )
      .max(
        200,
        "Kod kategorii głównej jest zbyt długi.",
      ),

    filterCategory: z
      .string()
      .trim()
      .min(
        1,
        "Brakuje kategorii przekroju crossScores.",
      )
      .max(
        200,
        "Kod kategorii przekroju jest zbyt długi.",
      ),

    values: syntheticCrossScoreValuesSchema,
  })
  .superRefine((matrix, context) => {
    if (
      matrix.primaryCategory ===
      matrix.filterCategory
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filterCategory"],
        message:
          "Kategoria główna i kategoria przekroju muszą być różne.",
      });
    }

    let valuesCount = 0;

    for (const filterValues of Object.values(
      matrix.values,
    )) {
      valuesCount += Object.keys(
        filterValues,
      ).length;
    }

    if (valuesCount > 10_000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["values"],
        message:
          "Macierz crossScores zawiera zbyt wiele wartości.",
      });
    }
  });

export const createSyntheticReportPreviewSchema =
  z
    .object({
      reportTemplateVersionId: z
        .string()
        .uuid(
          "Nieprawidłowy identyfikator wersji raportu.",
        ),

      questionnaireVersionId: z
        .string()
        .uuid(
          "Nieprawidłowy identyfikator wersji kwestionariusza.",
        ),

      scoreCategory: z
        .string()
        .trim()
        .min(
          1,
          "Wybierz kategorię wyników podstawowych.",
        )
        .max(
          200,
          "Kod kategorii wyników jest zbyt długi.",
        ),

      scores: z
        .array(syntheticPreviewScoreSchema)
        .max(
          2_000,
          "Przekazano zbyt wiele wyników podstawowych.",
        ),

      crossMatrices: z
        .array(
          syntheticCrossScoreMatrixSchema,
        )
        .max(
          100,
          "Przekazano zbyt wiele macierzy crossScores.",
        ),
    })
    .superRefine((input, context) => {
      const scoreCodes = new Set<string>();

      input.scores.forEach(
        (score, index) => {
          const normalizedCode =
            score.dimensionCode
              .trim()
              .toUpperCase();

          if (
            scoreCodes.has(normalizedCode)
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [
                "scores",
                index,
                "dimensionCode",
              ],
              message:
                `Wymiar ${normalizedCode} występuje więcej niż raz.`,
            });

            return;
          }

          scoreCodes.add(normalizedCode);
        },
      );

      const matrixPairs = new Set<string>();

      input.crossMatrices.forEach(
        (matrix, index) => {
          const pairKey = [
            matrix.primaryCategory,
            matrix.filterCategory,
          ].join("::");

          if (matrixPairs.has(pairKey)) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: [
                "crossMatrices",
                index,
              ],
              message:
                "Ta sama para kategorii crossScores występuje więcej niż raz.",
            });

            return;
          }

          matrixPairs.add(pairKey);
        },
      );
    });

export type SyntheticPreviewScore = z.infer<
  typeof syntheticPreviewScoreSchema
>;

export type SyntheticCrossScoreMatrix = z.infer<
  typeof syntheticCrossScoreMatrixSchema
>;

export type CreateSyntheticReportPreviewInput =
  z.infer<
    typeof createSyntheticReportPreviewSchema
  >;