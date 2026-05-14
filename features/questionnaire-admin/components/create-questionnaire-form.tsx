"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createQuestionnaireAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

export function CreateQuestionnaireForm() {
  const [state, formAction, isPending] = useActionState(
    createQuestionnaireAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Nowy kwestionariusz</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Utwórz bazową definicję narzędzia. Itemy dodasz w wersji kwestionariusza.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="questionnaire-code">Kod</Label>
          <Input
            id="questionnaire-code"
            name="code"
            placeholder="HUMANET_VALUES"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="questionnaire-name">Nazwa</Label>
          <Input
            id="questionnaire-name"
            name="name"
            placeholder="HUMANET Values"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <Label htmlFor="questionnaire-description">Opis</Label>
          <textarea
            id="questionnaire-description"
            name="description"
            className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

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

      <Button type="submit" disabled={isPending}>
        {isPending ? "Tworzenie..." : "Utwórz kwestionariusz"}
      </Button>
    </form>
  );
}