"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  updateQuestionnaireAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";
import type { QuestionnaireAdminListItem } from "../types/questionnaire-admin.types";

type QuestionnaireRowActionsProps = {
  questionnaire: QuestionnaireAdminListItem;
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

const questionnaireStatusOptions = [
  { value: "draft", label: "draft" },
  { value: "active", label: "active" },
  { value: "archived", label: "archived" },
];

export function QuestionnaireRowActions({
  questionnaire,
}: QuestionnaireRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateQuestionnaireAction,
    initialState,
  );

  if (!isEditing) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setIsEditing(true)}
      >
        Edytuj kwestionariusz
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-4 space-y-3 rounded-xl border bg-muted/30 p-4"
    >
      <input
        type="hidden"
        name="questionnaireId"
        value={questionnaire.id}
      />

      {/*
        Kod zostawiamy jako hidden, bo updateQuestionnaireAction go wymaga.
        UX-owo użytkownik nie musi go teraz widzieć ani edytować.
      */}
      <input type="hidden" name="code" value={questionnaire.code} />

      <div className="grid gap-3 md:grid-cols-[1fr_180px]">
        <Input
          name="name"
          defaultValue={questionnaire.name}
          minLength={2}
          maxLength={180}
          required
          placeholder="Nazwa kwestionariusza"
        />

        <select
          name="status"
          defaultValue={questionnaire.status}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          {questionnaireStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="description"
        defaultValue={questionnaire.description ?? ""}
        maxLength={2000}
        className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Opis kwestionariusza"
      />

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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Zapisywanie..." : "Zapisz"}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(false)}
        >
          Anuluj
        </Button>
      </div>
    </form>
  );
}