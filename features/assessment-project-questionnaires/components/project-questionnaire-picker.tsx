"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

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

export function ProjectQuestionnairePicker({
  tenantSlug,
  assessmentProjectId,
  options,
}: ProjectQuestionnairePickerProps) {
  const [state, formAction, isPending] = useActionState(
    addAssessmentProjectQuestionnaireAction,
    initialState,
  );

  if (options.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Brak aktywnych wersji kwestionariuszy.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input
        type="hidden"
        name="assessmentProjectId"
        value={assessmentProjectId}
      />

      <select
        name="questionnaireVersionId"
        className="h-10 min-w-[320px] rounded-md border bg-background px-3 text-sm"
        onChange={(event) => {
          const selected = options.find(
            (option) =>
              option.questionnaireVersionId === event.currentTarget.value,
          );

          const form = event.currentTarget.form;

          if (!form || !selected) {
            return;
          }

          const questionnaireIdInput = form.elements.namedItem(
            "questionnaireId",
          ) as HTMLInputElement | null;

          if (questionnaireIdInput) {
            questionnaireIdInput.value = selected.questionnaireId;
          }
        }}
        defaultValue={options[0]?.questionnaireVersionId}
      >
        {options.map((option) => (
          <option
            key={option.questionnaireVersionId}
            value={option.questionnaireVersionId}
          >
            {option.questionnaireName} — {option.version}
          </option>
        ))}
      </select>

      <input
        type="hidden"
        name="questionnaireId"
        value={options[0]?.questionnaireId ?? ""}
      />

      <Button type="submit" disabled={isPending}>
        {isPending ? "Dodawanie..." : "Dodaj kwestionariusz"}
      </Button>

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
    </form>
  );
}