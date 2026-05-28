"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { updatePersonalCompositeSourcesAction } from "../api/report-builder.actions";
import { readPersonalCompositeSources } from "../lib/personal-composite-bindings";

type QuestionnaireOption = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type SourceDraft = {
  slot: string;
  label: string;
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  required: boolean;
};

type PersonalCompositeSourcesPanelProps = {
  reportTemplateVersionId: string;
  dataBindings: unknown;
  availableQuestionnaires: QuestionnaireOption[];
};

const initialState = {
  ok: false,
  message: "",
};

function normalizeSlotFromQuestionnaireCode(code: string) {
  return code.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function createEmptySource(index: number): SourceDraft {
  return {
    slot: `source_${index + 1}`,
    label: "",
    questionnaireId: "",
    questionnaireCode: "",
    questionnaireName: "",
    required: true,
  };
}

export function PersonalCompositeSourcesPanel({
  reportTemplateVersionId,
  dataBindings,
  availableQuestionnaires,
}: PersonalCompositeSourcesPanelProps) {
  const initialSources = useMemo(
    () => readPersonalCompositeSources(dataBindings),
    [dataBindings],
  );

  const [sources, setSources] = useState<SourceDraft[]>(
    initialSources.length > 0 ? initialSources : [createEmptySource(0)],
  );

  const [state, formAction, isPending] = useActionState(
    updatePersonalCompositeSourcesAction,
    initialState,
  );

  function updateSource(index: number, patch: Partial<SourceDraft>) {
    setSources((current) =>
      current.map((source, sourceIndex) =>
        sourceIndex === index ? { ...source, ...patch } : source,
      ),
    );
  }

  function handleQuestionnaireChange(index: number, questionnaireId: string) {
    const questionnaire = availableQuestionnaires.find(
      (item) => item.id === questionnaireId,
    );

    updateSource(index, {
      questionnaireId,
      questionnaireCode: questionnaire?.code ?? "",
      questionnaireName: questionnaire?.name ?? "",
      label: questionnaire?.name ?? "",
      slot: questionnaire?.code
        ? normalizeSlotFromQuestionnaireCode(questionnaire.code)
        : `source_${index + 1}`,
    });
  }

  function addSource() {
    setSources((current) => [...current, createEmptySource(current.length)]);
  }

  function removeSource(index: number) {
    setSources((current) =>
      current.length <= 1
        ? current
        : current.filter((_, sourceIndex) => sourceIndex !== index),
    );
  }

  const serializableSources = sources.map((source) => ({
    slot: source.slot,
    label: source.label || source.questionnaireName || source.questionnaireCode,
    questionnaireId: source.questionnaireId,
    questionnaireCode: source.questionnaireCode,
    questionnaireName: source.questionnaireName,
    required: source.required,
  }));

  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
              Kwestionariusze źródłowe raportu złożonego
            </h2>

            <Badge
              variant="outline"
              className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
            >
              personal_composite
            </Badge>
          </div>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6b7280]">
            Wskaż kwestionariusze, z których ma powstać raport złożony.
            Źródła oznaczone jako wymagane muszą być ukończone przez
            respondenta.
          </p>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addSource}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj źródło
        </Button>
      </div>

      <form action={formAction} className="mt-4 space-y-4">
        <input
          type="hidden"
          name="reportTemplateVersionId"
          value={reportTemplateVersionId}
        />

        <input
          type="hidden"
          name="sources"
          value={JSON.stringify(serializableSources)}
        />

        <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_120px_48px] items-center gap-3 border-b border-black/10 bg-[#f9fafb] px-4 py-2 text-xs font-medium uppercase tracking-[0.08em] text-[#6b7280]">
            <div>Kwestionariusz</div>
            <div>Kod</div>
            <div>Wymagany</div>
            <div />
          </div>

          <div className="divide-y divide-black/10">
            {sources.map((source, index) => (
              <div
                key={`${source.slot}-${index}`}
                className="grid grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_120px_48px] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <select
                    value={source.questionnaireId}
                    onChange={(event) =>
                      handleQuestionnaireChange(index, event.target.value)
                    }
                    className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  >
                    <option value="">Wybierz kwestionariusz</option>
                    {availableQuestionnaires.map((questionnaire) => (
                      <option key={questionnaire.id} value={questionnaire.id}>
                        {questionnaire.name} ({questionnaire.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0">
                  {source.questionnaireCode ? (
                    <span className="block truncate rounded-xl bg-[#f3f4f6] px-3 py-2 font-mono text-xs text-[#374151]">
                      {source.questionnaireCode}
                    </span>
                  ) : (
                    <span className="block rounded-xl bg-[#f3f4f6] px-3 py-2 text-xs text-[#9ca3af]">
                      —
                    </span>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    checked={source.required}
                    onChange={(event) =>
                      updateSource(index, { required: event.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Tak
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeSource(index)}
                  disabled={sources.length <= 1}
                  aria-label="Usuń źródło"
                  className="h-9 w-9 rounded-xl"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {state.message ? (
          <div
            className={
              state.ok
                ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            }
          >
            {state.message}
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Zapisywanie..." : "Zapisz konfigurację źródeł"}
          </Button>
        </div>
      </form>
    </section>
  );
}