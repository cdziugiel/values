"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Edit3, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveQuestionnaireDimensionAction,
  createQuestionnaireDimensionAction,
  reorderQuestionnaireDimensionAction,
  type QuestionnaireAdminActionState,
  updateQuestionnaireDimensionAction,
} from "../api/questionnaire-admin.actions";
import type { QuestionnaireDimensionEditorItem } from "../types/questionnaire-admin.types";

type QuestionnaireDimensionsEditorProps = {
  versionId: string;
  dimensions: QuestionnaireDimensionEditorItem[];
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

const NO_CATEGORY_KEY = "__NO_CATEGORY__";
const NO_CATEGORY_LABEL = "Bez kategorii";

function getDimensionCategoryKey(dimension: QuestionnaireDimensionEditorItem) {
  const normalized = dimension.category?.trim();

  return normalized || NO_CATEGORY_KEY;
}

function getDimensionCategoryLabel(categoryKey: string) {
  return categoryKey === NO_CATEGORY_KEY ? NO_CATEGORY_LABEL : categoryKey;
}

function ReorderQuestionnaireDimensionButtons({
  versionId,
  dimensionId,
}: {
  versionId: string;
  dimensionId: string;
}) {
  const [_stateUp, upAction, isUpPending] = useActionState(
    reorderQuestionnaireDimensionAction,
    initialState,
  );

  const [_stateDown, downAction, isDownPending] = useActionState(
    reorderQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <div className="flex gap-1">
      <form action={upAction}>
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="dimensionId" value={dimensionId} />
        <input type="hidden" name="direction" value="up" />

        <Button type="submit" size="sm" variant="outline" disabled={isUpPending}>
          ↑
        </Button>
      </form>

      <form action={downAction}>
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="dimensionId" value={dimensionId} />
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

function EditQuestionnaireDimensionForm({
  versionId,
  dimension,
  onCancel,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="dimensionId" value={dimension.id} />

      <div className="grid gap-3 md:grid-cols-4">
        <Input
          name="category"
          list="dimension-category-options"
          defaultValue={dimension.category ?? ""}
          placeholder="Kategoria"
        />

        <Input name="code" defaultValue={dimension.code} required />
        <Input name="name" defaultValue={dimension.name} required />

        <Input
          name="description"
          defaultValue={dimension.description ?? ""}
          placeholder="Opis wymiaru"
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
          {isPending ? "Zapisywanie..." : "Zapisz wymiar"}
        </Button>

        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function ArchiveQuestionnaireDimensionButton({
  versionId,
  dimension,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
}) {
  const [state, formAction, isPending] = useActionState(
    archiveQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <div className="space-y-1">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Usunąć wymiar "${dimension.name}"? Powiązania scoringowe itemów z tym wymiarem zostaną usunięte.`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="dimensionId" value={dimension.id} />

        <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
          {isPending ? "Usuwanie..." : "Usuń wymiar"}
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

function DimensionChip({
  dimension,
  selected,
  onClick,
}: {
  dimension: QuestionnaireDimensionEditorItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "inline-flex items-center gap-2 rounded-full border bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-sm"
          : "inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted/60"
      }
      title={dimension.description ?? dimension.name}
    >
      <span className="font-mono text-xs opacity-80">{dimension.code}</span>
      <span className="font-medium">{dimension.name}</span>
    </button>
  );
}

function DimensionDetailsPanel({
  versionId,
  dimension,
  isEditing,
  onEdit,
  onCancelEdit,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
}) {
  if (isEditing) {
    return (
      <EditQuestionnaireDimensionForm
        versionId={versionId}
        dimension={dimension}
        onCancel={onCancelEdit}
      />
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-background p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold">{dimension.name}</span>

            <span className="rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs text-muted-foreground">
              {dimension.code}
            </span>

            {dimension.category ? (
              <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                {dimension.category}
              </span>
            ) : (
              <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                Bez kategorii
              </span>
            )}
          </div>

          {dimension.description ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {dimension.description}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Brak opisu wymiaru.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={onEdit}
          >
            <Edit3 size={14} />
            Edytuj
          </Button>

          <ReorderQuestionnaireDimensionButtons
            versionId={versionId}
            dimensionId={dimension.id}
          />

          <ArchiveQuestionnaireDimensionButton
            versionId={versionId}
            dimension={dimension}
          />
        </div>
      </div>
    </div>
  );
}

export function QuestionnaireDimensionsEditor({
  versionId,
  dimensions,
}: QuestionnaireDimensionsEditorProps) {
  const [editingDimensionId, setEditingDimensionId] = useState<string | null>(
    null,
  );
  const [selectedDimensionId, setSelectedDimensionId] = useState<string | null>(
    null,
  );
  const [openCategoryKeys, setOpenCategoryKeys] = useState<Set<string>>(
    () => new Set([NO_CATEGORY_KEY]),
  );

  const [state, formAction, isPending] = useActionState(
    createQuestionnaireDimensionAction,
    initialState,
  );

  const dimensionCategories = useMemo(
    () =>
      Array.from(
        new Set(
          dimensions
            .map((dimension) => dimension.category?.trim())
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort((a, b) => a.localeCompare(b, "pl")),
    [dimensions],
  );

  const groupedDimensions = useMemo(() => {
    const groups = new Map<string, QuestionnaireDimensionEditorItem[]>();

    for (const dimension of dimensions) {
      const key = getDimensionCategoryKey(dimension);
      const list = groups.get(key) ?? [];

      list.push(dimension);
      groups.set(key, list);
    }

    for (const [key, list] of groups.entries()) {
      groups.set(
        key,
        [...list].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
      );
    }

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === NO_CATEGORY_KEY) return 1;
      if (b === NO_CATEGORY_KEY) return -1;

      return a.localeCompare(b, "pl");
    });
  }, [dimensions]);

  const selectedDimension =
    dimensions.find((dimension) => dimension.id === selectedDimensionId) ?? null;

  function toggleCategory(categoryKey: string) {
    setOpenCategoryKeys((previous) => {
      const next = new Set(previous);

      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }

      return next;
    });
  }

  function toggleDimension(dimensionId: string) {
    setSelectedDimensionId((previous) =>
      previous === dimensionId ? null : dimensionId,
    );

    setEditingDimensionId(null);
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Wymiary scoringowe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wymiary są konstruktami, do których później przypisujesz strony i itemy.
          Kategorie porządkują listę, a szczegóły wymiaru pojawiają się po kliknięciu w chip.
        </p>
      </div>

      <datalist id="dimension-category-options">
        {dimensionCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <form action={formAction} className="grid gap-3 md:grid-cols-5">
        <input type="hidden" name="versionId" value={versionId} />

        <Input
          name="category"
          list="dimension-category-options"
          placeholder="Kategoria, np. Wartości"
        />

        <Input name="code" placeholder="STABILITY" required />
        <Input name="name" placeholder="Stabilność" required />
        <Input name="description" placeholder="Opis wymiaru" />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Dodawanie..." : "Dodaj wymiar"}
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

      {dimensions.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Brak wymiarów.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedDimensions.map(([categoryKey, categoryDimensions]) => {
            const isOpen = openCategoryKeys.has(categoryKey);
            const categoryLabel = getDimensionCategoryLabel(categoryKey);

            return (
              <div key={categoryKey} className="overflow-hidden rounded-2xl border">
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryKey)}
                  className="flex w-full items-center justify-between gap-4 bg-background px-4 py-3 text-left hover:bg-muted/40"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {isOpen ? (
                      <ChevronDown size={18} className="text-muted-foreground" />
                    ) : (
                      <ChevronRight size={18} className="text-muted-foreground" />
                    )}

                    <span className="font-semibold">{categoryLabel}</span>

                    <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                      {categoryDimensions.length} wym.
                    </span>
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground">
                    {isOpen ? "Zwiń" : "Rozwiń"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="space-y-3 border-t bg-muted/10 p-4">
                    <div className="flex flex-wrap gap-2">
                      {categoryDimensions.map((dimension) => (
                        <DimensionChip
                          key={dimension.id}
                          dimension={dimension}
                          selected={selectedDimensionId === dimension.id}
                          onClick={() => toggleDimension(dimension.id)}
                        />
                      ))}
                    </div>

                    {selectedDimension &&
                    getDimensionCategoryKey(selectedDimension) === categoryKey ? (
                      <DimensionDetailsPanel
                        versionId={versionId}
                        dimension={selectedDimension}
                        isEditing={editingDimensionId === selectedDimension.id}
                        onEdit={() => setEditingDimensionId(selectedDimension.id)}
                        onCancelEdit={() => setEditingDimensionId(null)}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}