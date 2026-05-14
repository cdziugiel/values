"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createQuestionnaireDimensionAction,
  type QuestionnaireAdminActionState,
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

export function QuestionnaireDimensionsEditor({
  versionId,
  dimensions,
}: QuestionnaireDimensionsEditorProps) {
  const [state, formAction, isPending] = useActionState(
    createQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Wymiary scoringowe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wymiary są konstruktami, do których później przypisujesz itemy.
        </p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-5">
        <input type="hidden" name="versionId" value={versionId} />

        <Input name="code" placeholder="STABILITY" required />
        <Input name="name" placeholder="Stabilność" required />
        <Input name="description" placeholder="Opis wymiaru" />
        <Input
          name="orderIndex"
          type="number"
          placeholder="0"
          defaultValue={dimensions.length + 1}
        />

        <Button type="submit" disabled={isPending}>
          Dodaj wymiar
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

      <div className="grid gap-3 md:grid-cols-2">
        {dimensions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Brak wymiarów.
          </div>
        ) : (
          dimensions.map((dimension) => (
            <div key={dimension.id} className="rounded-xl border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{dimension.name}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {dimension.code}
                </span>
              </div>
              {dimension.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {dimension.description}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}