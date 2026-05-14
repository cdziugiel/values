"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  publishQuestionnaireVersionAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

type QuestionnaireVersionPublishPanelProps = {
  versionId: string;
  status: string;
};

export function QuestionnaireVersionPublishPanel({
  versionId,
  status,
}: QuestionnaireVersionPublishPanelProps) {
  const [state, formAction, isPending] = useActionState(
    publishQuestionnaireVersionAction,
    initialState,
  );

  const isDraft = status === "draft";
  const isPublished = status === "active";

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Publikacja wersji</h2>

          {isDraft ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Ta wersja jest robocza. Możesz ją edytować, a po zakończeniu prac
              opublikować jako stabilną wersję badawczą.
            </p>
          ) : isPublished ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Ta wersja jest opublikowana. Dla bezpieczeństwa psychometrycznego
              nie powinna być dalej edytowana.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Ta wersja nie jest robocza. Publikowanie jest dostępne tylko dla
              wersji draft.
            </p>
          )}
        </div>

        {isDraft ? (
          <form
            action={formAction}
            onSubmit={(event) => {
              const confirmed = window.confirm(
                "Opublikować tę wersję kwestionariusza? Po publikacji wersja powinna być traktowana jako niemutowalna.",
              );

              if (!confirmed) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="versionId" value={versionId} />

            <Button type="submit" disabled={isPending}>
              {isPending ? "Publikowanie..." : "Opublikuj wersję"}
            </Button>
          </form>
        ) : null}
      </div>

      {state.status !== "idle" ? (
        <pre
          className={
            state.status === "success"
              ? "mt-4 whitespace-pre-wrap rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              : "mt-4 whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </pre>
      ) : null}
    </section>
  );
}