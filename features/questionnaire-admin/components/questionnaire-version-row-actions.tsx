"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  type QuestionnaireAdminActionState,
  updateQuestionnaireVersionAction,
} from "../api/questionnaire-admin.actions";

type QuestionnaireVersionRowActionsProps = {
  version: {
    id: string;
    version: string;
    name: string;
    description: string | null;
    status: string;
    isPublic: boolean;
  };
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

const versionStatusOptions = [
  { value: "draft", label: "draft" },
  { value: "active", label: "active" },
  { value: "archived", label: "archived" },
];

export function QuestionnaireVersionRowActions({
  version,
}: QuestionnaireVersionRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateQuestionnaireVersionAction,
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
        Ustawienia
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="min-w-[360px] space-y-3 rounded-xl border bg-background p-3"
    >
      <input type="hidden" name="versionId" value={version.id} />

      <div className="grid gap-3 md:grid-cols-[1fr_140px]">
        <Input
          name="name"
          defaultValue={version.name}
          minLength={2}
          maxLength={180}
          required
          placeholder="Nazwa wersji"
        />

        <select
          name="status"
          defaultValue={version.status}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          {versionStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        name="description"
        defaultValue={version.description ?? ""}
        maxLength={2000}
        className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
        placeholder="Opis wersji"
      />

      <label className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={version.isPublic}
          className="mt-1"
        />

        <span>
          <span className="font-medium">Publiczna</span>
          <span className="block text-xs text-muted-foreground">
            Widoczna w panelu respondenta bez indywidualnego zaproszenia.
          </span>
        </span>
      </label>

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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Zapisywanie..." : "Zapisz ustawienia"}
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