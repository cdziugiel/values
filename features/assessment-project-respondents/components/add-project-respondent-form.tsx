"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import {
  addAssessmentProjectRespondentAction,
  type AssessmentProjectRespondentActionState,
} from "../api/assessment-project-respondent.actions";
import type { AssessmentProjectRespondentOption } from "../types/assessment-project-respondent.types";

type AddProjectRespondentFormProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  canAdd: boolean;
  respondentOptions: AssessmentProjectRespondentOption[];
};

const initialState: AssessmentProjectRespondentActionState = {
  status: "idle",
  message: "",
};

export function AddProjectRespondentForm({
  tenantSlug,
  assessmentProjectId,
  canAdd,
  respondentOptions,
}: AddProjectRespondentFormProps) {
  const [state, formAction, isPending] = useActionState(
    addAssessmentProjectRespondentAction,
    initialState,
  );

  if (!canAdd) {
    return null;
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input
        type="hidden"
        name="assessmentProjectId"
        value={assessmentProjectId}
      />

      <div>
        <h2 className="text-lg font-semibold">Dodaj respondenta do projektu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wybierz istniejącego respondenta z bazy tenanta.
        </p>
      </div>

      {respondentOptions.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Brak dostępnych respondentów do dodania. Utwórz respondenta albo sprawdź, czy wszyscy nie zostali już przypisani.
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="project-respondent-id">Respondent</Label>
            <select
              id="project-respondent-id"
              name="respondentId"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {respondentOptions.map((respondent) => (
                <option key={respondent.id} value={respondent.id}>
                  {respondent.label}
                  {respondent.email ? ` — ${respondent.email}` : ""}
                </option>
              ))}
            </select>
          </div>

          {state.status !== "idle" ? (
            <p
              className={
                state.status === "success"
                  ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
                  : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {state.message}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Dodawanie..." : "Dodaj do projektu"}
          </Button>
        </>
      )}
    </form>
  );
}