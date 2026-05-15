"use client";

import { useActionState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  publishQuestionnaireVersionAction,
  unpublishQuestionnaireVersionAction,
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
  const [publishState, publishAction, isPublishing] = useActionState(
    publishQuestionnaireVersionAction,
    initialState,
  );

  const [unpublishState, unpublishAction, isUnpublishing] = useActionState(
    unpublishQuestionnaireVersionAction,
    initialState,
  );

  const isDraft = status === "draft";
  const isPublished = status === "active";

  const state =
    publishState.status !== "idle" ? publishState : unpublishState;

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
            <div className="mt-1 space-y-2 text-sm text-muted-foreground">
              <p>
                Ta wersja jest opublikowana. Standardowo opublikowane wersje
                powinny być traktowane jako niemutowalne.
              </p>
              <p>
                Na etapie developerskim możesz jednak cofnąć publikację, wrócić
                do edycji i opublikować wersję ponownie.
              </p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Ta wersja nie jest robocza. Publikowanie jest dostępne tylko dla
              wersji draft.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/questionnaires/preview/${versionId}`}>
              Podgląd
            </Link>
          </Button>

          {isDraft ? (
            <form
              action={publishAction}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  "Opublikować tę wersję kwestionariusza? Po publikacji wersja powinna być traktowana jako stabilna.",
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="versionId" value={versionId} />

              <Button type="submit" disabled={isPublishing}>
                {isPublishing ? "Publikowanie..." : "Opublikuj wersję"}
              </Button>
            </form>
          ) : null}

          {isPublished ? (
            <form
              action={unpublishAction}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  [
                    "Cofnąć publikację tej wersji?",
                    "",
                    "Wersja wróci do statusu draft, zostanie zdjęta z publicznego dostępu i będzie ponownie edytowalna.",
                    "",
                    "To jest operacja developerska — nie powinna być używana dla wersji, na których oparto już właściwe badania produkcyjne.",
                  ].join("\n"),
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <input type="hidden" name="versionId" value={versionId} />

              <Button
                type="submit"
                variant="outline"
                disabled={isUnpublishing}
                className="gap-2"
              >
                <RotateCcw size={14} />
                {isUnpublishing ? "Cofanie..." : "Cofnij publikację"}
              </Button>
            </form>
          ) : null}
        </div>
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