"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  removeAssessmentProjectQuestionnaireAction,
  type AssessmentProjectQuestionnaireActionState,
} from "../api/assessment-project-questionnaire.actions";
import type { AssessmentProjectQuestionnaireAssignment } from "../../assessment-project-questionnaires/api/assessment-project-questionnaire-list.queries";
import { ProjectQuestionnairePicker } from "./project-questionnaire-picker";

type QuestionnaireOption = {
  questionnaireId: string;
  questionnaireCode: string;
  questionnaireName: string;
  questionnaireVersionId: string;
  version: string;
  versionName: string;
};

type ProjectQuestionnaireListProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  assignedQuestionnaires: AssessmentProjectQuestionnaireAssignment[];
  options: QuestionnaireOption[];
  canManage: boolean;
};

const initialState: AssessmentProjectQuestionnaireActionState = {
  status: "idle",
  message: "",
};

function RemoveProjectQuestionnaireButton({
  tenantSlug,
  assessmentProjectId,
  assignment,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
  assignment: AssessmentProjectQuestionnaireAssignment;
}) {
  const [state, formAction, isPending] = useActionState(
    removeAssessmentProjectQuestionnaireAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Usunąć kwestionariusz "${assignment.questionnaireName}" z tego badania?`,
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="space-y-1"
    >
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input
        type="hidden"
        name="assessmentProjectId"
        value={assessmentProjectId}
      />
      <input
        type="hidden"
        name="projectQuestionnaireId"
        value={assignment.id}
      />

      <Button
        type="submit"
        size="icon"
        variant="ghost"
        disabled={isPending}
        title="Usuń kwestionariusz z badania"
      >
        <Trash2 size={14} />
      </Button>

      {state.status === "error" ? (
        <p className="max-w-[260px] text-xs text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function ProjectQuestionnaireList({
  tenantSlug,
  assessmentProjectId,
  assignedQuestionnaires,
  options,
  canManage,
}: ProjectQuestionnaireListProps) {
  const assignedVersionIds = new Set(
    assignedQuestionnaires.map((item) => item.questionnaireVersionId),
  );

  const availableOptions = options.filter(
    (option) => !assignedVersionIds.has(option.questionnaireVersionId),
  );

  return (
    <div className="min-w-[320px] space-y-3 rounded-xl border bg-muted/20 p-3">
      <div>
        <div className="text-xs font-medium uppercase text-muted-foreground">
          Kwestionariusze w badaniu
        </div>

        {assignedQuestionnaires.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Brak przypisanych kwestionariuszy.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            {assignedQuestionnaires.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-start justify-between gap-2 rounded-lg border bg-background px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {assignment.questionnaireName}
                  </div>

                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {assignment.questionnaireCode} · wersja{" "}
                    {assignment.questionnaireVersion} ·{" "}
                    {assignment.questionnaireVersionName}
                  </div>

                  <div className="mt-0.5 text-xs text-muted-foreground">
                    kolejność: {assignment.orderIndex} · status:{" "}
                    {assignment.status}
                  </div>
                </div>

                {canManage ? (
                  <RemoveProjectQuestionnaireButton
                    tenantSlug={tenantSlug}
                    assessmentProjectId={assessmentProjectId}
                    assignment={assignment}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {canManage ? (
        <div className="border-t pt-3">
          {availableOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Wszystkie dostępne wersje kwestionariuszy są już przypisane albo
              nie ma aktywnych kwestionariuszy.
            </p>
          ) : (
            <ProjectQuestionnairePicker
              tenantSlug={tenantSlug}
              assessmentProjectId={assessmentProjectId}
              options={availableOptions}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}