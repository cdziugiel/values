// features/questionnaire-admin/components/questionnaire-dimensions-editor.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Layers3,
  PlusCircle,
  Save,
  Settings2,
  Tag,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

function ActionMessage({
  status,
  message,
  compact = false,
}: {
  status: "idle" | "success" | "error";
  message: string;
  compact?: boolean;
}) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={[
        compact
          ? "rounded-xl px-3 py-2 text-xs leading-5"
          : "rounded-[1.25rem] px-4 py-3 text-sm leading-6",
        "border",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={compact ? 14 : 16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={compact ? 14 : 16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
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

        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={isUpPending}
          className="h-8 w-8 rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
          title="Przesuń wyżej"
        >
          <ArrowUp size={14} />
          <span className="sr-only">Przesuń wyżej</span>
        </Button>
      </form>

      <form action={downAction}>
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="dimensionId" value={dimensionId} />
        <input type="hidden" name="direction" value="down" />

        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={isDownPending}
          className="h-8 w-8 rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
          title="Przesuń niżej"
        >
          <ArrowDown size={14} />
          <span className="sr-only">Przesuń niżej</span>
        </Button>
      </form>
    </div>
  );
}

function EditQuestionnaireDimensionPopover({
  versionId,
  dimension,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
}) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Settings2 size={14} />
          Ustawienia
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(calc(100vw-2rem),520px)] rounded-[1.5rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <form action={formAction} className="space-y-5 p-5">
          <input type="hidden" name="versionId" value={versionId} />
          <input type="hidden" name="dimensionId" value={dimension.id} />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <Edit3 size={13} />
                Wymiar scoringowy
              </div>

              <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Ustawienia wymiaru
              </h3>

              <p className="mt-1 font-mono text-xs text-[#6b7280]">
                {dimension.code}
              </p>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#171717]"
              onClick={() => setOpen(false)}
            >
              <XCircle size={16} />
              <span className="sr-only">Zamknij</span>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor={`dimension-category-${dimension.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Kategoria
              </label>

              <Input
                id={`dimension-category-${dimension.id}`}
                name="category"
                list="dimension-category-options"
                defaultValue={dimension.category ?? ""}
                placeholder="np. Wartości"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`dimension-code-${dimension.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Kod
              </label>

              <Input
                id={`dimension-code-${dimension.id}`}
                name="code"
                defaultValue={dimension.code}
                required
                className="rounded-2xl border-black/10 bg-white font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor={`dimension-name-${dimension.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Nazwa
              </label>

              <Input
                id={`dimension-name-${dimension.id}`}
                name="name"
                defaultValue={dimension.name}
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label
                htmlFor={`dimension-description-${dimension.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Opis
              </label>

              <textarea
                id={`dimension-description-${dimension.id}`}
                name="description"
                defaultValue={dimension.description ?? ""}
                className="min-h-28 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                placeholder="Opis wymiaru"
              />
            </div>
          </div>

          {state.status !== "idle" ? (
            <ActionMessage status={state.status} message={state.message} />
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-black/10 bg-white/70 text-[#171717]"
              onClick={() => setOpen(false)}
            >
              Anuluj
            </Button>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
            >
              <Save size={14} />
              {isPending ? "Zapisywanie..." : "Zapisz wymiar"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
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
    <div className="space-y-2">
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

        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          <Trash2 size={14} />
          {isPending ? "Usuwanie..." : "Usuń"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <ActionMessage
          status={state.status}
          message={state.message}
          compact
        />
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
      className={[
        "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
        selected
          ? "border-[#171717] bg-[#171717] text-white shadow-sm"
          : "border-black/10 bg-white/75 text-[#171717] hover:bg-white hover:shadow-sm",
      ].join(" ")}
      title={dimension.description ?? dimension.name}
    >
      <span
        className={[
          "font-mono text-xs",
          selected ? "text-white/75" : "text-[#8b9099]",
        ].join(" ")}
      >
        {dimension.code}
      </span>

      <span className="truncate font-medium">{dimension.name}</span>
    </button>
  );
}

function DimensionDetailsPanel({
  versionId,
  dimension,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
              {dimension.name}
            </h4>

            <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 font-mono text-xs text-[#6b7280]">
              {dimension.code}
            </span>

            <span className="rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-2.5 py-1 text-xs font-medium text-[#0f766e]">
              {dimension.category || "Bez kategorii"}
            </span>
          </div>

          {dimension.description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
              {dimension.description}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#6b7280]">
              Brak opisu wymiaru.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <EditQuestionnaireDimensionPopover
            versionId={versionId}
            dimension={dimension}
          />

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
  }

  return (
    <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <Layers3 size={13} />
            Scoring
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Wymiary scoringowe
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
            Wymiary są konstruktami, do których później przypisujesz strony i
            itemy. Kategorie porządkują listę, a szczegóły pojawiają się po
            kliknięciu w wybrany wymiar.
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#6b7280] shadow-sm">
          <span className="font-semibold text-[#171717]">
            {dimensions.length}
          </span>{" "}
          wymiarów
        </div>
      </div>

      <datalist id="dimension-category-options">
        {dimensionCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>

      <form
        action={formAction}
        className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm"
      >
        <input type="hidden" name="versionId" value={versionId} />

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
            <PlusCircle size={18} />
          </div>

          <div>
            <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
              Dodaj nowy wymiar
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              Kod powinien być stabilny, bo będzie używany w scoringu i raportach.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_1.4fr_auto] md:items-start">
          <Input
            name="category"
            list="dimension-category-options"
            placeholder="Kategoria"
            className="rounded-2xl border-black/10 bg-white"
          />

          <Input
            name="code"
            placeholder="STABILITY"
            required
            className="rounded-2xl border-black/10 bg-white font-mono text-sm"
          />

          <Input
            name="name"
            placeholder="Stabilność"
            required
            className="rounded-2xl border-black/10 bg-white"
          />

          <Input
            name="description"
            placeholder="Opis wymiaru"
            className="rounded-2xl border-black/10 bg-white"
          />

          <Button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            <PlusCircle size={16} />
            {isPending ? "Dodawanie..." : "Dodaj"}
          </Button>
        </div>

        {state.status !== "idle" ? (
          <div className="mt-4">
            <ActionMessage status={state.status} message={state.message} />
          </div>
        ) : null}
      </form>

      {dimensions.length === 0 ? (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
          Brak wymiarów. Dodaj pierwszy wymiar, aby móc przypisywać do niego
          itemy i budować scoring.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {groupedDimensions.map(([categoryKey, categoryDimensions]) => {
            const isOpen = openCategoryKeys.has(categoryKey);
            const categoryLabel = getDimensionCategoryLabel(categoryKey);

            const categorySelectedDimension =
              selectedDimension &&
              getDimensionCategoryKey(selectedDimension) === categoryKey
                ? selectedDimension
                : null;

            return (
              <div
                key={categoryKey}
                className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-white/70 shadow-sm backdrop-blur"
              >
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryKey)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
                      {isOpen ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </span>

                    <span className="flex min-w-0 items-center gap-2">
                      <Tag size={15} className="shrink-0 text-[#8b9099]" />
                      <span className="truncate font-semibold tracking-[-0.02em] text-[#171717]">
                        {categoryLabel}
                      </span>
                    </span>

                    <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs font-medium text-[#6b7280]">
                      {categoryDimensions.length} wym.
                    </span>
                  </div>

                  <span className="shrink-0 text-xs text-[#6b7280]">
                    {isOpen ? "Zwiń" : "Rozwiń"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="space-y-4 border-t border-black/10 bg-white/35 p-5">
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

                    {categorySelectedDimension ? (
                      <DimensionDetailsPanel
                        versionId={versionId}
                        dimension={categorySelectedDimension}
                      />
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/55 p-5 text-sm leading-6 text-[#6b7280]">
                        Wybierz wymiar z listy powyżej, aby zobaczyć szczegóły,
                        zmienić kolejność albo edytować ustawienia.
                      </div>
                    )}
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