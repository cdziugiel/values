"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    archiveQuestionnaireItemAction,
    assignItemDimensionAction,
    createQuestionnaireItemAction,
    removeItemDimensionAction,
    type QuestionnaireAdminActionState,
    updateQuestionnaireItemAction,
    reorderQuestionnaireItemAction,
} from "../api/questionnaire-admin.actions";
import type {
    QuestionnaireDimensionEditorItem,
    QuestionnaireItemEditorItem,
    QuestionnairePageEditorItem,
} from "../types/questionnaire-admin.types";
import { Plus } from "lucide-react";

type QuestionnaireItemsEditorProps = {
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



function getResponseConfigValue(
  responseConfig: unknown,
  key: string,
  fallback: string | number | boolean,
) {
  if (
    typeof responseConfig === "object" &&
    responseConfig !== null &&
    key in responseConfig
  ) {
    const value = (responseConfig as Record<string, unknown>)[key];

    if (value !== null && value !== undefined) {
      return value as string | number | boolean;
    }
  }

  return fallback;
}
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
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
    const likertDisplay = getLikertDisplay(defaultResponseConfig);
    const likertStep = getConfigNumber(defaultResponseConfig, "step", 1);

    return (
      <div className="space-y-3 rounded-xl border p-3">
        <div className="text-sm font-medium">Konfiguracja skali Likerta</div>

        <div className="grid gap-3 md:grid-cols-4">
          <Input
            name="scaleMin"
            type="number"
            defaultValue={defaultScaleMin ?? -3}
            placeholder="-3"
          />

          <Input
            name="scaleMax"
            type="number"
            defaultValue={defaultScaleMax ?? 3}
            placeholder="3"
          />

          <Input
            name="scaleMinLabel"
            defaultValue={defaultScaleMinLabel ?? ""}
            placeholder="Etykieta minimum"
          />

          <Input
            name="scaleMaxLabel"
            defaultValue={defaultScaleMaxLabel ?? ""}
            placeholder="Etykieta maksimum"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input
            name="likertStep"
            type="number"
            step="0.1"
            defaultValue={String(likertStep)}
            placeholder="Krok, np. 1"
          />

          <select
            name="likertDisplay"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            defaultValue={likertDisplay}
          >
            <option value="buttons">Przyciski</option>
            <option value="radio">Radio</option>
            <option value="slider">Suwak</option>
          </select>
        </div>
      </div>
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

            <div className="grid gap-3 md:grid-cols-4">
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
                {isPending ? "Usuwanie..." : "Usuń item"}
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
                    <input type="checkbox" name="reverseScored" />
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


export function QuestionnaireItemsEditor({
    versionId,
    pages,
    dimensions,
    items,
}: QuestionnaireItemsEditorProps) {
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [newItemType, setNewItemType] = useState("likert");

    const [addingDimensionItemId, setAddingDimensionItemId] = useState<string | null>(
        null,
    );
    const [createState, createAction, isCreating] = useActionState(
        createQuestionnaireItemAction,
        initialState,
    );

    const itemsByPageKey = items.reduce<
        Record<string, QuestionnaireItemEditorItem[]>
    >((acc, item) => {
        const key = item.questionnairePageId ?? "__NO_PAGE__";

        acc[key] ??= [];
        acc[key].push(item);

        return acc;
    }, {});

    const pageGroups = [
        ...pages.map((page) => ({
            key: page.id,
            title: page.title,
            items: itemsByPageKey[page.id] ?? [],
        })),
        {
            key: "__NO_PAGE__",
            title: "Itemy bez strony",
            items: itemsByPageKey.__NO_PAGE__ ?? [],
        },
    ].filter((group) => group.items.length > 0 || group.key !== "__NO_PAGE__");

    function renderItem(item: QuestionnaireItemEditorItem) {
        const isEditing = editingItemId === item.id;

        const assignedDimensionIds = new Set(
            item.dimensionScores.map((score) => score.questionnaireDimensionId),
        );

        const availableDimensions = dimensions.filter(
            (dimension) => !assignedDimensionIds.has(dimension.id),
        );

        return (
            <div key={item.id} className="space-y-4 rounded-xl border p-4">
{isEditing ? (
  <QuestionnaireItemEditForm
    key={item.id}
    versionId={versionId}
    item={item}
    pages={pages}
    onCancel={() => setEditingItemId(null)}
  />
) : (
                    <>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium">{item.text}</span>

                                        <span className="rounded-md border px-2 py-1 text-xs">
                                            {item.type}
                                        </span>
                                    </div>

                                    <div className="mt-1 text-xs text-muted-foreground">
                                        kolejność: {item.orderIndex} · skala: {item.scaleMin ?? "—"}–
                                        {item.scaleMax ?? "—"} · wymagane:{" "}
                                        {item.required ? "tak" : "nie"}
                                    </div>

                                    {item.helpText ? (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            {item.helpText}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingItemId(item.id)}
                                    >
                                        Edytuj item
                                    </Button>

                                    <ReorderQuestionnaireItemButtons
                                        versionId={versionId}
                                        itemId={item.id}
                                    />

                                    <QuestionnaireItemArchiveForm versionId={versionId} item={item} />
                                </div>
                            </div>

                            <div className="rounded-lg bg-muted/40 p-3">
                                <div className="mb-2 text-sm font-medium">Wymiary itemu</div>

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
                                                    <span className="font-medium">{score.dimensionName}</span>{" "}
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
                                    <div className="mt-3 rounded-lg border bg-background p-3">
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
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <section className="space-y-6 rounded-2xl border bg-card p-5">
            <div>
                <h2 className="text-lg font-semibold">Itemy</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Item może należeć do strony, mieć typ odpowiedzi, skalę i jeden lub
                    więcej wymiarów scoringowych.
                </p>
            </div>

            <form action={createAction} className="space-y-4 rounded-xl border p-4">
                <input type="hidden" name="versionId" value={versionId} />

                <div className="grid gap-3 md:grid-cols-2">
                    <select
                        name="pageId"
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        defaultValue=""
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
                    placeholder='Treść itemu, np. "...atmosferę"'
                />

                <Input name="helpText" placeholder="Pomoc / doprecyzowanie" />

                <ResponseTypeFields key={`create:${newItemType}`} type={newItemType} />

                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="required" defaultChecked />
                    Wymagane
                </label>

                {createState.status !== "idle" ? (
                    <p
                        className={
                            createState.status === "success"
                                ? "text-sm text-green-700"
                                : "text-sm text-destructive"
                        }
                    >
                        {createState.message}
                    </p>
                ) : null}

                <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Dodawanie..." : "Dodaj item"}
                </Button>
            </form>

            {items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                    Brak itemów.
                </div>
            ) : (
                <div className="space-y-6">
                    {pageGroups.map((group) => (
                        <div key={group.key} className="space-y-3 rounded-2xl border p-4">
                            <h3 className="text-base font-semibold">{group.title}</h3>

                            {group.items.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Brak itemów na tej stronie.
                                </p>
                            ) : (
                                group.items.map((item) => renderItem(item))
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}