// features/my-assessment/components/my-assessment-card-session-actions.tsx

"use client";

import { useActionState } from "react";
import { Archive, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MyAssessmentQuestionnaire } from "../types/my-assessment.types";

import {
  archiveMyCompletedAssessmentSessionAction,
  cancelMyAssessmentSessionAction,
  type MyAssessmentSessionActionState,
} from "../api/my-assessment-session.actions";

type MyAssessmentCardSessionActionsProps = {
  questionnaire: MyAssessmentQuestionnaire;
};

const initialState: MyAssessmentSessionActionState = {
  status: "idle",
  message: "",
};

export function MyAssessmentCardSessionActions({
  questionnaire,
}: MyAssessmentCardSessionActionsProps) {
  const [cancelState, cancelAction, isCancelPending] = useActionState(
    cancelMyAssessmentSessionAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchivePending] = useActionState(
    archiveMyCompletedAssessmentSessionAction,
    initialState,
  );

  const canCancel =
    questionnaire.status === "in_progress" &&
    Boolean(questionnaire.sessionId) &&
    Boolean(questionnaire.tenantSlug);

  const canArchive =
    questionnaire.status === "completed" &&
    Boolean(questionnaire.sessionId) &&
    Boolean(questionnaire.tenantSlug);

  if (!canCancel && !canArchive) {
    return null;
  }

  return (
      <div className="space-y-2">
      {canCancel ? (
        <form
          action={cancelAction}
          onSubmit={(event) => {
            const confirmed = window.confirm(
              "Anulować rozpoczęte badanie? Dotychczasowa sesja zostanie zamknięta, a zaproszenie wróci na listę tak, aby można było rozpocząć badanie od początku.",
            );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="tenantSlug"
            value={questionnaire.tenantSlug ?? ""}
          />
          <input
            type="hidden"
            name="sessionId"
            value={questionnaire.sessionId ?? ""}
          />

          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            disabled={isCancelPending}
          >
            <XCircle size={14} className="mr-1.5" />
            {isCancelPending ? "Anulowanie..." : "Anuluj badanie"}
          </Button>

          {cancelState.status === "error" ? (
            <p className="mt-1 text-xs text-destructive">
              {cancelState.message}
            </p>
          ) : null}
        </form>
      ) : null}

      {canArchive ? (
        <form
          action={archiveAction}
          onSubmit={(event) => {
            const confirmed = window.confirm(
              "Przenieść zakończone badanie do archiwum? Zniknie z tej listy, ale zapisany wynik i raport pozostaną w systemie.",
            );

            if (!confirmed) {
              event.preventDefault();
            }
          }}
        >
          <input
            type="hidden"
            name="tenantSlug"
            value={questionnaire.tenantSlug ?? ""}
          />
          <input
            type="hidden"
            name="sessionId"
            value={questionnaire.sessionId ?? ""}
          />
          <input type="hidden" name="source" value={questionnaire.source} />
          <input
            type="hidden"
            name="projectQuestionnaireId"
            value={questionnaire.projectQuestionnaireId ?? ""}
          />

          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
            disabled={isArchivePending}
          >
            <Archive size={14} className="mr-1.5" />
            {isArchivePending ? "Archiwizowanie..." : "Archiwizuj"}
          </Button>

          {archiveState.status === "error" ? (
            <p className="mt-1 text-xs text-destructive">
              {archiveState.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}