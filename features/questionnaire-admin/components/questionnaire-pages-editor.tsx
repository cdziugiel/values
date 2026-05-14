"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createQuestionnairePageAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";
import type { QuestionnairePageEditorItem } from "../types/questionnaire-admin.types";

type QuestionnairePagesEditorProps = {
  versionId: string;
  pages: QuestionnairePageEditorItem[];
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

export function QuestionnairePagesEditor({
  versionId,
  pages,
}: QuestionnairePagesEditorProps) {
  const [state, formAction, isPending] = useActionState(
    createQuestionnairePageAction,
    initialState,
  );

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Strony / sekcje</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Strona może mieć tytuł typu „W pracy najbardziej lubię...” oraz grupować kilka itemów.
        </p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-5">
        <input type="hidden" name="versionId" value={versionId} />

        <Input name="code" placeholder="PAGE_001" required />
        <Input name="title" placeholder="W pracy najbardziej lubię..." required />
        <Input name="description" placeholder="Opis / instrukcja" />
        <Input name="orderIndex" type="number" placeholder="0" defaultValue={pages.length + 1} />

        <Button type="submit" disabled={isPending}>
          Dodaj stronę
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

      <div className="space-y-2">
        {pages.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Brak stron.
          </div>
        ) : (
          pages.map((page) => (
            <div key={page.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{page.title}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {page.code}
                </span>
                <span className="text-xs text-muted-foreground">
                  kolejność: {page.orderIndex}
                </span>
              </div>
              {page.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {page.description}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}