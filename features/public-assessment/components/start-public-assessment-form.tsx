"use client";

import { useActionState } from "react";

import {
  startPublicAssessmentAction,
  type StartPublicAssessmentState,
} from "../api/public-assessment.actions";

type StartPublicAssessmentFormProps = {
  token: string;
};

const initialState: StartPublicAssessmentState = {
  status: "idle",
  message: "",
};

export function StartPublicAssessmentForm({
  token,
}: StartPublicAssessmentFormProps) {
  const [state, formAction, isPending] = useActionState(
    startPublicAssessmentAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Uruchamianie..." : "Rozpocznij badanie"}
      </button>

      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}