"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Pencil,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  updateSyntheticReportPreviewAction,
} from "../api/update-report-preview-snapshot.actions";

import {
  ReportDocumentPreviewFrame,
} from "./report-document-preview-frame";

type SyntheticReportLivePreviewProps = {
  reportTemplateVersionId: string;
  previewSnapshotId: string;
  initialPayload: any;
  initialHtml: string;
};

type EditableScore = {
  dimensionCategory: string;
  dimensionCategoryLabel: string;
  dimensionCode: string;
  dimensionName: string;
  value: string;
};

type EditableCrossScore = {
  id: string;

  primaryCategory: string;
  primaryCode: string;

  filterCategory: string;
  filterCode: string;

  value: string;
};

type SaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error";

function isRecord(
  value: unknown,
): value is Record<string, any> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function numericValue(
  value: unknown,
): number | null {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return null;
}

function metricValue(
  metric: unknown,
): number | null {
  if (!isRecord(metric)) {
    return null;
  }

  return (
    numericValue(metric.weightedMeanScore) ??
    numericValue(metric.meanScore) ??
    numericValue(metric.normalizedScore) ??
    numericValue(metric.weightedScore) ??
    numericValue(metric.rawScore)
  );
}

function formatInputValue(
  value: number | null,
) {
  return value === null ? "" : String(value);
}

function parseInputNumber(
  value: string,
): number | null {
  const normalized = value
    .trim()
    .replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function buildEditableScores(
  payload: any,
): EditableScore[] {
  const dimensions = Array.isArray(
    payload?.dimensions,
  )
    ? payload.dimensions.filter(isRecord)
    : [];

  const scores = Array.isArray(payload?.scores)
    ? payload.scores.filter(isRecord)
    : [];

  const scoreByPath = new Map(
    scores.map((score: any) => [
      [
        String(
          score.dimensionCategory ??
            "__NO_CATEGORY__",
        ),
        String(
          score.dimensionCode ?? "UNKNOWN",
        ).toUpperCase(),
      ].join("::"),
      score,
    ]),
  );

  return dimensions
    .map((dimension: any) => {
      const dimensionCategory =
        typeof dimension.dimensionCategory ===
        "string"
          ? dimension.dimensionCategory
          : "__NO_CATEGORY__";

      const dimensionCode =
        typeof dimension.dimensionCode ===
        "string"
          ? dimension.dimensionCode
              .trim()
              .toUpperCase()
          : "UNKNOWN";

      const score = scoreByPath.get(
        [
          dimensionCategory,
          dimensionCode,
        ].join("::"),
      );

      return {
        dimensionCategory,

        dimensionCategoryLabel:
          typeof dimension.dimensionCategoryLabel ===
          "string"
            ? dimension.dimensionCategoryLabel
            : dimensionCategory,

        dimensionCode,

        dimensionName:
          typeof dimension.dimensionName ===
          "string"
            ? dimension.dimensionName
            : dimensionCode,

        value: formatInputValue(
          score ? metricValue(score) : null,
        ),
      };
    })
    .sort((left: any, right: any) => {
      const categoryDiff =
        left.dimensionCategory.localeCompare(
          right.dimensionCategory,
          "pl",
          {
            numeric: true,
            sensitivity: "base",
          },
        );

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      return left.dimensionName.localeCompare(
        right.dimensionName,
        "pl",
        {
          numeric: true,
          sensitivity: "base",
        },
      );
    });
}

function buildEditableCrossScores(
  payload: any,
): EditableCrossScore[] {
  const dimensions = Array.isArray(
    payload?.dimensions,
  )
    ? payload.dimensions.filter(isRecord)
    : [];

  const dimensionsByCategory = new Map<
    string,
    Array<{
      code: string;
      name: string;
    }>
  >();

  for (const dimension of dimensions) {
    const category =
      typeof dimension.dimensionCategory ===
      "string"
        ? dimension.dimensionCategory
        : "__NO_CATEGORY__";

    const code =
      typeof dimension.dimensionCode ===
      "string"
        ? dimension.dimensionCode
            .trim()
            .toUpperCase()
        : "UNKNOWN";

    const name =
      typeof dimension.dimensionName ===
      "string"
        ? dimension.dimensionName
        : code;

    const existing =
      dimensionsByCategory.get(category) ?? [];

    existing.push({
      code,
      name,
    });

    dimensionsByCategory.set(
      category,
      existing,
    );
  }

  const existingCrossScores = isRecord(
    payload?.crossScores,
  )
    ? payload.crossScores
    : {};

  function getExistingValue(input: {
    primaryCategory: string;
    primaryCode: string;
    filterCategory: string;
    filterCode: string;
  }) {
    const metric =
      existingCrossScores[
        input.primaryCategory
      ]?.[
        input.primaryCode
      ]?.by?.[
        input.filterCategory
      ]?.[
        input.filterCode
      ];

    return metricValue(metric);
  }

  const result: EditableCrossScore[] = [];

  const categories = Array.from(
    dimensionsByCategory.keys(),
  );

  /**
   * Tworzymy wszystkie kierunkowe kombinacje:
   *
   * vMEME × AREA
   * AREA × vMEME
   * vMEME × VALUES
   * VALUES × vMEME
   */
  for (const primaryCategory of categories) {
    const primaryDimensions =
      dimensionsByCategory.get(
        primaryCategory,
      ) ?? [];

    for (const filterCategory of categories) {
      if (
        filterCategory === primaryCategory
      ) {
        continue;
      }

      const filterDimensions =
        dimensionsByCategory.get(
          filterCategory,
        ) ?? [];

      for (const primaryDimension of primaryDimensions) {
        for (const filterDimension of filterDimensions) {
          const value = getExistingValue({
            primaryCategory,
            primaryCode:
              primaryDimension.code,
            filterCategory,
            filterCode:
              filterDimension.code,
          });

          result.push({
            id: [
              primaryCategory,
              primaryDimension.code,
              filterCategory,
              filterDimension.code,
            ].join("::"),

            primaryCategory,
            primaryCode:
              primaryDimension.code,

            filterCategory,
            filterCode:
              filterDimension.code,

            value: formatInputValue(value),
          });
        }
      }
    }
  }

  return result;
}

export function SyntheticReportLivePreview({
  reportTemplateVersionId,
  previewSnapshotId,
  initialPayload,
  initialHtml,
}: SyntheticReportLivePreviewProps) {
  const initialScores = useMemo(
    () => buildEditableScores(initialPayload),
    [initialPayload],
  );

  const initialCrossScores = useMemo(
    () =>
      buildEditableCrossScores(
        initialPayload,
      ),
    [initialPayload],
  );

  const [html, setHtml] =
    useState(initialHtml);

  const [scores, setScores] =
    useState(initialScores);

  const [crossScores, setCrossScores] =
    useState(initialCrossScores);

  const [editorOpen, setEditorOpen] =
    useState(true);

  const [scoresOpen, setScoresOpen] =
    useState(true);

  const [
    crossScoresOpen,
    setCrossScoresOpen,
  ] = useState(true);

  const [saveStatus, setSaveStatus] =
    useState<SaveStatus>("idle");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [savedAt, setSavedAt] =
    useState<string | null>(null);

  const isInitialRender = useRef(true);
  const requestSequence = useRef(0);

const dimensionCategories = useMemo(() => {
  const categories = new Map<
    string,
    {
      key: string;
      label: string;
    }
  >();

  for (const score of scores) {
    categories.set(
      score.dimensionCategory,
      {
        key: score.dimensionCategory,
        label:
          score.dimensionCategoryLabel,
      },
    );
  }

  return Array.from(categories.values());
}, [scores]);



  const initialCategoryKeys = Array.from(
  new Set(
    initialScores.map(
      (score) =>
        score.dimensionCategory,
    ),
  ),
);

const [selectedScoreCategory, setSelectedScoreCategory] =
  useState(initialCategoryKeys[0] ?? "");

const [selectedPrimaryCategory, setSelectedPrimaryCategory] =
  useState(initialCategoryKeys[0] ?? "");

const [selectedFilterCategory, setSelectedFilterCategory] =
  useState(initialCategoryKeys[1] ?? "");


  type EditableDimension = {
  category: string;
  categoryLabel: string;
  code: string;
  name: string;
  orderIndex: number;
};

function buildEditableDimensions(
  payload: any,
): EditableDimension[] {
  const dimensions = Array.isArray(
    payload?.dimensions,
  )
    ? payload.dimensions.filter(isRecord)
    : [];

  return dimensions
    .map((dimension: any) => ({
      category:
        typeof dimension.dimensionCategory ===
        "string"
          ? dimension.dimensionCategory
          : "__NO_CATEGORY__",

      categoryLabel:
        typeof dimension.dimensionCategoryLabel ===
        "string"
          ? dimension.dimensionCategoryLabel
          : typeof dimension.dimensionCategory ===
              "string"
            ? dimension.dimensionCategory
            : "Bez kategorii",

      code:
        typeof dimension.dimensionCode ===
        "string"
          ? dimension.dimensionCode
              .trim()
              .toUpperCase()
          : "UNKNOWN",

      name:
        typeof dimension.dimensionName ===
        "string"
          ? dimension.dimensionName
          : typeof dimension.dimensionCode ===
              "string"
            ? dimension.dimensionCode
            : "Nieznany wymiar",

      orderIndex:
        typeof dimension.dimensionOrderIndex ===
        "number"
          ? dimension.dimensionOrderIndex
          : 0,
    }))
    .sort(
      (left: any, right: any) =>
        left.category.localeCompare(
          right.category,
          "pl",
        ) ||
        left.orderIndex -
          right.orderIndex,
    );
}


const dimensions = useMemo(
  () =>
    buildEditableDimensions(
      initialPayload,
    ),
  [initialPayload],
);


const selectedPrimaryDimensions =
  useMemo(
    () =>
      dimensions.filter(
        (dimension) =>
          dimension.category ===
          selectedPrimaryCategory,
      ),
    [
      dimensions,
      selectedPrimaryCategory,
    ],
  );

const selectedFilterDimensions =
  useMemo(
    () =>
      dimensions.filter(
        (dimension) =>
          dimension.category ===
          selectedFilterCategory,
      ),
    [
      dimensions,
      selectedFilterCategory,
    ],
  );

const crossScoreByPath = useMemo(() => {
  return new Map(
    crossScores.map((score, index) => [
      [
        score.primaryCategory,
        score.primaryCode,
        score.filterCategory,
        score.filterCode,
      ].join("::"),
      {
        score,
        index,
      },
    ]),
  );
}, [crossScores]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    setSaveStatus("dirty");

    const timeout = window.setTimeout(() => {
      const currentRequest =
        ++requestSequence.current;

      setSaveStatus("saving");
      setErrorMessage("");

      startTransition(async () => {
        const result =
          await updateSyntheticReportPreviewAction(
            {
              reportTemplateVersionId,
              previewSnapshotId,

              scores: scores.map((score) => ({
                dimensionCategory:
                  score.dimensionCategory,

                dimensionCode:
                  score.dimensionCode,

                value: parseInputNumber(
                  score.value,
                ),
              })),

              crossScores:
                crossScores.map((score) => ({
                  primaryCategory:
                    score.primaryCategory,

                  primaryCode:
                    score.primaryCode,

                  filterCategory:
                    score.filterCategory,

                  filterCode:
                    score.filterCode,

                  value: parseInputNumber(
                    score.value,
                  ),
                })),
            },
          );

        /**
         * Starsza odpowiedź nie może nadpisać
         * nowszego renderu.
         */
        if (
          currentRequest !==
          requestSequence.current
        ) {
          return;
        }

        if (!result.success) {
          setSaveStatus("error");
          setErrorMessage(result.message);
          return;
        }

        setHtml(result.html);
        setSavedAt(result.savedAt);
        setSaveStatus("saved");
      });
    }, 450);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    scores,
    crossScores,
    reportTemplateVersionId,
    previewSnapshotId,
  ]);

  const scoresByCategory = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        scores: Array<
          EditableScore & {
            index: number;
          }
        >;
      }
    >();

    scores.forEach((score, index) => {
      const current =
        groups.get(
          score.dimensionCategory,
        ) ?? {
          label:
            score.dimensionCategoryLabel,
          scores: [],
        };

      current.scores.push({
        ...score,
        index,
      });

      groups.set(
        score.dimensionCategory,
        current,
      );
    });

    return Array.from(groups.entries());
  }, [scores]);

  function resetValues() {
    setScores(initialScores);
    setCrossScores(initialCrossScores);
  }

  const statusElement = (() => {
    if (saveStatus === "saving") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-[#6b7280]">
          <Loader2
            size={13}
            className="animate-spin"
          />
          Zapisywanie i renderowanie…
        </span>
      );
    }

    if (saveStatus === "saved") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-[#0f766e]">
          <Check size={13} />
          Zapisano
          {savedAt
            ? ` · ${new Intl.DateTimeFormat(
                "pl-PL",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                },
              ).format(new Date(savedAt))}`
            : ""}
        </span>
      );
    }

    if (saveStatus === "error") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-700">
          <TriangleAlert size={13} />
          Błąd zapisu
        </span>
      );
    }

    if (saveStatus === "dirty") {
      return (
        <span className="text-xs text-amber-700">
          Oczekiwanie na zapis…
        </span>
      );
    }

    return null;
  })();

  const editor = (
    <aside className="flex min-h-full w-full flex-col bg-white">
      <div className="shrink-0 border-b border-black/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
              <Pencil size={15} />
              Edycja danych
            </div>

            <p className="mt-1 text-xs leading-5 text-[#6b7280]">
              Zmiany są automatycznie zapisywane
              w tym samym snapshocie.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={resetValues}
            className="h-8 rounded-full px-3 text-xs"
          >
            <RotateCcw size={13} />
            Reset
          </Button>
        </div>

        <div className="mt-3 min-h-5">
          {statusElement}
        </div>

        {errorMessage ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
<section className="border-b border-black/10">
  <button
    type="button"
    onClick={() =>
      setScoresOpen(
        (current) => !current,
      )
    }
    className="flex w-full items-center justify-between px-4 py-3 text-left"
  >
    <span className="text-sm font-semibold text-[#171717]">
      Wyniki podstawowe
    </span>

    {scoresOpen ? (
      <ChevronDown size={16} />
    ) : (
      <ChevronRight size={16} />
    )}
  </button>

  {scoresOpen ? (
    <div className="space-y-4 px-4 pb-4">
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b9099]">
          Kategoria wymiarów
        </span>

        <select
          value={selectedScoreCategory}
          onChange={(event) =>
            setSelectedScoreCategory(
              event.currentTarget.value,
            )
          }
          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
        >
          {dimensionCategories.map(
            (category) => (
              <option
                key={category.key}
                value={category.key}
              >
                {category.label}
              </option>
            ),
          )}
        </select>
      </label>

      <div className="space-y-2">
        {scores
          .map((score, index) => ({
            ...score,
            index,
          }))
          .filter(
            (score) =>
              score.dimensionCategory ===
              selectedScoreCategory,
          )
          .map((score) => (
            <label
              key={`${score.dimensionCategory}:${score.dimensionCode}`}
              className="flex items-center gap-3 rounded-xl border border-black/10 bg-white px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-[#171717]">
                  {score.dimensionName}
                </span>

                <span className="block font-mono text-[10px] text-[#8b9099]">
                  {score.dimensionCode}
                </span>
              </span>

              <input
                type="number"
                step="any"
                value={score.value}
                onChange={(event) => {
                  const value =
                    event.currentTarget.value;

                  setScores(
                    (current) =>
                      current.map(
                        (
                          candidate,
                          index,
                        ) =>
                          index === score.index
                            ? {
                                ...candidate,
                                value,
                              }
                            : candidate,
                      ),
                  );
                }}
                className="h-9 w-24 rounded-lg border border-black/10 px-2 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              />
            </label>
          ))}
      </div>
    </div>
  ) : null}
</section>

<section>
  <button
    type="button"
    onClick={() =>
      setCrossScoresOpen(
        (current) => !current,
      )
    }
    className="flex w-full items-center justify-between px-4 py-3 text-left"
  >
    <span className="text-sm font-semibold text-[#171717]">
      crossScores
    </span>

    {crossScoresOpen ? (
      <ChevronDown size={16} />
    ) : (
      <ChevronRight size={16} />
    )}
  </button>

  {crossScoresOpen ? (
    <div className="space-y-4 px-4 pb-5">
      <div className="grid gap-3">
        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b9099]">
            Kategoria główna
          </span>

          <select
            value={selectedPrimaryCategory}
            onChange={(event) => {
              const nextPrimary =
                event.currentTarget.value;

              setSelectedPrimaryCategory(
                nextPrimary,
              );

              if (
                nextPrimary ===
                selectedFilterCategory
              ) {
                const fallback =
                  dimensionCategories.find(
                    (category) =>
                      category.key !==
                      nextPrimary,
                  );

                setSelectedFilterCategory(
                  fallback?.key ?? "",
                );
              }
            }}
            className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
          >
            {dimensionCategories.map(
              (category) => (
                <option
                  key={category.key}
                  value={category.key}
                >
                  {category.label}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8b9099]">
            Kategoria przekroju
          </span>

          <select
            value={selectedFilterCategory}
            onChange={(event) =>
              setSelectedFilterCategory(
                event.currentTarget.value,
              )
            }
            className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
          >
            {dimensionCategories
              .filter(
                (category) =>
                  category.key !==
                  selectedPrimaryCategory,
              )
              .map((category) => (
                <option
                  key={category.key}
                  value={category.key}
                >
                  {category.label}
                </option>
              ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-black/10 bg-[#f7f7f8] px-3 py-2">
        <div className="text-xs font-semibold text-[#171717]">
          {
            dimensionCategories.find(
              (category) =>
                category.key ===
                selectedPrimaryCategory,
            )?.label
          }
          {" × "}
          {
            dimensionCategories.find(
              (category) =>
                category.key ===
                selectedFilterCategory,
            )?.label
          }
        </div>

        <div className="mt-0.5 text-[10px] text-[#8b9099]">
          Wiersze: kategoria główna · kolumny:
          kategoria przekroju
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-max min-w-full border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-32 bg-white p-2 text-left text-[10px] font-semibold text-[#6b7280]">
                Wymiar
              </th>

              {selectedFilterDimensions.map(
                (dimension) => (
                  <th
                    key={dimension.code}
                    className="min-w-24 p-2 text-center"
                  >
                    <span className="block text-[10px] font-semibold text-[#171717]">
                      {dimension.name}
                    </span>

                    <span className="font-mono text-[9px] text-[#8b9099]">
                      {dimension.code}
                    </span>
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {selectedPrimaryDimensions.map(
              (primaryDimension) => (
                <tr key={primaryDimension.code}>
                  <th className="sticky left-0 z-10 bg-white p-2 text-left">
                    <span className="block text-[10px] font-semibold text-[#171717]">
                      {primaryDimension.name}
                    </span>

                    <span className="font-mono text-[9px] text-[#8b9099]">
                      {primaryDimension.code}
                    </span>
                  </th>

                  {selectedFilterDimensions.map(
                    (filterDimension) => {
                      const path = [
                        selectedPrimaryCategory,
                        primaryDimension.code,
                        selectedFilterCategory,
                        filterDimension.code,
                      ].join("::");

                      const entry =
                        crossScoreByPath.get(
                          path,
                        );

                      return (
                        <td
                          key={filterDimension.code}
                          className="p-1"
                        >
                          <input
                            type="number"
                            step="any"
                            value={
                              entry?.score.value ??
                              ""
                            }
                            onChange={(event) => {
                              const value =
                                event
                                  .currentTarget
                                  .value;

                              if (entry) {
                                setCrossScores(
                                  (current) =>
                                    current.map(
                                      (
                                        candidate,
                                        index,
                                      ) =>
                                        index ===
                                        entry.index
                                          ? {
                                              ...candidate,
                                              value,
                                            }
                                          : candidate,
                                    ),
                                );

                                return;
                              }

                              setCrossScores(
                                (current) => [
                                  ...current,
                                  {
                                    id: path,

                                    primaryCategory:
                                      selectedPrimaryCategory,

                                    primaryCode:
                                      primaryDimension.code,

                                    filterCategory:
                                      selectedFilterCategory,

                                    filterCode:
                                      filterDimension.code,

                                    value,
                                  },
                                ],
                              );
                            }}
                            className="h-9 w-20 rounded-lg border border-black/10 bg-white px-2 text-center text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                          />
                        </td>
                      );
                    },
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  ) : null}
</section>
      </div>
    </aside>
  );

  return (
    <ReportDocumentPreviewFrame
      html={html}
      sidebar={
        editorOpen ? editor : undefined
      }
      sidebarOpen={editorOpen}
      onSidebarOpenChange={setEditorOpen}
    />
  );
}