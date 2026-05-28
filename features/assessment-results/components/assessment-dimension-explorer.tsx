"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Filter, Grid3X3, ListFilter, Table2 } from "lucide-react";

import type {
    AssessmentResultMetricConfig,
    AssessmentResultMetricKey,
    CrossCategoryResultForExplorer,
    DimensionAggregateForExplorer,
} from "../types/assessment-dimension-explorer.types";

type AssessmentDimensionExplorerProps = {
    aggregates: DimensionAggregateForExplorer[];
    crossCategoryResults: CrossCategoryResultForExplorer[];
};

const METRICS: AssessmentResultMetricConfig[] = [
    {
        key: "averageWeightedMeanScore",
        label: "Średnia ważona itemów",
        description: "Najbardziej użyteczna metryka do porównań wymiarów.",
        format: "number",
    },
    {
        key: "averageMeanScore",
        label: "Średnia itemów",
        description: "Średnia z itemów bez dodatkowego ważenia.",
        format: "number",
    },
    {
        key: "averageWeightedScore",
        label: "Średnia ważona",
        description: "Agregacja wyniku ważonego skali.",
        format: "number",
    },
    {
        key: "averageRawScore",
        label: "Średnia surowa",
        description: "Agregacja wyniku surowego.",
        format: "number",
    },
    {
        key: "averageCompleteness",
        label: "Kompletność",
        description: "Średni poziom kompletności danych.",
        format: "percent",
    },
];

type ViewMode = "list" | "cross";

function formatValue(
    value: number | null | undefined,
    metric: AssessmentResultMetricConfig,
) {
    if (value === null || value === undefined) {
        return "—";
    }

    if (metric.format === "percent") {
        return new Intl.NumberFormat("pl-PL", {
            style: "percent",
            minimumFractionDigits: 0,
            maximumFractionDigits: 1,
        }).format(value);
    }

    return new Intl.NumberFormat("pl-PL", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
    }).format(value);
}

function getMetricValue(
    aggregate: DimensionAggregateForExplorer,
    metricKey: AssessmentResultMetricKey,
) {
    return aggregate[metricKey];
}


function normalizeKey(value: string | null | undefined) {
    return String(value ?? "").trim().toLowerCase();
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
    const map = new Map<string, T>();

    for (const item of items) {
        const key = getKey(item);

        if (!map.has(key)) {
            map.set(key, item);
        }
    }

    return Array.from(map.values());
}

function average(values: Array<number | null | undefined>) {
    const validValues = values.filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
    );

    if (validValues.length === 0) {
        return null;
    }

    return validValues.reduce((acc, value) => acc + value, 0) / validValues.length;
}
function getCrossMetricValue(
    result: CrossCategoryResultForExplorer,
    metricKey: AssessmentResultMetricKey,
) {
    return result[metricKey];
}


type CrossAxisValue = {
    categoryCode: string;
    code: string;
    name: string;
    dimensionId: string;
};

function applyManualOrder<T extends CrossAxisValue>(
    values: T[],
    order: string[],
) {
    if (order.length === 0) {
        return values;
    }

    const orderIndex = new Map(order.map((key, index) => [key, index]));

    return [...values].sort((a, b) => {
        const aKey = getCrossValueKey(a);
        const bKey = getCrossValueKey(b);

        const aIndex = orderIndex.get(aKey);
        const bIndex = orderIndex.get(bKey);

        if (aIndex !== undefined && bIndex !== undefined) {
            return aIndex - bIndex;
        }

        if (aIndex !== undefined) {
            return -1;
        }

        if (bIndex !== undefined) {
            return 1;
        }

        return a.name.localeCompare(b.name, "pl");
    });
}

function moveInOrder<T extends CrossAxisValue>({
    values,
    currentOrder,
    key,
    direction,
}: {
    values: T[];
    currentOrder: string[];
    key: string;
    direction: -1 | 1;
}) {
    const currentKeys = values.map(getCrossValueKey);

    const normalizedOrder =
        currentOrder.length > 0
            ? [
                ...currentOrder.filter((item) => currentKeys.includes(item)),
                ...currentKeys.filter((item) => !currentOrder.includes(item)),
            ]
            : currentKeys;

    const currentIndex = normalizedOrder.indexOf(key);

    if (currentIndex === -1) {
        return normalizedOrder;
    }

    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= normalizedOrder.length) {
        return normalizedOrder;
    }

    const nextOrder = [...normalizedOrder];
    const [moved] = nextOrder.splice(currentIndex, 1);

    if (!moved) {
        return normalizedOrder;
    }

    nextOrder.splice(nextIndex, 0, moved);

    return nextOrder;
}

function aggregateCrossMetric(
    results: CrossCategoryResultForExplorer[],
    metricKey: AssessmentResultMetricKey,
) {
    if (results.length === 0) {
        return null;
    }

    if (metricKey === "averageCompleteness") {
        const expected = results.reduce(
            (acc, result) => acc + result.expectedCount,
            0,
        );

        if (expected === 0) {
            return null;
        }

        const answered = results.reduce(
            (acc, result) => acc + result.answeredCount,
            0,
        );

        return answered / expected;
    }

    const weightedValues = results
        .map((result) => ({
            value: getCrossMetricValue(result, metricKey),
            weight: result.answeredCount,
        }))
        .filter(
            (item): item is { value: number; weight: number } =>
                typeof item.value === "number" &&
                Number.isFinite(item.value) &&
                item.weight > 0,
        );

    if (weightedValues.length === 0) {
        return null;
    }

    const numerator = weightedValues.reduce(
        (acc, item) => acc + item.value * item.weight,
        0,
    );

    const denominator = weightedValues.reduce(
        (acc, item) => acc + item.weight,
        0,
    );

    return numerator / denominator;
}
function CheckboxPill({
    checked,
    label,
    onChange,
}: {
    checked: boolean;
    label: string;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onChange}
            className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                checked
                    ? "border-[rgba(45,212,191,0.42)] bg-[rgba(45,212,191,0.16)] text-[#0f766e]"
                    : "border-black/10 bg-white/70 text-[#6b7280] hover:bg-white",
            ].join(" ")}
        >
            {label}
        </button>
    );
}
function getCrossValueKey(value: {
    categoryCode: string;
    code: string;
}) {
    return `${value.categoryCode}:${value.code}`;
}
export function AssessmentDimensionExplorer({
    aggregates,
    crossCategoryResults,
}: AssessmentDimensionExplorerProps) {
    const [metricKey, setMetricKey] =
        useState<AssessmentResultMetricKey>("averageWeightedMeanScore");
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [selectedQuestionnaireVersionId, setSelectedQuestionnaireVersionId] =
        useState<string>("");

    const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>("");
    const [selectedDimensionIds, setSelectedDimensionIds] = useState<Set<string>>(
        () => new Set(),
    );

    const [xCategoryCode, setXCategoryCode] = useState<string>("");
    const [yCategoryCode, setYCategoryCode] = useState<string>("");
    const [xValueOrder, setXValueOrder] = useState<string[]>([]);
    const [yValueOrder, setYValueOrder] = useState<string[]>([]);
    const metric = METRICS.find((item) => item.key === metricKey) ?? METRICS[0];

    const questionnaireOptions = useMemo(
        () =>
            uniqueBy(
                aggregates.map((aggregate) => ({
                    id: aggregate.questionnaireVersionId,
                    name: aggregate.questionnaireName,
                    versionName: aggregate.questionnaireVersionName,
                })),
                (item) => item.id,
            ),
        [aggregates],
    );

    useEffect(() => {
        if (questionnaireOptions.length === 0) {
            setSelectedQuestionnaireVersionId("");
            setSelectedDimensionIds(new Set());
            return;
        }

        const availableIds = new Set(questionnaireOptions.map((option) => option.id));

        if (!selectedQuestionnaireVersionId || !availableIds.has(selectedQuestionnaireVersionId)) {
            setSelectedQuestionnaireVersionId(questionnaireOptions[0]?.id ?? "");
            setSelectedDimensionIds(new Set());
        }
    }, [questionnaireOptions, selectedQuestionnaireVersionId]);

    const aggregatesForQuestionnaire = useMemo(() => {
        if (!selectedQuestionnaireVersionId) {
            return [];
        }

        return aggregates.filter(
            (aggregate) =>
                aggregate.questionnaireVersionId === selectedQuestionnaireVersionId,
        );
    }, [aggregates, selectedQuestionnaireVersionId]);

    const categoryOptions = useMemo(() => {
        const categories = aggregatesForQuestionnaire.flatMap(
            (aggregate) => aggregate.categories ?? [],
        );

        return uniqueBy(
            categories.map((category) => ({
                code: category.categoryCode,
                name: category.categoryName,
            })),
            (category) => category.code,
        ).sort((a, b) => a.name.localeCompare(b.name, "pl"));
    }, [aggregatesForQuestionnaire]);

    useEffect(() => {
        if (categoryOptions.length === 0) {
            setSelectedCategoryCode("");
            setSelectedDimensionIds(new Set());
            return;
        }

        const availableCodes = new Set(categoryOptions.map((category) => category.code));

        if (!selectedCategoryCode || !availableCodes.has(selectedCategoryCode)) {
            setSelectedCategoryCode(categoryOptions[0]?.code ?? "");
            setSelectedDimensionIds(new Set());
        }
    }, [categoryOptions, selectedCategoryCode]);

    useEffect(() => {
        if (viewMode !== "cross") {
            return;
        }

        if (categoryOptions.length === 0) {
            setXCategoryCode("");
            setYCategoryCode("");
            return;
        }

        const availableCodes = new Set(categoryOptions.map((category) => category.code));

        const currentXIsValid = xCategoryCode && availableCodes.has(xCategoryCode);
        const currentYIsValid = yCategoryCode && availableCodes.has(yCategoryCode);

        if (
            currentXIsValid &&
            currentYIsValid &&
            xCategoryCode !== yCategoryCode
        ) {
            return;
        }

        const nextX = currentXIsValid ? xCategoryCode : categoryOptions[0]?.code ?? "";
        const nextY =
            categoryOptions.find((category) => category.code !== nextX)?.code ?? "";

        setXCategoryCode(nextX);
        setYCategoryCode(nextY);
    }, [categoryOptions, viewMode, xCategoryCode, yCategoryCode]);


    const filteredByCategory = useMemo(() => {
        if (!selectedCategoryCode) {
            return [];
        }

        return aggregatesForQuestionnaire.filter((aggregate) =>
            (aggregate.categories ?? []).some(
                (category) => category.categoryCode === selectedCategoryCode,
            ),
        );
    }, [aggregatesForQuestionnaire, selectedCategoryCode]);

    const dimensionOptions = useMemo(
        () =>
            filteredByCategory
                .map((aggregate) => ({
                    id: aggregate.dimensionId,
                    code: aggregate.dimensionCode,
                    name: aggregate.dimensionName,
                }))
                .sort((a, b) => a.code.localeCompare(b.code, "pl")),
        [filteredByCategory],
    );

    const visibleAggregates = useMemo(() => {
        if (selectedDimensionIds.size === 0) {
            return filteredByCategory;
        }

        return filteredByCategory.filter((aggregate) =>
            selectedDimensionIds.has(aggregate.dimensionId),
        );
    }, [filteredByCategory, selectedDimensionIds]);

    const crossResultsForQuestionnaire = useMemo(() => {
        if (!selectedQuestionnaireVersionId) {
            return [];
        }

        return crossCategoryResults.filter(
            (result) =>
                result.questionnaireVersionId === selectedQuestionnaireVersionId,
        );
    }, [crossCategoryResults, selectedQuestionnaireVersionId]);

    const crossMatrix = useMemo(() => {
        if (!xCategoryCode || !yCategoryCode || xCategoryCode === yCategoryCode) {
            return null;
        }

        const directedResults = crossResultsForQuestionnaire.filter(
            (result) =>
                result.xCategoryCode === xCategoryCode &&
                result.yCategoryCode === yCategoryCode,
        );

        const filteredResults =
            selectedDimensionIds.size === 0
                ? directedResults
                : directedResults.filter((result) => {
                    if (selectedCategoryCode === result.xCategoryCode) {
                        return selectedDimensionIds.has(result.xDimensionId);
                    }

                    if (selectedCategoryCode === result.yCategoryCode) {
                        return selectedDimensionIds.has(result.yDimensionId);
                    }

                    return false;
                });

        const baseXValues = uniqueBy(
            filteredResults.map((result) => ({
                categoryCode: result.xCategoryCode,
                code: result.xDimensionCode,
                name: result.xDimensionName,
                dimensionId: result.xDimensionId,
            })),
            getCrossValueKey,
        ).sort((a, b) => a.name.localeCompare(b.name, "pl"));

        const baseYValues = uniqueBy(
            filteredResults.map((result) => ({
                categoryCode: result.yCategoryCode,
                code: result.yDimensionCode,
                name: result.yDimensionName,
                dimensionId: result.yDimensionId,
            })),
            getCrossValueKey,
        ).sort((a, b) => a.name.localeCompare(b.name, "pl"));

        const xValues = applyManualOrder(baseXValues, xValueOrder);
        const yValues = applyManualOrder(baseYValues, yValueOrder);


        const cells = yValues.map((yValue) => ({
            yValue,
            values: xValues.map((xValue) => {
                const matchingResults = filteredResults.filter(
                    (result) =>
                        result.xCategoryCode === xValue.categoryCode &&
                        result.xDimensionCode === xValue.code &&
                        result.yCategoryCode === yValue.categoryCode &&
                        result.yDimensionCode === yValue.code,
                );

                return {
                    xValue,
                    value: aggregateCrossMetric(matchingResults, metric.key),
                    itemsCount: matchingResults.reduce(
                        (acc, result) => acc + result.itemsCount,
                        0,
                    ),
                    answeredCount: matchingResults.reduce(
                        (acc, result) => acc + result.answeredCount,
                        0,
                    ),
                    expectedCount: matchingResults.reduce(
                        (acc, result) => acc + result.expectedCount,
                        0,
                    ),
                };
            }),
        }));

        return {
            xValues,
            yValues,
            cells,
        };
    }, [
        crossResultsForQuestionnaire,
        metric.key,
        selectedCategoryCode,
        selectedDimensionIds,
        xCategoryCode,
        yCategoryCode, xValueOrder,
        yValueOrder,
    ]);

    useEffect(() => {
        setXValueOrder([]);
    }, [xCategoryCode, selectedQuestionnaireVersionId]);

    useEffect(() => {
        setYValueOrder([]);
    }, [yCategoryCode, selectedQuestionnaireVersionId]);
    function toggleDimension(dimensionId: string) {
        setSelectedDimensionIds((current) => {
            const next = new Set(current);

            if (next.has(dimensionId)) {
                next.delete(dimensionId);
            } else {
                next.add(dimensionId);
            }

            return next;
        });
    }

    function clearDimensions() {
        setSelectedDimensionIds(new Set());
    }

    return (
        <section className="rounded-[2rem] hv-brand-card">
            <div className="flex flex-col gap-4 p-5 md:p-6">
                <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                        <BarChart3 size={20} />
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                            Eksplorator wymiarów
                        </h2>

                        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b7280]">
                            Wybierz jedną metrykę, kategorie wymiarów oraz tryb podglądu.
                            Zamiast pokazywać wszystkie parametry naraz, tabela pokazuje tylko
                            wybrany wskaźnik.
                        </p>
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                        <ListFilter size={14} />
                        Metryka wyniku
                    </div>

                    <div className="grid gap-2 md:grid-cols-5">
                        {METRICS.map((metricOption) => (
                            <button
                                key={metricOption.key}
                                type="button"
                                onClick={() => setMetricKey(metricOption.key)}
                                className={[
                                    "rounded-[1.25rem] border p-3 text-left transition",
                                    metricOption.key === metric.key
                                        ? "border-[rgba(45,212,191,0.42)] bg-[rgba(45,212,191,0.16)] text-[#0f766e]"
                                        : "border-black/10 bg-white/70 text-[#171717] hover:bg-white",
                                ].join(" ")}
                            >
                                <span className="block text-sm font-semibold">
                                    {metricOption.label}
                                </span>
                                <span className="mt-1 block text-xs leading-5 text-[#6b7280]">
                                    {metricOption.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white/70 p-4 lg:grid-cols-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                            Kwestionariusz
                        </label>
                        <select
                            value={selectedQuestionnaireVersionId}
                            onChange={(event) => {
                                setSelectedQuestionnaireVersionId(event.target.value);
                                setSelectedDimensionIds(new Set());
                            }}
                            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                        >
                            {questionnaireOptions.map((option) => (
                                <option key={option.id} value={option.id}>
                                    {option.name} — {option.versionName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                            Kategoria wymiarów
                        </label>
                        <select
                            value={selectedCategoryCode}
                            onChange={(event) => {
                                setSelectedCategoryCode(event.target.value);
                                setSelectedDimensionIds(new Set());
                            }}
                            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                        >

                            {categoryOptions.map((category) => (
                                <option key={category.code} value={category.code}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                            Widok
                        </label>
                        <select
                            value={viewMode}
                            onChange={(event) => setViewMode(event.target.value as ViewMode)}
                            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                        >
                            <option value="list">Lista wymiarów</option>
                            <option value="cross">Przecięcie kategorii X × Y</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCategoryCode(categoryOptions[0]?.code ?? "");
                                setSelectedDimensionIds(new Set());

                                const nextX = categoryOptions[0]?.code ?? "";
                                const nextY =
                                    categoryOptions.find((category) => category.code !== nextX)?.code ?? "";

                                setXCategoryCode(nextX);
                                setYCategoryCode(nextY);
                            }}
                            className="h-10 w-full rounded-full border border-black/10 bg-white/70 px-4 text-sm font-semibold text-[#171717] shadow-sm transition hover:bg-white"
                        >
                            Wyczyść filtry
                        </button>
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                        <Filter size={14} />
                        Wymiary w wybranej kategorii
                    </div>

                    {dimensionOptions.length === 0 ? (
                        <p className="text-sm leading-6 text-[#6b7280]">
                            Brak wymiarów dla wybranych filtrów.
                        </p>
                    ) : (
                        <>
                            <div className="flex flex-wrap gap-2">
                                {dimensionOptions.map((dimension) => (
                                    <CheckboxPill
                                        key={dimension.id}
                                        checked={selectedDimensionIds.has(dimension.id)}
                                        label={`${dimension.code} — ${dimension.name}`}
                                        onChange={() => toggleDimension(dimension.id)}
                                    />
                                ))}
                            </div>

                            {selectedDimensionIds.size > 0 ? (
                                <button
                                    type="button"
                                    onClick={clearDimensions}
                                    className="mt-3 text-xs font-semibold text-[#0f766e] hover:underline"
                                >
                                    Pokaż wszystkie wymiary w tej kategorii
                                </button>
                            ) : null}
                        </>
                    )}
                </div>
                {viewMode === "cross" ? (
                    <div className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white/70 p-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <label
                                htmlFor="dimension-cross-x-axis"
                                className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]"
                            >
                                Oś X
                            </label>

                            <select
                                id="dimension-cross-x-axis"
                                value={xCategoryCode}
                                onChange={(event) => {
                                    const nextX = event.target.value;

                                    setXCategoryCode(nextX);

                                    if (nextX === yCategoryCode) {
                                        const nextY =
                                            categoryOptions.find((category) => category.code !== nextX)
                                                ?.code ?? "";

                                        setYCategoryCode(nextY);
                                    }
                                }}
                                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                            >
                                <option value="">Wybierz kategorię</option>

                                {categoryOptions.map((category) => (
                                    <option key={category.code} value={category.code}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label
                                htmlFor="dimension-cross-y-axis"
                                className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]"
                            >
                                Oś Y
                            </label>

                            <select
                                id="dimension-cross-y-axis"
                                value={yCategoryCode}
                                onChange={(event) => setYCategoryCode(event.target.value)}
                                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                            >
                                <option value="">Wybierz kategorię</option>

                                {categoryOptions.map((category) => (
                                    <option
                                        key={category.code}
                                        value={category.code}
                                        disabled={category.code === xCategoryCode}
                                    >
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {categoryOptions.length < 2 ? (
                            <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 md:col-span-2">
                                Do widoku przecięcia potrzebne są co najmniej dwie kategorie wymiarów w
                                wybranym zakresie.
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {viewMode === "cross" && (xValueOrder.length > 0 || yValueOrder.length > 0) ? (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => {
                                setXValueOrder([]);
                                setYValueOrder([]);
                            }}
                            className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#6b7280] transition hover:bg-white hover:text-[#171717]"
                        >
                            Przywróć kolejność alfabetyczną
                        </button>
                    </div>
                ) : null}
                {viewMode === "cross" ? (
                    !crossMatrix ||
                        crossMatrix.xValues.length === 0 ||
                        crossMatrix.yValues.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
                            Wybierz dwie różne kategorie, aby zobaczyć przecięcie X × Y.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
                            <div className="max-w-full overflow-x-auto">
                                <table
                                    className="border-separate border-spacing-0 text-sm"
                                    style={{
                                        minWidth: `${Math.max(
                                            760,
                                            180 + crossMatrix.xValues.length * 132,
                                        )}px`,
                                    }}
                                >
                                    <thead>
                                        <tr className="bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                                            <th className="sticky left-0 z-20 w-[180px] min-w-[180px] border-b border-black/10 bg-[#f7f7f8] px-4 py-3 text-left font-semibold">
                                                Y \ X
                                            </th>

                                            {crossMatrix.xValues.map((xValue, index) => {
                                                const key = getCrossValueKey(xValue);

                                                return (
                                                    <th
                                                        key={key}
                                                        className="group relative w-[132px] min-w-[132px] border-b border-black/10 px-3 py-3 text-center font-semibold"
                                                        title={xValue.name}
                                                    >
                                                        <span className="block truncate px-7 transition-opacity group-hover:opacity-35">
                                                            {xValue.name}
                                                        </span>

                                                        <AxisMoveButtons
                                                            canMovePrevious={index > 0}
                                                            canMoveNext={index < crossMatrix.xValues.length - 1}
                                                            previousLabel="←"
                                                            nextLabel="→"
                                                            onMovePrevious={() =>
                                                                setXValueOrder((currentOrder) =>
                                                                    moveInOrder({
                                                                        values: crossMatrix.xValues,
                                                                        currentOrder,
                                                                        key,
                                                                        direction: -1,
                                                                    }),
                                                                )
                                                            }
                                                            onMoveNext={() =>
                                                                setXValueOrder((currentOrder) =>
                                                                    moveInOrder({
                                                                        values: crossMatrix.xValues,
                                                                        currentOrder,
                                                                        key,
                                                                        direction: 1,
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {crossMatrix.cells.map((row, rowIndex) => (
                                            <tr
                                                key={`${row.yValue.categoryCode}:${row.yValue.code}`}
                                                className="border-b border-black/10"
                                            >
                                                <td
                                                    className="group sticky left-0 z-10 w-[180px] min-w-[180px] border-b border-black/10 bg-white px-4 py-4 text-left font-semibold text-[#171717]"
                                                    title={row.yValue.name}
                                                >
                                                    <div className="relative">
                                                        <span className="block truncate pr-16 transition-opacity group-hover:opacity-35">
                                                            {row.yValue.name}
                                                        </span>

                                                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                            <button
                                                                type="button"
                                                                aria-label="Przesuń wiersz w górę"
                                                                disabled={rowIndex === 0}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();

                                                                    setYValueOrder((currentOrder) =>
                                                                        moveInOrder({
                                                                            values: crossMatrix.yValues,
                                                                            currentOrder,
                                                                            key: getCrossValueKey(row.yValue),
                                                                            direction: -1,
                                                                        }),
                                                                    );
                                                                }}
                                                                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/95 text-xs font-semibold text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
                                                            >
                                                                ↑
                                                            </button>

                                                            <button
                                                                type="button"
                                                                aria-label="Przesuń wiersz w dół"
                                                                disabled={rowIndex === crossMatrix.yValues.length - 1}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();

                                                                    setYValueOrder((currentOrder) =>
                                                                        moveInOrder({
                                                                            values: crossMatrix.yValues,
                                                                            currentOrder,
                                                                            key: getCrossValueKey(row.yValue),
                                                                            direction: 1,
                                                                        }),
                                                                    );
                                                                }}
                                                                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/95 text-xs font-semibold text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
                                                            >
                                                                ↓
                                                            </button>
                                                        </span>
                                                    </div>
                                                </td>

                                                {row.values.map((cell) => (
                                                    <td
                                                        key={`${row.yValue.categoryCode}:${row.yValue.code}:${cell.xValue.categoryCode}:${cell.xValue.code}`}
                                                        className="w-[132px] min-w-[132px] border-b border-black/10 px-3 py-4 text-center align-middle text-[#171717]"
                                                        title={`Itemy: ${cell.itemsCount}; odpowiedzi: ${cell.answeredCount}/${cell.expectedCount}`}
                                                    >
                                                        <div className="text-sm font-semibold leading-none">
                                                            {formatValue(cell.value, metric)}
                                                        </div>

                                                        <div className="mt-2 text-[11px] leading-4 text-[#6b7280]">
                                                            <span className="block">itemy: {cell.itemsCount}</span>
                                                            <span className="block">
                                                                odp.: {cell.answeredCount}/{cell.expectedCount}
                                                            </span>
                                                        </div>
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : null}

                {viewMode === "list" ? (
                    <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[820px] text-left text-sm">
                                <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Kod</th>
                                        <th className="px-4 py-3 font-semibold">Wymiar</th>
                                        <th className="px-4 py-3 font-semibold">Kategorie</th>
                                        <th className="px-4 py-3 text-right font-semibold">
                                            {metric.label}
                                        </th>
                                        <th className="px-4 py-3 text-right font-semibold">
                                            Sesje
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {visibleAggregates.map((aggregate) => (
                                        <tr
                                            key={`${aggregate.questionnaireVersionId}:${aggregate.dimensionId}`}
                                            className="border-b border-black/10 last:border-0"
                                        >
                                            <td className="px-4 py-4 font-mono text-xs text-[#6b7280]">
                                                {aggregate.dimensionCode}
                                            </td>

                                            <td className="px-4 py-4 font-semibold text-[#171717]">
                                                {aggregate.dimensionName}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(aggregate.categories ?? []).map((category) => (
                                                        <span
                                                            key={`${category.categoryCode}:${category.valueCode}`}
                                                            className="rounded-full border border-black/10 bg-white/70 px-2 py-1 text-[11px] text-[#6b7280]"
                                                        >
                                                            {category.categoryName}:{" "}
                                                            <span className="font-semibold text-[#171717]">
                                                                {category.valueName}
                                                            </span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-right font-semibold text-[#171717]">
                                                {formatValue(getMetricValue(aggregate, metric.key), metric)}
                                            </td>

                                            <td className="px-4 py-4 text-right text-[#171717]">
                                                {aggregate.sessionsCount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : null}


            </div>
        </section>
    );
}


function AxisMoveButtons({
    canMovePrevious,
    canMoveNext,
    previousLabel,
    nextLabel,
    onMovePrevious,
    onMoveNext,
}: {
    canMovePrevious: boolean;
    canMoveNext: boolean;
    previousLabel: string;
    nextLabel: string;
    onMovePrevious: () => void;
    onMoveNext: () => void;
}) {
    return (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
                type="button"
                aria-label={previousLabel}
                disabled={!canMovePrevious}
                onClick={(event) => {
                    event.stopPropagation();
                    onMovePrevious();
                }}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/95 text-xs font-semibold text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
            >
                {previousLabel}
            </button>

            <button
                type="button"
                aria-label={nextLabel}
                disabled={!canMoveNext}
                onClick={(event) => {
                    event.stopPropagation();
                    onMoveNext();
                }}
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/95 text-xs font-semibold text-[#171717] shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
            >
                {nextLabel}
            </button>
        </span>
    );
}