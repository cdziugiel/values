"use client";

import Link from "next/link";
import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  Clock3,
  Eye,
  FlaskConical,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  ArrowLeftRight,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  createSyntheticReportPreviewAction,
  type CreateSyntheticReportPreviewState,
} from "../api/report-preview-snapshot.actions";

import type {
  ReportPreviewDefinition,
  ReportPreviewDimensionCategory,
} from "../api/report-preview-data.queries";

import type { ReportPreviewSessionOption } from "../api/report-preview-session.queries";

type PreviewMode = "session" | "synthetic";

type CrossMatrixValues = Record<
  string,
  Record<string, number | null>
>;

type CrossMatrixState = {
  id: string;
  primaryCategory: string;
  filterCategory: string;

  valuesByPair: Record<string, CrossMatrixValues>;
};

type ReportDataPreviewPickerProps = {
  reportTemplateVersionId: string;
  sessions: ReportPreviewSessionOption[];
  definition: ReportPreviewDefinition | null;
};

const initialActionState: CreateSyntheticReportPreviewState = {
  status: "idle",
  message: "",
};

function formatDateTime(
  value: Date | string | null | undefined,
) {
  if (!value) return "brak daty";

  const date =
    value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "nieprawidłowa data";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(0, 8);
}
function getMatrixPairKey(
  primaryCategory: string,
  filterCategory: string,
) {
  return `${primaryCategory}::${filterCategory}`;
}

function getActiveMatrixValues(
  matrix: CrossMatrixState,
): CrossMatrixValues {
  const pairKey = getMatrixPairKey(
    matrix.primaryCategory,
    matrix.filterCategory,
  );

  return matrix.valuesByPair[pairKey] ?? {};
}

function transposeMatrixValues(
  values: CrossMatrixValues,
): CrossMatrixValues {
  const transposed: CrossMatrixValues = {};

  for (const [primaryCode, filterValues] of Object.entries(
    values,
  )) {
    for (const [filterCode, value] of Object.entries(
      filterValues,
    )) {
      transposed[filterCode] ??= {};
      transposed[filterCode][primaryCode] = value;
    }
  }

  return transposed;
}
function sessionMatchesSearch(
  session: ReportPreviewSessionOption,
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    session.tenantName,
    session.tenantSlug,
    session.projectName,
    session.respondentLabel,
    session.respondentEmail,
    session.sessionId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

function createMatrix(
  categories: ReportPreviewDimensionCategory[],
  existingMatrices: CrossMatrixState[],
): CrossMatrixState | null {
  if (categories.length < 2) {
    return null;
  }

  const usedPairs = new Set(
    existingMatrices.map((matrix) =>
      getMatrixPairKey(
        matrix.primaryCategory,
        matrix.filterCategory,
      ),
    ),
  );

  for (const primaryCategory of categories) {
    for (const filterCategory of categories) {
      if (primaryCategory.key === filterCategory.key) {
        continue;
      }

      const pairKey = getMatrixPairKey(
        primaryCategory.key,
        filterCategory.key,
      );

      if (usedPairs.has(pairKey)) {
        continue;
      }

      return {
        id: crypto.randomUUID(),
        primaryCategory: primaryCategory.key,
        filterCategory: filterCategory.key,
        valuesByPair: {
          [pairKey]: {},
        },
      };
    }
  }

  return null;
}
function numberFromInput(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReportDataPreviewPicker({
  reportTemplateVersionId,
  sessions,
  definition,
}: ReportDataPreviewPickerProps) {
  const [mode, setMode] =
    useState<PreviewMode>("session");

  const [selectedSessionId, setSelectedSessionId] =
    useState("");

  const [search, setSearch] = useState("");

  const [scoreCategory, setScoreCategory] = useState(
    definition?.categories[0]?.key ?? "",
  );

  const [scoreValues, setScoreValues] = useState<
    Record<string, number | null>
  >({});

  const [crossMatrices, setCrossMatrices] = useState<
    CrossMatrixState[]
  >([]);

  const [actionState, formAction, isPending] =
    useActionState(
      createSyntheticReportPreviewAction,
      initialActionState,
    );

  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        sessionMatchesSearch(session, search),
      ),
    [sessions, search],
  );

  const selectedSession = useMemo(
    () =>
      sessions.find(
        (session) =>
          session.sessionId === selectedSessionId,
      ),
    [sessions, selectedSessionId],
  );

  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        tenantName: string;
        projectName: string;
        sessions: ReportPreviewSessionOption[];
      }
    >();

    for (const session of filteredSessions) {
      const key = `${session.tenantSlug}:${session.projectId}`;
      const existing = groups.get(key);

      if (existing) {
        existing.sessions.push(session);
      } else {
        groups.set(key, {
          key,
          tenantName: session.tenantName,
          projectName: session.projectName,
          sessions: [session],
        });
      }
    }

    return Array.from(groups.values()).map(
      (group) => ({
        ...group,
        sessions: group.sessions.toSorted((a, b) => {
          const aTime = a.completedAt
            ? new Date(a.completedAt).getTime()
            : 0;

          const bTime = b.completedAt
            ? new Date(b.completedAt).getTime()
            : 0;

          return bTime - aTime;
        }),
      }),
    );
  }, [filteredSessions]);

  const previewHref = selectedSession
    ? `/t/${selectedSession.tenantSlug}` +
    `/assessment-sessions/${selectedSession.sessionId}` +
    `/report/${reportTemplateVersionId}` +
    `?source=builder-preview` +
    `&projectQuestionnaireId=${selectedSession.projectQuestionnaireId}` +
    `&questionnaireVersionId=${selectedSession.questionnaireVersionId}`
    : null;

  const selectedScoreCategory =
    definition?.categories.find(
      (category) => category.key === scoreCategory,
    ) ?? null;

  const serializedScores = JSON.stringify(
    (selectedScoreCategory?.dimensions ?? []).map(
      (dimension) => ({
        dimensionCode: dimension.code,
        value: scoreValues[dimension.code] ?? 0,
      }),
    ),
  );

  const serializedCrossMatrices = JSON.stringify(
    crossMatrices.map((matrix) => ({
      primaryCategory: matrix.primaryCategory,
      filterCategory: matrix.filterCategory,
      values: getActiveMatrixValues(matrix),
    })),
  );

  function getCategory(key: string) {
    return (
      definition?.categories.find(
        (category) => category.key === key,
      ) ?? null
    );
  }

  function updateMatrixCategories(
    matrixId: string,
    patch: Partial<
      Pick<
        CrossMatrixState,
        "primaryCategory" | "filterCategory"
      >
    >,
  ) {
    setCrossMatrices((current) =>
      current.map((matrix) => {
        if (matrix.id !== matrixId) {
          return matrix;
        }

        const nextPrimaryCategory =
          patch.primaryCategory ??
          matrix.primaryCategory;

        let nextFilterCategory =
          patch.filterCategory ??
          matrix.filterCategory;

        /**
         * Nie pozwalamy ustawić tej samej kategorii
         * po obu stronach macierzy.
         */
        if (
          nextPrimaryCategory === nextFilterCategory
        ) {
          const fallbackCategory =
            definition?.categories.find(
              (category) =>
                category.key !== nextPrimaryCategory,
            );

          if (fallbackCategory) {
            nextFilterCategory = fallbackCategory.key;
          }
        }

        const pairKey = getMatrixPairKey(
          nextPrimaryCategory,
          nextFilterCategory,
        );

        return {
          ...matrix,
          primaryCategory: nextPrimaryCategory,
          filterCategory: nextFilterCategory,

          valuesByPair: {
            ...matrix.valuesByPair,
            [pairKey]:
              matrix.valuesByPair[pairKey] ?? {},
          },
        };
      }),
    );
  }

  function updateCrossValue(input: {
    matrixId: string;
    primaryCode: string;
    filterCode: string;
    value: number | null;
  }) {
    setCrossMatrices((current) =>
      current.map((matrix) => {
        if (matrix.id !== input.matrixId) {
          return matrix;
        }

        const pairKey = getMatrixPairKey(
          matrix.primaryCategory,
          matrix.filterCategory,
        );

        const activeValues =
          matrix.valuesByPair[pairKey] ?? {};

        return {
          ...matrix,

          valuesByPair: {
            ...matrix.valuesByPair,

            [pairKey]: {
              ...activeValues,

              [input.primaryCode]: {
                ...(activeValues[
                  input.primaryCode
                ] ?? {}),

                [input.filterCode]: input.value,
              },
            },
          },
        };
      }),
    );
  }

  function swapMatrixAxes(matrixId: string) {
    setCrossMatrices((current) =>
      current.map((matrix) => {
        if (matrix.id !== matrixId) {
          return matrix;
        }

        const currentPairKey = getMatrixPairKey(
          matrix.primaryCategory,
          matrix.filterCategory,
        );

        const reversedPairKey = getMatrixPairKey(
          matrix.filterCategory,
          matrix.primaryCategory,
        );

        const currentValues =
          matrix.valuesByPair[currentPairKey] ?? {};

        const existingReversedValues =
          matrix.valuesByPair[reversedPairKey];

        return {
          ...matrix,

          primaryCategory: matrix.filterCategory,
          filterCategory: matrix.primaryCategory,

          valuesByPair: {
            ...matrix.valuesByPair,

            /**
             * Jeżeli odwrotna macierz nie była jeszcze
             * edytowana, inicjalizujemy ją transpozycją.
             *
             * Jeżeli już istnieje, nie nadpisujemy jej.
             */
            [reversedPairKey]:
              existingReversedValues ??
              transposeMatrixValues(currentValues),
          },
        };
      }),
    );
  }

  function addCrossMatrix() {
    if (!definition) {
      return;
    }

    setCrossMatrices((current) => {
      const matrix = createMatrix(
        definition.categories,
        current,
      );

      if (!matrix) {
        return current;
      }

      return [...current, matrix];
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Eye size={16} />
          Podgląd na danych
        </Button>
      </DialogTrigger>

      <DialogContent
        className={[
          "h-[92vh] max-h-[92vh]",
          "w-[96vw] max-w-[96vw]",
          "overflow-hidden",
          "rounded-[2rem] border-black/10 bg-white/95 p-0",
          "shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur",
          "sm:max-w-[96vw] xl:w-[1400px] xl:max-w-[1400px]",
        ].join(" ")}
      >
        <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
          <DialogHeader className="border-b border-black/10 p-6 pb-5 text-left">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <ShieldCheck size={13} />
              Podgląd superadmina
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Podgląd raportu
            </DialogTitle>

            <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
              Otwórz raport na snapshotcie zakończonej
              sesji albo utwórz tymczasowy snapshot z
              ręcznych wyników i crossScores.
            </DialogDescription>

            <div className="mt-4 inline-flex w-fit rounded-full border border-black/10 bg-[#f3f4f6] p-1">
              <button
                type="button"
                onClick={() => setMode("session")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  mode === "session"
                    ? "bg-white text-[#171717] shadow-sm"
                    : "text-[#6b7280]",
                ].join(" ")}
              >
                Realna sesja
              </button>

              <button
                type="button"
                onClick={() => setMode("synthetic")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  mode === "synthetic"
                    ? "bg-white text-[#171717] shadow-sm"
                    : "text-[#6b7280]",
                ].join(" ")}
              >
                Własna konfiguracja
              </button>
            </div>
          </DialogHeader>

          {mode === "session" ? (
            <>
              <div className="border-b border-black/10 p-5">
                <label className="mb-1.5 block text-sm font-medium text-[#171717]">
                  Wyszukaj sesję
                </label>

                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
                  />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.currentTarget.value,
                      )
                    }
                    placeholder="Szukaj po projekcie, respondencie, mailu albo ID sesji..."
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f7f8] p-5">
                {sessions.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
                    Nie znaleziono zakończonych sesji
                    zgodnych z wersją kwestionariusza.
                  </div>
                ) : groupedSessions.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
                    Brak sesji pasujących do
                    wyszukiwania.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedSessions.map((group) => (
                      <section
                        key={group.key}
                        className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/75 shadow-sm"
                      >
                        <div className="sticky top-0 z-10 border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold tracking-[-0.02em] text-[#171717]">
                              {group.projectName}
                            </span>

                            <Badge
                              variant="outline"
                              className="rounded-full border-black/10 bg-white/70 text-[#6b7280]"
                            >
                              {group.tenantName}
                            </Badge>

                            <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                              {group.sessions.length} sesji
                            </Badge>
                          </div>
                        </div>

                        <div className="divide-y divide-black/10">
                          {group.sessions.map(
                            (session) => {
                              const isSelected =
                                selectedSessionId ===
                                session.sessionId;

                              return (
                                <button
                                  key={`${session.projectQuestionnaireId}:${session.sessionId}`}
                                  type="button"
                                  onClick={() =>
                                    setSelectedSessionId(
                                      session.sessionId,
                                    )
                                  }
                                  className={[
                                    "flex w-full items-start gap-3 px-4 py-4 text-left transition",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
                                    isSelected
                                      ? "bg-[rgba(45,212,191,0.10)]"
                                      : "bg-white/70 hover:bg-white",
                                  ].join(" ")}
                                >
                                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center">
                                    {isSelected ? (
                                      <CheckCircle2 className="h-5 w-5 text-[#0f766e]" />
                                    ) : (
                                      <span className="h-4 w-4 rounded-full border border-black/20 bg-white" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="font-semibold text-[#171717]">
                                        {
                                          session.respondentLabel
                                        }
                                      </span>

                                      {session.respondentEmail ? (
                                        <span className="inline-flex items-center gap-1 text-sm text-[#6b7280]">
                                          <UserRound
                                            size={13}
                                          />
                                          {
                                            session.respondentEmail
                                          }
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b7280]">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        zakończono:{" "}
                                        {formatDateTime(
                                          session.completedAt,
                                        )}
                                      </span>

                                      <span className="font-mono">
                                        sesja:{" "}
                                        {shortId(
                                          session.sessionId,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </button>
                              );
                            },
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-black/10 bg-white/85 p-5">
                <div className="flex justify-end">
                  {previewHref ? (
                    <Button
                      asChild
                      className="rounded-full bg-[#171717] text-white"
                    >
                      <Link
                        href={previewHref}
                        target="_blank"
                      >
                        <Eye size={16} />
                        Otwórz podgląd
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled
                      className="rounded-full bg-[#171717] text-white"
                    >
                      <Eye size={16} />
                      Otwórz podgląd
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <form
              action={formAction}
              className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
            >
              <input
                type="hidden"
                name="reportTemplateVersionId"
                value={reportTemplateVersionId}
              />

              <input
                type="hidden"
                name="questionnaireVersionId"
                value={
                  definition?.questionnaireVersionId ??
                  ""
                }
              />

              <input
                type="hidden"
                name="scoreCategory"
                value={scoreCategory}
              />

              <input
                type="hidden"
                name="scores"
                value={serializedScores}
              />

              <input
                type="hidden"
                name="crossMatrices"
                value={serializedCrossMatrices}
              />

              {!definition ? (
                <div className="p-6">
                  <div className="rounded-[1.5rem] border border-dashed border-red-200 bg-red-50 p-6 text-sm leading-6 text-red-700">
                    Ten raport nie ma aktywnego
                    powiązania z wersją
                    kwestionariusza.
                  </div>
                </div>
              ) : (
                <>
                  <div className="min-h-0 min-w-0 flex-1 space-y-6 overflow-y-auto bg-[#f7f7f8] p-5">
                    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/80 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                          <FlaskConical size={18} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-[#171717]">
                            Wyniki podstawowe
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                            {definition.questionnaireName} ·{" "}
                            {
                              definition.questionnaireVersionName
                            }
                          </p>
                        </div>
                      </div>

                      <label className="mt-5 block space-y-2">
                        <span className="text-sm font-medium text-[#171717]">
                          Kategoria wyników
                        </span>

                        <select
                          value={scoreCategory}
                          onChange={(event) => {
                            setScoreCategory(
                              event.currentTarget.value,
                            );
                            setScoreValues({});
                          }}
                          className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                        >
                          {definition.categories.map(
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

                      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {(
                          selectedScoreCategory?.dimensions ??
                          []
                        ).map((dimension) => (
                          <label
                            key={dimension.id}
                            className="rounded-2xl border border-black/10 bg-white p-4"
                          >
                            <span className="block text-sm font-semibold text-[#171717]">
                              {dimension.name}
                            </span>

                            <span className="mt-1 block font-mono text-xs text-[#6b7280]">
                              {dimension.code}
                            </span>

                            <input
                              type="number"
                              step="any"
                              value={
                                scoreValues[
                                dimension.code
                                ] ?? 0
                              }
                              onChange={(event) => {
                                const value =
                                  numberFromInput(event.currentTarget.value) ?? 0;

                                setScoreValues((current) => ({
                                  ...current,
                                  [dimension.code]: value,
                                }));
                              }}
                              className="mt-3 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                            />
                          </label>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 overflow-x-auto">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-[#171717]">
                            crossScores
                          </h3>

                          <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                            Dodaj dowolną liczbę macierzy
                            kategorii. Puste komórki nie są
                            zapisywane.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={addCrossMatrix}
                          disabled={
                            definition.categories.length < 2
                          }
                          className="rounded-full"
                        >
                          <Plus size={15} />
                          Dodaj macierz
                        </Button>
                      </div>

                      <div className="mt-5 space-y-5">
                        {crossMatrices.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-black/10 bg-[#f7f7f8] p-5 text-sm text-[#6b7280]">
                            Nie dodano macierzy
                            crossScores.
                          </div>
                        ) : null}

                        {crossMatrices.map(
                          (matrix, matrixIndex) => {
                            const activeValues =
                              getActiveMatrixValues(matrix);

                            const primaryCategory =
                              getCategory(
                                matrix.primaryCategory,
                              );

                            const filterCategory =
                              getCategory(
                                matrix.filterCategory,
                              );

                            return (
                              <div
                                key={matrix.id}
                                className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-black/10 bg-white"
                              >
                                <div className="flex flex-col gap-3 border-b border-black/10 p-4 md:flex-row md:items-end">
                                  <label className="flex-1 space-y-2">
                                    <span className="text-xs font-medium text-[#6b7280]">
                                      Kategoria główna
                                    </span>

                                    <select
                                      value={
                                        matrix.primaryCategory
                                      }
                                      onChange={(event) =>
                                        updateMatrixCategories(
                                          matrix.id,
                                          {
                                            primaryCategory:
                                              event
                                                .currentTarget
                                                .value,
                                          },
                                        )
                                      }
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                                    >
                                      {definition.categories.map(
                                        (category) => (
                                          <option
                                            key={
                                              category.key
                                            }
                                            value={
                                              category.key
                                            }
                                          >
                                            {
                                              category.label
                                            }
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </label>

                                  <label className="flex-1 space-y-2">
                                    <span className="text-xs font-medium text-[#6b7280]">
                                      Kategoria przekroju
                                    </span>

                                    <select
                                      value={
                                        matrix.filterCategory
                                      }
                                      onChange={(event) =>
                                        updateMatrixCategories(
                                          matrix.id,
                                          {
                                            filterCategory:
                                              event
                                                .currentTarget
                                                .value,
                                          },
                                        )
                                      }
                                      className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm"
                                    >
                                      {definition.categories
                                        .filter(
                                          (category) =>
                                            category.key !==
                                            matrix.primaryCategory,
                                        )
                                        .map((category) => (
                                          <option
                                            key={
                                              category.key
                                            }
                                            value={
                                              category.key
                                            }
                                          >
                                            {
                                              category.label
                                            }
                                          </option>
                                        ))}
                                    </select>
                                  </label>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      swapMatrixAxes(matrix.id)
                                    }
                                    className="h-10 w-10 rounded-full"
                                    title="Zamień osie macierzy"
                                  >
                                    <ArrowLeftRight size={15} />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      setCrossMatrices(
                                        (current) =>
                                          current.filter(
                                            (candidate) =>
                                              candidate.id !==
                                              matrix.id,
                                          ),
                                      )
                                    }
                                    className="h-10 w-10 rounded-full border-red-200 text-red-700"
                                    title={`Usuń macierz ${matrixIndex + 1
                                      }`}
                                  >
                                    <Trash2 size={15} />
                                  </Button>
                                </div>

                                {primaryCategory &&
                                  filterCategory ? (
                                  <div className="w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain p-4">
                                    <table className="w-max min-w-full border-separate border-spacing-1 text-sm">
                                      <thead>
                                        <tr>
                                          <th className="sticky left-0 z-10 min-w-40 bg-white p-2 text-left text-xs font-semibold text-[#6b7280]">
                                            {
                                              primaryCategory.label
                                            }{" "}
                                            ×{" "}
                                            {
                                              filterCategory.label
                                            }
                                          </th>

                                          {filterCategory.dimensions.map(
                                            (dimension) => (
                                              <th
                                                key={
                                                  dimension.id
                                                }
                                                className="min-w-28 p-2 text-center"
                                              >
                                                <span className="block text-xs font-semibold text-[#171717]">
                                                  {
                                                    dimension.name
                                                  }
                                                </span>
                                                <span className="font-mono text-[10px] text-[#8b9099]">
                                                  {
                                                    dimension.code
                                                  }
                                                </span>
                                              </th>
                                            ),
                                          )}
                                        </tr>
                                      </thead>

                                      <tbody>
                                        {primaryCategory.dimensions.map(
                                          (
                                            primaryDimension,
                                          ) => (
                                            <tr
                                              key={
                                                primaryDimension.id
                                              }
                                            >
                                              <th className="sticky left-0 z-10 bg-white p-2 text-left">
                                                <span className="block text-xs font-semibold text-[#171717]">
                                                  {
                                                    primaryDimension.name
                                                  }
                                                </span>
                                                <span className="font-mono text-[10px] text-[#8b9099]">
                                                  {
                                                    primaryDimension.code
                                                  }
                                                </span>
                                              </th>

                                              {filterCategory.dimensions.map(
                                                (
                                                  filterDimension,
                                                ) => (
                                                  <td
                                                    key={
                                                      filterDimension.id
                                                    }
                                                    className="p-1"
                                                  >
                                                    <input
                                                      type="number"
                                                      step="any"
                                                      value={
                                                        activeValues[
                                                        primaryDimension.code
                                                        ]?.[
                                                        filterDimension.code
                                                        ] ?? ""
                                                      }
                                                      onChange={(
                                                        event,
                                                      ) =>
                                                        updateCrossValue(
                                                          {
                                                            matrixId:
                                                              matrix.id,
                                                            primaryCode:
                                                              primaryDimension.code,
                                                            filterCode:
                                                              filterDimension.code,
                                                            value:
                                                              numberFromInput(
                                                                event
                                                                  .currentTarget
                                                                  .value,
                                                              ),
                                                          },
                                                        )
                                                      }
                                                      className="h-9 w-24 rounded-lg border border-black/10 bg-white px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                                                    />
                                                  </td>
                                                ),
                                              )}
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : null}
                              </div>
                            );
                          },
                        )}
                      </div>
                    </section>

                    {actionState.status === "error" ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {actionState.message}
                      </div>
                    ) : null}
                  </div>

                  <div className="sticky bottom-0 flex justify-end border-t border-black/10 bg-white/95 p-5 backdrop-blur">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="rounded-full bg-[#171717] text-white"
                    >
                      <FlaskConical size={16} />
                      {isPending
                        ? "Tworzenie podglądu..."
                        : "Utwórz tymczasowy snapshot"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
