// features/assessment-project-questionnaires/components/project-questionnaire-list.tsx

"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  FileText,
  Layers3,
  ListChecks,
  PlusCircle,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  removeAssessmentProjectQuestionnaireAction,
  type AssessmentProjectQuestionnaireActionState,
} from "../api/assessment-project-questionnaire.actions";
import type { AssessmentProjectQuestionnaireAssignment } from "../api/assessment-project-questionnaire-list.queries";
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
      className="space-y-2"
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
        size="sm"
        variant="outline"
        disabled={isPending}
        className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
      >
        <Trash2 size={14} />
        {isPending ? "Usuwanie..." : "Usuń"}
      </Button>

      <ActionMessage status={state.status} message={state.message} compact />
    </form>
  );
}

function AssignedQuestionnaireCard({
  assignment,
  tenantSlug,
  assessmentProjectId,
  canManage,
}: {
  assignment: AssessmentProjectQuestionnaireAssignment;
  tenantSlug: string;
  assessmentProjectId: string;
  canManage: boolean;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
              {assignment.questionnaireName}
            </h3>

            <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {assignment.status}
            </Badge>
          </div>

          <p className="mt-1 font-mono text-xs text-[#6b7280]">
            {assignment.questionnaireCode}
          </p>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                <Layers3 size={13} />
                Wersja
              </div>

              <div className="mt-1 font-medium text-[#171717]">
                {assignment.questionnaireVersion}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                Nazwa wersji
              </div>

              <div className="mt-1 font-medium text-[#171717]">
                {assignment.questionnaireVersionName}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                Kolejność
              </div>

              <div className="mt-1 font-medium text-[#171717]">
                {assignment.orderIndex}
              </div>
            </div>
          </div>
        </div>

        {canManage ? (
          <div className="shrink-0">
            <RemoveProjectQuestionnaireButton
              tenantSlug={tenantSlug}
              assessmentProjectId={assessmentProjectId}
              assignment={assignment}
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ProjectQuestionnaireList({
  tenantSlug,
  assessmentProjectId,
  assignedQuestionnaires,
  options,
  canManage,
}: ProjectQuestionnaireListProps) {
  const assignedQuestionnaireIds = new Set(
    assignedQuestionnaires.map((item) => item.questionnaireId),
  );

  const availableOptions = options.filter(
    (option) => !assignedQuestionnaireIds.has(option.questionnaireId),
  );

  const assignedCount = assignedQuestionnaires.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={assignedCount > 0 ? "outline" : "default"}
          className={
            assignedCount > 0
              ? "rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
              : "rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          }
        >
          {assignedCount > 0 ? (
            <>
              <ListChecks size={14} />
              {assignedCount} kwestionariusz
              {assignedCount === 1 ? "" : assignedCount < 5 ? "e" : "y"}
            </>
          ) : (
            <>
              <PlusCircle size={14} />
              Dodaj
            </>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-hidden rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:max-w-5xl">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-black/10 p-6 pb-5 text-left">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                  <FileText size={13} />
                  Kwestionariusze projektu
                </div>

                <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                  Narzędzia przypisane do badania
                </DialogTitle>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Tutaj określasz, które wersje kwestionariuszy będą wypełniane
                  przez respondentów w ramach tego projektu badawczego.
                </p>
              </div>

              <div className="w-fit rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#6b7280] shadow-sm">
                <span className="font-semibold text-[#171717]">
                  {assignedCount}
                </span>{" "}
                przypisanych
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
            {assignedQuestionnaires.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280] shadow-sm">
                Brak przypisanych kwestionariuszy. Dodaj pierwsze narzędzie, aby
                respondenci mogli rozpocząć badanie.
              </div>
            ) : (
              <div className="space-y-3">
                {assignedQuestionnaires.map((assignment) => (
                  <AssignedQuestionnaireCard
                    key={assignment.id}
                    assignment={assignment}
                    tenantSlug={tenantSlug}
                    assessmentProjectId={assessmentProjectId}
                    canManage={canManage}
                  />
                ))}
              </div>
            )}

            {canManage ? (
              <div className="mt-6 border-t border-black/10 pt-6">
                {availableOptions.length === 0 ? (
                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
                    Wszystkie dostępne kwestionariusze są już przypisane albo
                    nie ma aktywnych wersji do dodania.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#171717]">
                        Dodaj kolejne narzędzie
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                        Wybór kwestionariusza otworzy się w osobnym oknie.
                      </p>
                    </div>

                    <ProjectQuestionnairePicker
                      tenantSlug={tenantSlug}
                      assessmentProjectId={assessmentProjectId}
                      options={availableOptions}
                    />
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}