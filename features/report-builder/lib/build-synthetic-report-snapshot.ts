import type {
  CreateSyntheticReportPreviewInput,
  SyntheticCrossScoreMatrix,
} from "../forms/report-preview-snapshot.schema";

import type {
  ReportPreviewDefinition,
  ReportPreviewDimensionOption,
} from "../api/report-preview-data.queries";

function buildMetric(value: number) {
  return {
    rawScore: value,
    weightedScore: value,
    meanScore: value,
    weightedMeanScore: value,
    normalizedScore: value,
    completeness: 1,
  };
}

function buildCrossScores(
  matrices: SyntheticCrossScoreMatrix[],
) {
  type Metric = ReturnType<typeof buildMetric>;

  type CrossScores = Record<
    string,
    Record<
      string,
      {
        by: Record<
          string,
          Record<string, Metric>
        >;
      }
    >
  >;

  const crossScores: CrossScores = {};

  /**
   * Ścieżki wprowadzone bezpośrednio przez użytkownika.
   * Są ważniejsze niż wartości utworzone automatycznie
   * przez odwrócenie osi.
   */
  const explicitPaths = new Set<string>();

  function normalizeCode(value: string) {
    return value.trim().toUpperCase();
  }

  function getPathKey(input: {
    primaryCategory: string;
    primaryCode: string;
    filterCategory: string;
    filterCode: string;
  }) {
    return [
      input.primaryCategory,
      input.primaryCode,
      input.filterCategory,
      input.filterCode,
    ].join("::");
  }

  function setCrossScore(input: {
    primaryCategory: string;
    primaryCode: string;
    filterCategory: string;
    filterCode: string;
    value: number;
    explicit: boolean;
  }) {
    const primaryCode = normalizeCode(
      input.primaryCode,
    );

    const filterCode = normalizeCode(
      input.filterCode,
    );

    const pathKey = getPathKey({
      primaryCategory: input.primaryCategory,
      primaryCode,
      filterCategory: input.filterCategory,
      filterCode,
    });

    /**
     * Automatyczne odbicie nie może nadpisać wartości,
     * którą użytkownik wpisał bezpośrednio w innej macierzy.
     */
    if (
      !input.explicit &&
      explicitPaths.has(pathKey)
    ) {
      return;
    }

    crossScores[input.primaryCategory] ??= {};

    crossScores[input.primaryCategory][primaryCode] ??= {
      by: {},
    };

    crossScores[input.primaryCategory][primaryCode].by[
      input.filterCategory
    ] ??= {};

    crossScores[input.primaryCategory][primaryCode].by[
      input.filterCategory
    ][filterCode] = buildMetric(input.value);

    if (input.explicit) {
      explicitPaths.add(pathKey);
    }
  }

  /**
   * Pierwszy przebieg:
   * zapisujemy wszystkie wartości dokładnie tak,
   * jak zostały zdefiniowane w formularzu.
   */
  for (const matrix of matrices) {
    for (const [
      primaryCode,
      filterValues,
    ] of Object.entries(matrix.values)) {
      for (const [
        filterCode,
        value,
      ] of Object.entries(filterValues)) {
        if (value === null) {
          continue;
        }

        setCrossScore({
          primaryCategory:
            matrix.primaryCategory,
          primaryCode,
          filterCategory:
            matrix.filterCategory,
          filterCode,
          value,
          explicit: true,
        });
      }
    }
  }

  /**
   * Drugi przebieg:
   * tworzymy lustrzaną ścieżkę dla każdej wartości.
   *
   * AREA.BELIEFS.by.vMEME.TRADITION
   *
   * oraz:
   *
   * vMEME.TRADITION.by.AREA.BELIEFS
   */
  for (const matrix of matrices) {
    for (const [
      primaryCode,
      filterValues,
    ] of Object.entries(matrix.values)) {
      for (const [
        filterCode,
        value,
      ] of Object.entries(filterValues)) {
        if (value === null) {
          continue;
        }

        setCrossScore({
          primaryCategory:
            matrix.filterCategory,
          primaryCode: filterCode,
          filterCategory:
            matrix.primaryCategory,
          filterCode: primaryCode,
          value,
          explicit: false,
        });
      }
    }
  }

  return crossScores;
}

function flattenDimensions(
  definition: ReportPreviewDefinition,
): ReportPreviewDimensionOption[] {
  return definition.categories.flatMap(
    (category) => category.dimensions,
  );
}

export function buildSyntheticReportSnapshot(input: {
  definition: ReportPreviewDefinition;
  previewInput: CreateSyntheticReportPreviewInput;
  createdBy: string;
}) {
  const { definition, previewInput, createdBy } = input;
  const allDimensions = flattenDimensions(definition);

  const dimensionByCategoryAndCode = new Map(
    allDimensions.map((dimension) => [
      `${dimension.category}:${dimension.code}`,
      dimension,
    ]),
  );

  const scores = previewInput.scores.map((score) => {
    const code = score.dimensionCode.trim().toUpperCase();

    const dimension = dimensionByCategoryAndCode.get(
      `${previewInput.scoreCategory}:${code}`,
    );

    if (!dimension) {
      throw new Error(
        `Wymiar ${previewInput.scoreCategory}.${code} nie istnieje w wersji kwestionariusza.`,
      );
    }

    return {
      id: `preview:${dimension.id}`,
      questionnaireId: definition.questionnaireId,
      questionnaireVersionId:
        definition.questionnaireVersionId,

      dimensionId: dimension.id,
      dimensionCode: dimension.code,
      dimensionName: dimension.name,

      dimensionCategory: dimension.category,
      dimensionCategoryLabel: dimension.categoryLabel,
      dimensionCategoryOrderIndex: 0,
      dimensionOrderIndex: dimension.orderIndex,

      rawScore: score.value,
      weightedScore: score.value,
      meanScore: score.value,
      weightedMeanScore: score.value,
      normalizedScore: score.value,
      answeredItemsCount: 1,
      expectedItemsCount: 1,
      completeness: 1,
    };
  });

  const now = new Date().toISOString();

  return {
    version: 2,
    reportKind: "synthetic_builder_preview",
    tenantSlug: null,
    frozenAt: now,

    preview: {
      synthetic: true,
      source: "report-builder",
      createdAt: now,
      createdBy,
    },

    session: {
      id: "synthetic-preview",
      status: "completed",
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    },

    project: {
      id: "synthetic-preview",
      name: "Konfiguracja testowa buildera",
      description:
        "Tymczasowy podgląd raportu na ręcznie podanych wynikach.",
    },

    respondent: {
      id: "synthetic-preview",
      displayName: "Dane testowe",
      email: null,
      externalCode: null,
    },

    questionnaires: [
      {
        questionnaireId: definition.questionnaireId,
        questionnaireName: definition.questionnaireName,
        questionnaireVersionId:
          definition.questionnaireVersionId,
        questionnaireVersionName:
          definition.questionnaireVersionName,
        questionnaireVersion:
          definition.questionnaireVersion,
      },
    ],

    dimensionCategories: definition.categories.map(
      (category, orderIndex) => ({
        key: category.key,
        label: category.label,
        orderIndex,
      }),
    ),

    dimensions: allDimensions.map((dimension) => ({
      dimensionId: dimension.id,
      dimensionCode: dimension.code,
      dimensionName: dimension.name,
      dimensionDescription: dimension.description,
      dimensionCategory: dimension.category,
      dimensionCategoryLabel: dimension.categoryLabel,
      dimensionCategoryOrderIndex: 0,
      dimensionOrderIndex: dimension.orderIndex,
    })),

    scores,
    responses: [],

    analytics: {
      dimensionCodesByCategory: Object.fromEntries(
        definition.categories.map((category) => [
          category.key,
          category.dimensions.map(
            (dimension) => dimension.code,
          ),
        ]),
      ),
      responsesByDimensionCategory: {},
    },

    crossScores: buildCrossScores(
      previewInput.crossMatrices,
    ),
  };
}
