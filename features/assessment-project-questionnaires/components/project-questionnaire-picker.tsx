// features/assessment-project-questionnaires/components/project-questionnaire-picker.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Layers3,
  PlusCircle,
  Search,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  addAssessmentProjectQuestionnaireAction,
  type AssessmentProjectQuestionnaireActionState,
} from "../api/assessment-project-questionnaire.actions";

type QuestionnaireOption = {
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  questionnaireVersionId: string;
  version: string;
  versionName: string;
};

type ProjectQuestionnairePickerProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  options: QuestionnaireOption[];
};

const initialState: AssessmentProjectQuestionnaireActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

function optionMatchesSearch(option: QuestionnaireOption, search: string) {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    option.questionnaireName,
    option.questionnaireCode,
    option.version,
    option.versionName,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedSearch);
}

export function ProjectQuestionnairePicker({
  tenantSlug,
  assessmentProjectId,
  options,
}: ProjectQuestionnairePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [selectedVersionId, setSelectedVersionId] = useState(
    options[0]?.questionnaireVersionId ?? "",
  );

  const [state, formAction, isPending] = useActionState(
    addAssessmentProjectQuestionnaireAction,
    initialState,
  );

  const filteredOptions = useMemo(
    () => options.filter((option) => optionMatchesSearch(option, search)),
    [options, search],
  );

  const selectedOption = useMemo(
    () =>
      options.find(
        (option) => option.questionnaireVersionId === selectedVersionId,
      ) ?? filteredOptions[0] ?? options[0],
    [filteredOptions, options, selectedVersionId],
  );

  if (options.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
        Brak aktywnych wersji kwestionariuszy do przypisania.
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          <PlusCircle size={16} />
          Dodaj kwestionariusz
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-hidden rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:max-w-3xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-black/10 p-6 pb-5 text-left">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                  <FileText size={13} />
                  Kwestionariusz projektu
                </div>

                <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                  Dodaj narzędzie do badania
                </DialogTitle>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Wybierz aktywną wersję kwestionariusza, która ma być dostępna
                  dla respondentów w ramach tego projektu.
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
          </DialogHeader>

          <form action={formAction} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />

            <input
              type="hidden"
              name="assessmentProjectId"
              value={assessmentProjectId}
            />

            <input
              type="hidden"
              name="questionnaireId"
              value={selectedOption?.questionnaireId ?? ""}
            />

            <input
              type="hidden"
              name="questionnaireVersionId"
              value={selectedOption?.questionnaireVersionId ?? ""}
            />

            <div className="border-b border-black/10 p-5">
              <label
                htmlFor={`project-questionnaire-search-${assessmentProjectId}`}
                className="mb-1.5 block text-sm font-medium text-[#171717]"
              >
                Wyszukaj kwestionariusz
              </label>

              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
                />

                <input
                  id={`project-questionnaire-search-${assessmentProjectId}`}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="Szukaj po nazwie, kodzie albo wersji..."
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {filteredOptions.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
                  Brak wyników dla podanej frazy.
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredOptions.map((option) => {
                    const selected =
                      selectedOption?.questionnaireVersionId ===
                      option.questionnaireVersionId;

                    return (
                      <button
                        key={option.questionnaireVersionId}
                        type="button"
                        onClick={() =>
                          setSelectedVersionId(option.questionnaireVersionId)
                        }
                        className={[
                          "w-full rounded-[1.5rem] border p-4 text-left transition",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
                          selected
                            ? "border-[#171717] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                            : "border-black/10 bg-white/70 hover:border-black/20 hover:bg-white",
                        ].join(" ")}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                                {option.questionnaireName}
                              </h3>

                              {selected ? (
                                <span className="rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-2.5 py-1 text-xs font-medium text-[#0f766e]">
                                  Wybrany
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 font-mono text-xs text-[#8b9099]">
                              {option.questionnaireCode}
                            </p>
                          </div>

                          <div className="shrink-0 rounded-full border border-black/10 bg-[#f3f4f6] px-3 py-1 text-xs font-medium text-[#171717]">
                            {option.version}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                              <Layers3 size={13} />
                              Wersja
                            </div>

                            <div className="mt-1 text-[#171717]">
                              {option.versionName}
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                              <CheckCircle2 size={13} />
                              Status
                            </div>

                            <div className="mt-1 w-fit rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                              Gotowy do przypisania
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {state.status !== "idle" ? (
                <div className="mt-4">
                  <ActionMessage status={state.status} message={state.message} />
                </div>
              ) : null}
            </div>

            <div className="border-t border-black/10 bg-white/80 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm leading-6 text-[#6b7280]">
                  {selectedOption ? (
                    <>
                      Wybrano:{" "}
                      <span className="font-semibold text-[#171717]">
                        {selectedOption.questionnaireName}
                      </span>{" "}
                      <span className="text-[#8b9099]">
                        ({selectedOption.version})
                      </span>
                    </>
                  ) : (
                    "Wybierz kwestionariusz z listy."
                  )}
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row">
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
                    disabled={isPending || !selectedOption}
                    className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                  >
                    <PlusCircle size={16} />
                    {isPending ? "Dodawanie..." : "Dodaj do projektu"}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}