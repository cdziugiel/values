"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    archiveQuestionnaireItemAction,
    archiveQuestionnairePageAction,
    assignItemDimensionAction,
    assignPageDimensionAction,
    createQuestionnaireItemAction,
    createQuestionnairePageAction,
    removeItemDimensionAction,
    removePageDimensionAction,
    reorderQuestionnaireItemAction,
    reorderQuestionnairePageAction,
    type QuestionnaireAdminActionState,
    updateQuestionnaireItemAction,
    updateQuestionnairePageAction,
} from "../api/questionnaire-admin.actions";
import type {
    QuestionnaireDimensionEditorItem,
    QuestionnaireItemEditorItem,
    QuestionnairePageEditorItem,
} from "../types/questionnaire-admin.types";
import {
    ChevronDown,
    ChevronRight,
    Edit3,
    Plus,
    Settings2,
} from "lucide-react";
import { QuestionnaireXlsxImportExportPanel } from "./questionnaire-xlsx-import-export-panel";

type QuestionnairePagesEditorProps = {
    versionId: string;
    pages: QuestionnairePageEditorItem[];
    dimensions: QuestionnaireDimensionEditorItem[];
    items: QuestionnaireItemEditorItem[];
};

const initialState: QuestionnaireAdminActionState = {
    status: "idle",
    message: "",
};

const itemTypes = [
    "likert",
    "true_false",
    "single_choice",
    "multiple_choice",
    "text",
    "number",
];


function getLikertValueLabels(responseConfig: unknown): Record<string, string> {
    const config = asRecord(responseConfig);
    const valueLabels = config.valueLabels;

    if (
        typeof valueLabels === "object" &&
        valueLabels !== null &&
        !Array.isArray(valueLabels)
    ) {
        return Object.fromEntries(
            Object.entries(valueLabels as Record<string, unknown>).map(
                ([key, value]) => [key, typeof value === "string" ? value : ""],
            ),
        );
    }

    return {};
}

function createLikertConfigValues({
    scaleMin,
    scaleMax,
    step,
}: {
    scaleMin: number;
    scaleMax: number;
    step: number;
}) {
    const values: number[] = [];

    if (step <= 0) {
        return [scaleMin, scaleMax];
    }

    for (let value = scaleMin; value <= scaleMax; value += step) {
        values.push(Number(value.toFixed(6)));
    }

    return values;
}

function DimensionChips({
    scores,
}: {
    scores: {
        id: string;
        dimensionCode: string;
        dimensionName: string;
        weight: string;
        reverseScored: boolean;
    }[];
}) {
    if (scores.length === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                Brak wymiarów
            </span>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {scores.map((score) => (
                <span
                    key={score.id}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                    title={`weight: ${score.weight}; reverse: ${score.reverseScored ? "tak" : "nie"
                        }`}
                >
                    <span className="font-medium text-foreground">
                        {score.dimensionCode}
                    </span>
                    <span>{score.dimensionName}</span>
                    {score.reverseScored ? (
                        <span className="rounded-full bg-background px-1.5 py-0.5 text-[10px]">
                            R
                        </span>
                    ) : null}
                </span>
            ))}
        </div>
    );
}
function asRecord(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }

    if (typeof value === "string") {
        const normalized = value.trim();

        if (!normalized) {
            return {};
        }

        try {
            const parsed = JSON.parse(normalized);

            if (
                typeof parsed === "object" &&
                parsed !== null &&
                !Array.isArray(parsed)
            ) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            return {};
        }
    }

    return {};
}

function getOptionLabel(option: unknown) {
    if (
        typeof option === "object" &&
        option !== null &&
        "label" in option &&
        typeof option.label === "string"
    ) {
        return option.label;
    }

    return "";
}

function getOptionValue(option: unknown) {
    if (
        typeof option === "object" &&
        option !== null &&
        "value" in option
    ) {
        return String(option.value);
    }

    return "";
}

function choiceOptionsToText(options: unknown) {
    if (!Array.isArray(options)) {
        return "";
    }

    return options
        .map((option) => {
            const value = getOptionValue(option);
            const label = getOptionLabel(option);

            if (!value && !label) {
                return "";
            }

            if (value.startsWith("OPTION_")) {
                return label;
            }

            return `${value} | ${label}`;
        })
        .filter(Boolean)
        .join("\n");
}

function getConfigString(
    responseConfig: unknown,
    key: string,
    fallback: string,
) {
    const config = asRecord(responseConfig);
    const value = config[key];

    if (typeof value === "string") {
        return value;
    }

    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }

    return fallback;
}

function getConfigNumber(
    responseConfig: unknown,
    key: string,
    fallback: number | "",
) {
    const config = asRecord(responseConfig);
    const value = config[key];

    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    return fallback;
}

function getConfigBoolean(
    responseConfig: unknown,
    key: string,
    fallback: boolean,
) {
    const config = asRecord(responseConfig);
    const value = config[key];

    if (typeof value === "boolean") {
        return value;
    }

    if (typeof value === "string") {
        if (value === "true") return true;
        if (value === "false") return false;
    }

    return fallback;
}

function getLikertDisplay(responseConfig: unknown) {
    const value = getConfigString(responseConfig, "display", "buttons");

    if (value === "buttons" || value === "radio" || value === "slider") {
        return value;
    }

    return "buttons";
}



const LIKERT_PRESETS = {
    custom: {
        label: "Własna skala",
        scaleMin: -3,
        scaleMax: 3,
        step: 1,
        scaleMinLabel: "Zdecydowanie nie",
        scaleMaxLabel: "Zdecydowanie tak",
        valueLabels: {},
    },

    agreement_7_short: {
        label: "Likert 7: Zdecydowanie nie → Zdecydowanie tak",
        scaleMin: -3,
        scaleMax: 3,
        step: 1,
        scaleMinLabel: "Zdecydowanie nie",
        scaleMaxLabel: "Zdecydowanie tak",
        valueLabels: {
            "-3": "Zdecydowanie nie",
            "-2": "Nie",
            "-1": "Raczej nie",
            "0": "Trudno powiedzieć",
            "1": "Raczej tak",
            "2": "Tak",
            "3": "Zdecydowanie tak",
        },
    },

    agreement_7_full: {
        label: "Likert 7: Nie zgadzam się → Zgadzam się",
        scaleMin: -3,
        scaleMax: 3,
        step: 1,
        scaleMinLabel: "Zdecydowanie nie zgadzam się",
        scaleMaxLabel: "Zdecydowanie się zgadzam",
        valueLabels: {
            "-3": "Zdecydowanie nie zgadzam się",
            "-2": "Nie zgadzam się",
            "-1": "Raczej się nie zgadzam",
            "0": "Trudno powiedzieć",
            "1": "Raczej się zgadzam",
            "2": "Zgadzam się",
            "3": "Zdecydowanie się zgadzam",
        },
    },

    frequency_5: {
        label: "Częstotliwość 5: Prawie nigdy → Prawie zawsze",
        scaleMin: 1,
        scaleMax: 5,
        step: 1,
        scaleMinLabel: "Prawie nigdy",
        scaleMaxLabel: "Prawie zawsze",
        valueLabels: {
            "1": "Prawie nigdy",
            "2": "Rzadko",
            "3": "Trudno powiedzieć",
            "4": "Czasami",
            "5": "Prawie zawsze",
        },
    },
} as const;

type LikertPresetKey = keyof typeof LIKERT_PRESETS;


function presetValueLabelsToText(presetKey: LikertPresetKey) {
    const preset = LIKERT_PRESETS[presetKey];

    return Object.entries(preset.valueLabels)
        .map(([value, label]) => `${value} | ${label}`)
        .join("\n");
}

function parseLikertPresetKey(value: string): LikertPresetKey {
    if (
        value === "agreement_7_short" ||
        value === "agreement_7_full" ||
        value === "frequency_5" ||
        value === "custom"
    ) {
        return value;
    }

    return "custom";
}

function getLikertPresetKey(responseConfig: unknown): LikertPresetKey {
    const config = asRecord(responseConfig);

    const preset =
        config.preset ??
        config.likertPreset ??
        config.likert_preset;

    if (
        preset === "agreement_7_short" ||
        preset === "agreement_7_full" ||
        preset === "frequency_5" ||
        preset === "custom"
    ) {
        return preset;
    }

    return "agreement_7_short";
}
function likertValueLabelsToText(responseConfig: unknown) {
    const config = asRecord(responseConfig);
    const labels = asRecord(config.valueLabels);

    return Object.entries(labels)
        .map(([value, label]) => {
            if (typeof label !== "string") return "";
            return `${value} | ${label}`;
        })
        .filter(Boolean)
        .join("\n");
}

function valueLabelsMapToText(labels: Record<string, string>) {
    return Object.entries(labels)
        .map(([value, label]) => {
            const normalizedLabel = label.trim();

            if (!normalizedLabel) {
                return "";
            }

            return `${value} | ${normalizedLabel}`;
        })
        .filter(Boolean)
        .join("\n");
}

function textToValueLabelsMap(value: string) {
    const result: Record<string, string> = {};

    value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const separatorIndex = line.indexOf("|");

            if (separatorIndex < 0) {
                return;
            }

            const rawValue = line.slice(0, separatorIndex).trim();
            const label = line.slice(separatorIndex + 1).trim();

            if (!rawValue || !label) {
                return;
            }

            result[rawValue] = label;
        });

    return result;
}

function normalizeValueLabelsForScale({
    labels,
    values,
}: {
    labels: Record<string, string>;
    values: number[];
}) {
    const next: Record<string, string> = {};

    for (const value of values) {
        const key = String(value);
        next[key] = labels[key] ?? "";
    }

    return next;
}

function LikertPresetFields({
    defaultResponseConfig,
    defaultScaleMin,
    defaultScaleMax,
    defaultScaleMinLabel,
    defaultScaleMaxLabel,
}: {
    defaultResponseConfig?: unknown;
    defaultScaleMin?: number | null;
    defaultScaleMax?: number | null;
    defaultScaleMinLabel?: string | null;
    defaultScaleMaxLabel?: string | null;
}) {
    const initialPresetKey = getLikertPresetKey(defaultResponseConfig);
    console.log("LIKERT DEBUG", {
        defaultResponseConfig,
        parsedConfig: asRecord(defaultResponseConfig),
        initialPresetKey,
    });
    const initialPreset = LIKERT_PRESETS[initialPresetKey];

    const initialDisplay = getLikertDisplay(defaultResponseConfig);

    const initialStep = getConfigNumber(
        defaultResponseConfig,
        "step",
        initialPreset.step,
    );

    const initialValueLabels = getLikertValueLabels(defaultResponseConfig);

    const initialShowValueLabels = getConfigBoolean(
        defaultResponseConfig,
        "showValueLabels",
        initialPresetKey !== "agreement_7_short",
    );

    const [presetKey, setPresetKey] = useState<LikertPresetKey>(initialPresetKey);

    const [scaleMin, setScaleMin] = useState<number>(
        defaultScaleMin ?? initialPreset.scaleMin,
    );

    const [scaleMax, setScaleMax] = useState<number>(
        defaultScaleMax ?? initialPreset.scaleMax,
    );

    const [step, setStep] = useState<number>(
        typeof initialStep === "number" ? initialStep : initialPreset.step,
    );

    const [scaleMinLabel, setScaleMinLabel] = useState(
        defaultScaleMinLabel ?? initialPreset.scaleMinLabel,
    );

    const [scaleMaxLabel, setScaleMaxLabel] = useState(
        defaultScaleMaxLabel ?? initialPreset.scaleMaxLabel,
    );

    const [showValueLabels, setShowValueLabels] = useState(
        initialShowValueLabels,
    );

    const [isEditingLabels, setIsEditingLabels] = useState(false);

    const currentValues = createLikertConfigValues({
        scaleMin,
        scaleMax,
        step,
    });

    const [valueLabels, setValueLabels] = useState<Record<string, string>>(() => {
        const presetLabels = LIKERT_PRESETS[initialPresetKey].valueLabels;

        const sourceLabels =
            Object.keys(initialValueLabels).length > 0
                ? initialValueLabels
                : presetLabels;

        return normalizeValueLabelsForScale({
            labels: sourceLabels,
            values: createLikertConfigValues({
                scaleMin: defaultScaleMin ?? initialPreset.scaleMin,
                scaleMax: defaultScaleMax ?? initialPreset.scaleMax,
                step: typeof initialStep === "number" ? initialStep : initialPreset.step,
            }),
        });
    });


    const configSyncKey = JSON.stringify({
        responseConfig: asRecord(defaultResponseConfig),
        defaultScaleMin,
        defaultScaleMax,
        defaultScaleMinLabel,
        defaultScaleMaxLabel,
    });

    useEffect(() => {
        const nextPresetKey = getLikertPresetKey(defaultResponseConfig);
        const nextPreset = LIKERT_PRESETS[nextPresetKey];

        const nextStepRaw = getConfigNumber(
            defaultResponseConfig,
            "step",
            nextPreset.step,
        );

        const nextStep =
            typeof nextStepRaw === "number" ? nextStepRaw : nextPreset.step;

        const nextScaleMin = defaultScaleMin ?? nextPreset.scaleMin;
        const nextScaleMax = defaultScaleMax ?? nextPreset.scaleMax;
        const nextScaleMinLabel = defaultScaleMinLabel ?? nextPreset.scaleMinLabel;
        const nextScaleMaxLabel = defaultScaleMaxLabel ?? nextPreset.scaleMaxLabel;

        const nextShowValueLabels = getConfigBoolean(
            defaultResponseConfig,
            "showValueLabels",
            nextPresetKey !== "agreement_7_short",
        );

        const configLabels = getLikertValueLabels(defaultResponseConfig);
        const sourceLabels =
            Object.keys(configLabels).length > 0
                ? configLabels
                : nextPreset.valueLabels;

        const nextValues = createLikertConfigValues({
            scaleMin: nextScaleMin,
            scaleMax: nextScaleMax,
            step: nextStep,
        });

        setPresetKey(nextPresetKey);
        setScaleMin(nextScaleMin);
        setScaleMax(nextScaleMax);
        setStep(nextStep);
        setScaleMinLabel(nextScaleMinLabel);
        setScaleMaxLabel(nextScaleMaxLabel);
        setShowValueLabels(nextShowValueLabels);
        setValueLabels(
            normalizeValueLabelsForScale({
                labels: sourceLabels,
                values: nextValues,
            }),
        );
    }, [configSyncKey]);

    function updateScale(next: {
        scaleMin?: number;
        scaleMax?: number;
        step?: number;
    }) {
        const nextScaleMin = next.scaleMin ?? scaleMin;
        const nextScaleMax = next.scaleMax ?? scaleMax;
        const nextStep = next.step ?? step;

        const nextValues = createLikertConfigValues({
            scaleMin: nextScaleMin,
            scaleMax: nextScaleMax,
            step: nextStep,
        });

        setValueLabels((previous) =>
            normalizeValueLabelsForScale({
                labels: previous,
                values: nextValues,
            }),
        );
    }

    function handlePresetChange(nextValue: string) {
        const nextPresetKey = parseLikertPresetKey(nextValue);
        const nextPreset = LIKERT_PRESETS[nextPresetKey];

        const nextScaleMin = nextPreset.scaleMin;
        const nextScaleMax = nextPreset.scaleMax;
        const nextStep = nextPreset.step;

        const nextValues = createLikertConfigValues({
            scaleMin: nextScaleMin,
            scaleMax: nextScaleMax,
            step: nextStep,
        });

        setPresetKey(nextPresetKey);
        setScaleMin(nextScaleMin);
        setScaleMax(nextScaleMax);
        setStep(nextStep);
        setScaleMinLabel(nextPreset.scaleMinLabel);
        setScaleMaxLabel(nextPreset.scaleMaxLabel);

        setValueLabels(
            normalizeValueLabelsForScale({
                labels: nextPreset.valueLabels,
                values: nextValues,
            }),
        );

    }

    function updateValueLabel(value: number, label: string) {
        setValueLabels((previous) => ({
            ...previous,
            [String(value)]: label,
        }));
    }

    return (
        <div className="space-y-4 rounded-xl border p-3">
            <div>
                <div className="text-sm font-medium">Konfiguracja skali Likerta</div>
                <p className="mt-1 text-xs text-muted-foreground">
                    Wybierz gotowy preset albo ustaw własną skalę i etykiety.
                </p>
            </div>

            <input
                type="hidden"
                name="likertValueLabelsText"
                value={valueLabelsMapToText(valueLabels)}
            />

            <div className="grid gap-3 md:grid-cols-2">
                <select
                    name="likertPreset"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={presetKey}
                    onChange={(event) => handlePresetChange(event.target.value)}
                >
                    {Object.entries(LIKERT_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>
                            {preset.label}
                        </option>
                    ))}
                </select>

                <select
                    name="likertDisplay"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    defaultValue={initialDisplay}
                >
                    <option value="buttons">Przyciski / kropki</option>
                    <option value="radio">Radio</option>
                    <option value="slider">Suwak</option>
                </select>
            </div>

            <div className="grid gap-3 md:grid-cols-5">
                <Input
                    name="scaleMin"
                    type="number"
                    value={scaleMin}
                    onChange={(event) => {
                        const nextValue = Number(event.target.value);

                        if (!Number.isFinite(nextValue)) {
                            return;
                        }

                        setPresetKey("custom");
                        setScaleMin(nextValue);
                        updateScale({ scaleMin: nextValue });
                    }}
                    placeholder="Minimum"
                />

                <Input
                    name="scaleMax"
                    type="number"
                    value={scaleMax}
                    onChange={(event) => {
                        const nextValue = Number(event.target.value);

                        if (!Number.isFinite(nextValue)) {
                            return;
                        }

                        setScaleMax(nextValue);
                        setPresetKey("custom");
                        updateScale({ scaleMax: nextValue });
                    }}
                    placeholder="Maksimum"
                />

                <Input
                    name="likertStep"
                    type="number"
                    step="0.1"
                    value={step}
                    onChange={(event) => {
                        const nextValue = Number(event.target.value);

                        if (!Number.isFinite(nextValue) || nextValue <= 0) {
                            return;
                        }

                        setStep(nextValue);
                        setPresetKey("custom");
                        updateScale({ step: nextValue });
                    }}
                    placeholder="Krok"
                />

                <Input
                    name="scaleMinLabel"
                    value={scaleMinLabel}
                    onChange={(event) => setScaleMinLabel(event.target.value)}
                    placeholder="Etykieta minimum"
                />

                <Input
                    name="scaleMaxLabel"
                    value={scaleMaxLabel}
                    onChange={(event) => setScaleMaxLabel(event.target.value)}
                    placeholder="Etykieta maksimum"
                />
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            name="showValueLabels"
                            checked={showValueLabels}
                            onChange={(event) => setShowValueLabels(event.target.checked)}
                        />
                        Pokaż etykietę przy każdej odpowiedzi
                    </label>

                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingLabels((value) => !value)}
                    >
                        {isEditingLabels ? "Ukryj edycję etykiet" : "Edytuj etykiety"}
                    </Button>
                </div>

                {isEditingLabels ? (
                    <div className="grid gap-2 md:grid-cols-2">
                        {currentValues.map((value) => (
                            <div
                                key={value}
                                className="grid grid-cols-[72px_1fr] items-center gap-2"
                            >
                                <div className="rounded-md border bg-background px-2 py-2 text-center font-mono text-xs">
                                    {value}
                                </div>

                                <Input
                                    value={valueLabels[String(value)] ?? ""}
                                    onChange={(event) =>
                                        updateValueLabel(value, event.target.value)
                                    }
                                    placeholder={`Etykieta dla ${value}`}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        Etykiety wartości są zapisane w konfiguracji. Możesz je edytować
                        tylko po rozwinięciu panelu edycji. Checkbox powyżej decyduje, czy
                        respondent zobaczy je przy odpowiedziach.
                    </p>
                )}
            </div>
        </div>
    );
}

function ResponseTypeFields({
    type,
    defaultOptions,
    defaultResponseConfig,
    defaultScaleMin,
    defaultScaleMax,
    defaultScaleMinLabel,
    defaultScaleMaxLabel,
}: {
    type: string;
    defaultOptions?: unknown;
    defaultResponseConfig?: unknown;
    defaultScaleMin?: number | null;
    defaultScaleMax?: number | null;
    defaultScaleMinLabel?: string | null;
    defaultScaleMaxLabel?: string | null;
}) {
    if (type === "likert") {
        return (
            <LikertPresetFields
                defaultResponseConfig={defaultResponseConfig}
                defaultScaleMin={defaultScaleMin}
                defaultScaleMax={defaultScaleMax}
                defaultScaleMinLabel={defaultScaleMinLabel}
                defaultScaleMaxLabel={defaultScaleMaxLabel}
            />
        );
    }

    if (type === "true_false") {
        const trueLabel = Array.isArray(defaultOptions)
            ? getOptionLabel(defaultOptions[0]) || "Prawda"
            : "Prawda";

        const falseLabel = Array.isArray(defaultOptions)
            ? getOptionLabel(defaultOptions[1]) || "Fałsz"
            : "Fałsz";

        return (
            <div className="space-y-3 rounded-xl border p-3">
                <div className="text-sm font-medium">Odpowiedzi prawda/fałsz</div>

                <div className="grid gap-3 md:grid-cols-2">
                    <Input
                        name="trueLabel"
                        defaultValue={trueLabel}
                        placeholder="Prawda"
                    />

                    <Input
                        name="falseLabel"
                        defaultValue={falseLabel}
                        placeholder="Fałsz"
                    />
                </div>
            </div>
        );
    }

    if (type === "single_choice" || type === "multiple_choice") {
        return (
            <div className="space-y-3 rounded-xl border p-3">
                <div className="text-sm font-medium">Opcje wyboru</div>

                <p className="text-xs text-muted-foreground">
                    Wpisz każdą odpowiedź w osobnej linii. Możesz użyć formatu:
                    <span className="font-mono"> wartość | etykieta</span>. Jeśli
                    wpiszesz samą etykietę, system sam nada wartość techniczną.
                </p>

                <textarea
                    name="choiceOptionsText"
                    className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    defaultValue={choiceOptionsToText(defaultOptions)}
                    placeholder={"Atmosferę\nJasne zasady\nMożliwość decydowania"}
                />
            </div>
        );
    }

    if (type === "text") {
        const multiline = getConfigBoolean(defaultResponseConfig, "multiline", true);
        const maxLength = getConfigNumber(defaultResponseConfig, "maxLength", 1000);

        return (
            <div className="space-y-3 rounded-xl border p-3">
                <div className="text-sm font-medium">
                    Konfiguracja odpowiedzi tekstowej
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="textMultiline"
                        defaultChecked={multiline}
                    />
                    Wielolinijkowa odpowiedź
                </label>

                <Input
                    name="textMaxLength"
                    type="number"
                    defaultValue={String(maxLength)}
                    placeholder="Maksymalna liczba znaków"
                />
            </div>
        );
    }

    if (type === "number") {
        const min = getConfigNumber(defaultResponseConfig, "min", "");
        const max = getConfigNumber(defaultResponseConfig, "max", "");
        const step = getConfigNumber(defaultResponseConfig, "step", 1);

        return (
            <div className="space-y-3 rounded-xl border p-3">
                <div className="text-sm font-medium">
                    Konfiguracja odpowiedzi liczbowej
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        name="numberMin"
                        type="number"
                        defaultValue={String(min)}
                        placeholder="Minimum"
                    />

                    <Input
                        name="numberMax"
                        type="number"
                        defaultValue={String(max)}
                        placeholder="Maksimum"
                    />

                    <Input
                        name="numberStep"
                        type="number"
                        step="0.1"
                        defaultValue={String(step)}
                        placeholder="Krok"
                    />
                </div>
            </div>
        );
    }

    return null;
}
function QuestionnaireItemEditForm({
    versionId,
    item,
    pages,
    onCancel,
}: {
    versionId: string;
    item: QuestionnaireItemEditorItem;
    pages: QuestionnairePageEditorItem[];
    onCancel: () => void;
}) {
    const [state, formAction, isPending] = useActionState(
        updateQuestionnaireItemAction,
        initialState,
    );

    const [itemType, setItemType] = useState(item.type);

    return (
        <form action={formAction} className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="itemId" value={item.id} />

            <div className="grid gap-3 md:grid-cols-2">
                <select
                    name="pageId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    defaultValue={item.questionnairePageId ?? ""}
                >
                    <option value="">Brak strony</option>
                    {pages.map((page) => (
                        <option key={page.id} value={page.id}>
                            {page.title}
                        </option>
                    ))}
                </select>

                <select
                    name="type"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={itemType}
                    onChange={(event) => setItemType(event.target.value)}
                >
                    {itemTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </div>

            <textarea
                name="text"
                required
                defaultValue={item.text}
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />

            <Input
                name="helpText"
                placeholder="Pomoc / doprecyzowanie"
                defaultValue={item.helpText ?? ""}
            />

            <ResponseTypeFields
                key={`${item.id}:${itemType}`}
                type={itemType}
                defaultOptions={item.options}
                defaultResponseConfig={item.responseConfig}
                defaultScaleMin={item.scaleMin}
                defaultScaleMax={item.scaleMax}
                defaultScaleMinLabel={item.scaleMinLabel}
                defaultScaleMaxLabel={item.scaleMaxLabel}
            />

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="required" defaultChecked={item.required} />
                Wymagane
            </label>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-sm text-green-700"
                            : "text-sm text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Zapisywanie..." : "Zapisz item"}
                </Button>

                <Button type="button" variant="outline" onClick={onCancel}>
                    Anuluj
                </Button>
            </div>
        </form>
    );
}

function QuestionnaireItemArchiveForm({
    versionId,
    item,
}: {
    versionId: string;
    item: QuestionnaireItemEditorItem;
}) {
    const [state, formAction, isPending] = useActionState(
        archiveQuestionnaireItemAction,
        initialState,
    );

    return (
        <form
            action={formAction}
            onSubmit={(event) => {
                const confirmed = window.confirm(
                    `Usunąć item "${item.text}"? To ukryje go w edytorze i w badaniach opartych o tę wersję.`,
                );

                if (!confirmed) {
                    event.preventDefault();
                }
            }}
            className="space-y-2"
        >
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="itemId" value={item.id} />

            <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                {isPending ? "Usuwanie..." : "Usuń"}
            </Button>

            {state.status === "error" ? (
                <p className="text-xs text-destructive">{state.message}</p>
            ) : null}
        </form>
    );
}

function RemoveItemDimensionButton({
    versionId,
    itemDimensionScoreId,
}: {
    versionId: string;
    itemDimensionScoreId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        removeItemDimensionAction,
        initialState,
    );

    return (
        <div className="space-y-1">
            <form action={formAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input
                    type="hidden"
                    name="itemDimensionScoreId"
                    value={itemDimensionScoreId}
                />

                <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                    {isPending ? "Usuwanie..." : "Usuń"}
                </Button>
            </form>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-xs text-green-700"
                            : "text-xs text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}
        </div>
    );
}

function AssignItemDimensionForm({
    versionId,
    itemId,
    availableDimensions,
}: {
    versionId: string;
    itemId: string;
    availableDimensions: QuestionnaireDimensionEditorItem[];
}) {
    const [state, formAction, isPending] = useActionState(
        assignItemDimensionAction,
        initialState,
    );

    if (availableDimensions.length === 0) {
        return (
            <p className="mt-3 text-sm text-muted-foreground">
                Wszystkie dostępne wymiary są już przypisane do tego itemu.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="itemId" value={itemId} />

                <select
                    name="dimensionId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                    {availableDimensions.map((dimension) => (
                        <option key={dimension.id} value={dimension.id}>
                            {dimension.name} ({dimension.code})
                        </option>
                    ))}
                </select>

                <Input
                    name="weight"
                    type="number"
                    step="0.0001"
                    defaultValue="1"
                    className="w-28"
                />

                <label className="flex h-10 items-center gap-2 text-sm">
                    <input type="checkbox" name="reverseScored" value="true" />
                    Odwrócony
                </label>

                <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? "Dodawanie..." : "Dodaj wymiar"}
                </Button>
            </form>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-xs text-green-700"
                            : "text-xs text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}
        </div>
    );
}
function ReorderQuestionnaireItemButtons({
    versionId,
    itemId,
}: {
    versionId: string;
    itemId: string;
}) {
    const [_stateUp, upAction, isUpPending] = useActionState(
        reorderQuestionnaireItemAction,
        initialState,
    );

    const [_stateDown, downAction, isDownPending] = useActionState(
        reorderQuestionnaireItemAction,
        initialState,
    );

    return (
        <div className="flex gap-1">
            <form action={upAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="itemId" value={itemId} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" size="sm" variant="outline" disabled={isUpPending}>
                    ↑
                </Button>
            </form>

            <form action={downAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="itemId" value={itemId} />
                <input type="hidden" name="direction" value="down" />
                <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={isDownPending}
                >
                    ↓
                </Button>
            </form>
        </div>
    );
}


function CreateItemForPageForm({
    versionId,
    pageId,
    onCancel,
}: {
    versionId: string;
    pageId: string | null;
    onCancel: () => void;
}) {
    const [newItemType, setNewItemType] = useState("likert");

    const [state, formAction, isPending] = useActionState(
        createQuestionnaireItemAction,
        initialState,
    );

    return (
        <form action={formAction} className="space-y-4 rounded-xl border bg-background p-4">
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="pageId" value={pageId ?? ""} />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-sm font-medium">Nowy item</div>
                    <p className="text-xs text-muted-foreground">
                        Item zostanie dodany bezpośrednio do tej strony.
                    </p>
                </div>

                <select
                    name="type"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={newItemType}
                    onChange={(event) => setNewItemType(event.target.value)}
                >
                    {itemTypes.map((type) => (
                        <option key={type} value={type}>
                            {type}
                        </option>
                    ))}
                </select>
            </div>

            <textarea
                name="text"
                required
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder='Treść itemu, np. "W pracy najbardziej cenię..."'
            />

            <Input name="helpText" placeholder="Pomoc / doprecyzowanie" />

            <ResponseTypeFields key={`create:${pageId}:${newItemType}`} type={newItemType} />

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="required" defaultChecked />
                Wymagane
            </label>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-sm text-green-700"
                            : "text-sm text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Dodawanie..." : "Dodaj item"}
                </Button>

                <Button type="button" variant="outline" onClick={onCancel}>
                    Anuluj
                </Button>
            </div>
        </form>
    );
}


function AssignPageDimensionForm({
    versionId,
    pageId,
    availableDimensions,
}: {
    versionId: string;
    pageId: string;
    availableDimensions: QuestionnaireDimensionEditorItem[];
}) {
    const [state, formAction, isPending] = useActionState(
        assignPageDimensionAction,
        initialState,
    );

    if (availableDimensions.length === 0) {
        return (
            <p className="mt-3 text-sm text-muted-foreground">
                Wszystkie dostępne wymiary są już przypisane do tej strony.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={pageId} />

                <select
                    name="dimensionId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                    {availableDimensions.map((dimension) => (
                        <option key={dimension.id} value={dimension.id}>
                            {dimension.name} ({dimension.code})
                        </option>
                    ))}
                </select>

                <Input
                    name="weight"
                    type="number"
                    step="0.0001"
                    defaultValue="1"
                    className="w-28"
                />

                <label className="flex h-10 items-center gap-2 text-sm">
                    <input type="checkbox" name="reverseScored" value="true" />
                    Odwrócony
                </label>

                <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? "Dodawanie..." : "Dodaj wymiar do strony"}
                </Button>
            </form>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-xs text-green-700"
                            : "text-xs text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}
        </div>
    );
}

function RemovePageDimensionButton({
    versionId,
    pageDimensionScoreId,
}: {
    versionId: string;
    pageDimensionScoreId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        removePageDimensionAction,
        initialState,
    );

    return (
        <div className="space-y-1">
            <form action={formAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input
                    type="hidden"
                    name="pageDimensionScoreId"
                    value={pageDimensionScoreId}
                />

                <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                    {isPending ? "Usuwanie..." : "Usuń"}
                </Button>
            </form>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-xs text-green-700"
                            : "text-xs text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}
        </div>
    );
}

function ReorderQuestionnairePageButtons({
    versionId,
    pageId,
}: {
    versionId: string;
    pageId: string;
}) {
    const [_stateUp, upAction, isUpPending] = useActionState(
        reorderQuestionnairePageAction,
        initialState,
    );

    const [_stateDown, downAction, isDownPending] = useActionState(
        reorderQuestionnairePageAction,
        initialState,
    );

    return (
        <div className="flex gap-1">
            <form action={upAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={pageId} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" size="sm" variant="outline" disabled={isUpPending}>
                    ↑
                </Button>
            </form>

            <form action={downAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={pageId} />
                <input type="hidden" name="direction" value="down" />
                <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={isDownPending}
                >
                    ↓
                </Button>
            </form>
        </div>
    );
}

function EditQuestionnairePageForm({
    versionId,
    page,
    onCancel,
}: {
    versionId: string;
    page: QuestionnairePageEditorItem;
    onCancel: () => void;
}) {
    const [state, formAction, isPending] = useActionState(
        updateQuestionnairePageAction,
        initialState,
    );

    return (
        <form action={formAction} className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="pageId" value={page.id} />

            <div className="grid gap-3 md:grid-cols-4">
                <Input name="title" defaultValue={page.title} required />
                <Input
                    name="description"
                    defaultValue={page.description ?? ""}
                    placeholder="Opis / instrukcja"
                />
            </div>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-sm text-green-700"
                            : "text-sm text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Zapisywanie..." : "Zapisz stronę"}
                </Button>

                <Button type="button" variant="outline" onClick={onCancel}>
                    Anuluj
                </Button>
            </div>
        </form>
    );
}

function ArchiveQuestionnairePageButton({
    versionId,
    page,
}: {
    versionId: string;
    page: QuestionnairePageEditorItem;
}) {
    const [state, formAction, isPending] = useActionState(
        archiveQuestionnairePageAction,
        initialState,
    );

    return (
        <div className="space-y-1">
            <form
                action={formAction}
                onSubmit={(event) => {
                    const confirmed = window.confirm(
                        `Usunąć stronę "${page.title}"? Itemy z tej strony nie zostaną usunięte, ale zostaną odpięte od strony.`,
                    );

                    if (!confirmed) {
                        event.preventDefault();
                    }
                }}
            >
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={page.id} />

                <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                    {isPending ? "Usuwanie..." : "Usuń stronę"}
                </Button>
            </form>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-xs text-green-700"
                            : "text-xs text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}
        </div>
    );
}

function getLikertPresetLabel(responseConfig: unknown) {
    const presetKey = getLikertPresetKey(responseConfig);
    return LIKERT_PRESETS[presetKey]?.label ?? "Własna skala";
}

export function QuestionnairePagesEditor({
    versionId,
    pages,
    dimensions,
    items,
}: QuestionnairePagesEditorProps) {
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [addingDimensionPageId, setAddingDimensionPageId] = useState<string | null>(
        null,
    );

    const [state, formAction, isPending] = useActionState(
        createQuestionnairePageAction,
        initialState,
    );

    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [addingItemPageId, setAddingItemPageId] = useState<string | null>(null);
    const [addingDimensionItemId, setAddingDimensionItemId] = useState<string | null>(
        null,
    );
    const [openPageIds, setOpenPageIds] = useState<Set<string>>(
        () => new Set(pages.length > 0 ? [pages[0].id] : []),
    );

    const [openItemIds, setOpenItemIds] = useState<Set<string>>(() => new Set());

    const [editingPageScoringId, setEditingPageScoringId] = useState<string | null>(
        null,
    );

    const [editingItemScoringId, setEditingItemScoringId] = useState<string | null>(
        null,
    );
    const [isUnpagedOpen, setIsUnpagedOpen] = useState(false);

    const itemsByPageKey = items.reduce<Record<string, QuestionnaireItemEditorItem[]>>(
        (acc, item) => {
            const key = item.questionnairePageId ?? "__NO_PAGE__";

            acc[key] ??= [];
            acc[key].push(item);

            return acc;
        },
        {},
    );

    for (const key of Object.keys(itemsByPageKey)) {
        itemsByPageKey[key].sort(
            (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
        );
    }

    const unpagedItems = itemsByPageKey.__NO_PAGE__ ?? [];

    function togglePage(pageId: string) {
        setOpenPageIds((previous) => {
            const next = new Set(previous);

            if (next.has(pageId)) {
                next.delete(pageId);
            } else {
                next.add(pageId);
            }

            return next;
        });
    }

    function toggleItem(itemId: string) {
        setOpenItemIds((previous) => {
            const next = new Set(previous);

            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }

            return next;
        });
    }

    function renderItem(item: QuestionnaireItemEditorItem) {
        const isEditing = editingItemId === item.id;
        const isOpen = openItemIds.has(item.id);
        const isScoringEditing = editingItemScoringId === item.id;

        const assignedDimensionIds = new Set(
            item.dimensionScores.map((score) => score.questionnaireDimensionId),
        );

        const availableDimensions = dimensions.filter(
            (dimension) => !assignedDimensionIds.has(dimension.id),
        );

        return (
            <div key={item.id} className="overflow-hidden rounded-xl border bg-background">
                <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {isOpen ? (
                                <ChevronDown size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                            ) : (
                                <ChevronRight size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                            )}

                            <span className="line-clamp-2 font-medium leading-relaxed">
                                {item.text}
                            </span>

                            <span className="rounded-md border px-2 py-1 text-xs">
                                {item.type}
                            </span>

                            {item.required ? (
                                <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                                    wymagane
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{item.code}</span>
                            <span>kolejność: {item.orderIndex}</span>
                            <span>
                                skala: {item.scaleMin ?? "—"}–{item.scaleMax ?? "—"}
                            </span>
                            <span>
                                typ: {item.type}
                            </span>

                            {item.type === "likert" ? (
                                <span>
                                    preset: {getLikertPresetLabel(item.responseConfig)}
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-2">
                            <DimensionChips scores={item.dimensionScores} />
                        </div>
                    </div>

                    <div className="shrink-0 text-xs text-muted-foreground">
                        {isOpen ? "Zwiń" : "Rozwiń"}
                    </div>
                </button>

                {isOpen ? (
                    <div className="space-y-4 border-t bg-muted/10 p-4">
                        {isEditing ? (
                            <QuestionnaireItemEditForm
                                versionId={versionId}
                                item={item}
                                pages={pages}
                                onCancel={() => setEditingItemId(null)}
                            />
                        ) : (
                            <>
                                {item.helpText ? (
                                    <div className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">
                                        {item.helpText}
                                    </div>
                                ) : null}

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() => setEditingItemId(item.id)}
                                    >
                                        <Edit3 size={14} />
                                        Edytuj item
                                    </Button>

                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={() =>
                                            setEditingItemScoringId(
                                                isScoringEditing ? null : item.id,
                                            )
                                        }
                                    >
                                        <Settings2 size={14} />
                                        Edytuj scoring
                                    </Button>

                                    <ReorderQuestionnaireItemButtons
                                        versionId={versionId}
                                        itemId={item.id}
                                    />

                                    <QuestionnaireItemArchiveForm
                                        versionId={versionId}
                                        item={item}
                                    />
                                </div>

                                {isScoringEditing ? (
                                    <div className="rounded-lg border bg-background p-3">
                                        <div className="mb-2 text-sm font-medium">
                                            Wymiary itemu
                                        </div>

                                        {item.dimensionScores.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                Brak przypisanych wymiarów.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {item.dimensionScores.map((score) => (
                                                    <div
                                                        key={score.id}
                                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                                                    >
                                                        <div>
                                                            <span className="font-medium">
                                                                {score.dimensionName}
                                                            </span>{" "}
                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                {score.dimensionCode}
                                                            </span>
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                weight: {score.weight}; reverse:{" "}
                                                                {score.reverseScored ? "tak" : "nie"}
                                                            </span>
                                                        </div>

                                                        <RemoveItemDimensionButton
                                                            versionId={versionId}
                                                            itemDimensionScoreId={score.id}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {addingDimensionItemId === item.id ? (
                                            <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                                                <AssignItemDimensionForm
                                                    versionId={versionId}
                                                    itemId={item.id}
                                                    availableDimensions={availableDimensions}
                                                />

                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="mt-2"
                                                    onClick={() => setAddingDimensionItemId(null)}
                                                >
                                                    Anuluj
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="mt-3 gap-2"
                                                    onClick={() => setAddingDimensionItemId(item.id)}
                                                    disabled={availableDimensions.length === 0}
                                                >
                                                    <Plus size={14} />
                                                    Dodaj wymiar
                                                </Button>

                                                {availableDimensions.length === 0 ? (
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        Wszystkie wymiary są już przypisane do tego itemu.
                                                    </p>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                ) : null}
                            </>
                        )}
                    </div>
                ) : null}
            </div>
        );
    }


    return (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
                <h2 className="text-lg font-semibold">Struktura kwestionariusza</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Rozwijaj strony, dodawaj itemy bezpośrednio pod sekcjami i edytuj scoring.
                </p>
            </div>
            <form action={formAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="versionId" value={versionId} />

                <Input name="title" placeholder="W pracy najbardziej lubię..." required />
                <Input name="description" placeholder="Opis / instrukcja" />

                <Button type="submit" disabled={isPending}>
                    {isPending ? "Dodawanie..." : "Dodaj stronę"}
                </Button>
            </form>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "text-sm text-green-700"
                            : "text-sm text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}

            <div className="space-y-3">
                {pages.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Brak stron.
                    </div>
                ) : (
                    pages.map((page) => {
                        const isEditing = editingPageId === page.id;
                        const assignedDimensionIds = new Set(
                            page.dimensionScores.map((score) => score.questionnaireDimensionId),
                        );

                        const availableDimensions = dimensions.filter(
                            (dimension) => !assignedDimensionIds.has(dimension.id),
                        );
                        const pageItems = itemsByPageKey[page.id] ?? [];
                        const isOpen = openPageIds.has(page.id);
                        const isScoringEditing = editingPageScoringId === page.id;
                        return (
                            <div key={page.id} className="overflow-hidden rounded-2xl border">
                                <button
                                    type="button"
                                    onClick={() => togglePage(page.id)}
                                    className="flex w-full items-start justify-between gap-4 bg-background px-4 py-4 text-left hover:bg-muted/40"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {isOpen ? (
                                                <ChevronDown size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
                                            )}

                                            <span className="text-base font-semibold">{page.title}</span>

                                            <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                                                {pageItems.length} itemów
                                            </span>

                                        </div>

                                        {page.description ? (
                                            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                                                {page.description}
                                            </p>
                                        ) : null}

                                        <div className="mt-2">
                                            <DimensionChips scores={page.dimensionScores} />
                                        </div>
                                    </div>

                                    <div className="shrink-0 text-xs text-muted-foreground">
                                        {isOpen ? "Zwiń" : "Rozwiń"}
                                    </div>
                                </button>

                                {isOpen ? (
                                    <div className="space-y-4 border-t bg-muted/10 p-4">
                                        {isEditing ? (
                                            <EditQuestionnairePageForm
                                                versionId={versionId}
                                                page={page}
                                                onCancel={() => setEditingPageId(null)}
                                            />
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={() => setEditingPageId(page.id)}
                                                    >
                                                        <Edit3 size={14} />
                                                        Edytuj stronę
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="gap-2"
                                                        onClick={() =>
                                                            setEditingPageScoringId(
                                                                isScoringEditing ? null : page.id,
                                                            )
                                                        }
                                                    >
                                                        <Settings2 size={14} />
                                                        Edytuj scoring strony
                                                    </Button>

                                                    <ReorderQuestionnairePageButtons
                                                        versionId={versionId}
                                                        pageId={page.id}
                                                    />

                                                    <ArchiveQuestionnairePageButton
                                                        versionId={versionId}
                                                        page={page}
                                                    />
                                                </div>

                                                {isScoringEditing ? (
                                                    <div className="rounded-lg border bg-background p-3">
                                                        <div className="mb-2 text-sm font-medium">
                                                            Wymiary strony
                                                        </div>

                                                        {page.dimensionScores.length === 0 ? (
                                                            <p className="text-sm text-muted-foreground">
                                                                Brak wymiarów przypisanych do strony.
                                                            </p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {page.dimensionScores.map((score) => (
                                                                    <div
                                                                        key={score.id}
                                                                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                                                                    >
                                                                        <div>
                                                                            <span className="font-medium">
                                                                                {score.dimensionName}
                                                                            </span>{" "}
                                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                                {score.dimensionCode}
                                                                            </span>
                                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                                                weight: {score.weight}; reverse:{" "}
                                                                                {score.reverseScored ? "tak" : "nie"}
                                                                            </span>
                                                                        </div>

                                                                        <RemovePageDimensionButton
                                                                            versionId={versionId}
                                                                            pageDimensionScoreId={score.id}
                                                                        />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {addingDimensionPageId === page.id ? (
                                                            <div className="mt-3 rounded-lg border bg-muted/20 p-3">
                                                                <AssignPageDimensionForm
                                                                    versionId={versionId}
                                                                    pageId={page.id}
                                                                    availableDimensions={availableDimensions}
                                                                />

                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="mt-2"
                                                                    onClick={() => setAddingDimensionPageId(null)}
                                                                >
                                                                    Anuluj
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="mt-3 gap-2"
                                                                    onClick={() => setAddingDimensionPageId(page.id)}
                                                                    disabled={availableDimensions.length === 0}
                                                                >
                                                                    <Plus size={14} />
                                                                    Dodaj wymiar do strony
                                                                </Button>

                                                                {availableDimensions.length === 0 ? (
                                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                                        Wszystkie wymiary są już przypisane do tej strony.
                                                                    </p>
                                                                ) : null}
                                                            </>
                                                        )}
                                                    </div>
                                                ) : null}

                                                <div className="rounded-lg border bg-background p-3">
                                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                        <div>
                                                            <div className="text-sm font-medium">
                                                                Itemy na tej stronie
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {pageItems.length === 0
                                                                    ? "Ta strona nie ma jeszcze itemów."
                                                                    : `Liczba itemów: ${pageItems.length}`}
                                                            </p>
                                                        </div>

                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="gap-2"
                                                            onClick={() => setAddingItemPageId(page.id)}
                                                        >
                                                            <Plus size={14} />
                                                            Dodaj item
                                                        </Button>
                                                    </div>

                                                    {addingItemPageId === page.id ? (
                                                        <div className="mt-3">
                                                            <CreateItemForPageForm
                                                                versionId={versionId}
                                                                pageId={page.id}
                                                                onCancel={() => setAddingItemPageId(null)}
                                                            />
                                                        </div>
                                                    ) : null}

                                                    {pageItems.length === 0 ? (
                                                        <div className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                                            Brak itemów na tej stronie.
                                                        </div>
                                                    ) : (
                                                        <div className="mt-3 space-y-3">
                                                            {pageItems.map((item) => renderItem(item))}
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })
                )}
            </div>
            {unpagedItems.length > 0 ? (
                <div className="overflow-hidden rounded-2xl border border-dashed">
                    <button
                        type="button"
                        onClick={() => setIsUnpagedOpen((value) => !value)}
                        className="flex w-full items-start justify-between gap-4 bg-background px-4 py-4 text-left hover:bg-muted/40"
                    >
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                {isUnpagedOpen ? (
                                    <ChevronDown size={18} className="text-muted-foreground" />
                                ) : (
                                    <ChevronRight size={18} className="text-muted-foreground" />
                                )}

                                <h3 className="text-base font-semibold">Itemy bez strony</h3>

                                <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                                    {unpagedItems.length} itemów
                                </span>
                            </div>

                            <p className="mt-2 text-sm text-muted-foreground">
                                Te itemy nie są przypisane do żadnej strony. Możesz je edytować i przypisać do strony.
                            </p>
                        </div>

                        <div className="shrink-0 text-xs text-muted-foreground">
                            {isUnpagedOpen ? "Zwiń" : "Rozwiń"}
                        </div>
                    </button>

                    {isUnpagedOpen ? (
                        <div className="space-y-3 border-t bg-muted/10 p-4">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                onClick={() => setAddingItemPageId("__NO_PAGE__")}
                            >
                                <Plus size={14} />
                                Dodaj item bez strony
                            </Button>

                            {addingItemPageId === "__NO_PAGE__" ? (
                                <CreateItemForPageForm
                                    versionId={versionId}
                                    pageId={null}
                                    onCancel={() => setAddingItemPageId(null)}
                                />
                            ) : null}

                            <div className="space-y-3">
                                {unpagedItems.map((item) => renderItem(item))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}