"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createQuestionnaireVersionAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

type CreateQuestionnaireVersionFormProps = {
  questionnaireId: string;
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

export function CreateQuestionnaireVersionForm({
  questionnaireId,
}: CreateQuestionnaireVersionFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createQuestionnaireVersionAction,
    initialState,
  );

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        Dodaj wersję
      </Button>
    );
  }

  return (
    <form action={formAction} className="min-w-[320px] space-y-3 rounded-xl border bg-background p-3">
      <input type="hidden" name="questionnaireId" value={questionnaireId} />

      <Input name="version" placeholder="v1" required />
      <Input name="name" placeholder="Nazwa wersji" required />

      <textarea
        name="description"
        className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Opis wersji"
      />

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-xs text-green-700"
              : "text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Tworzenie..." : "Utwórz"}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsOpen(false)}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}