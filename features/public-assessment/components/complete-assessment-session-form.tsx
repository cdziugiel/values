"use client";

import { useActionState } from "react";

import {
  completeAssessmentSessionAction,
  type CompleteAssessmentSessionState,
} from "../api/complete-assessment-session.actions";

type CompleteAssessmentSessionFormProps = {
  token: string;
  sessionId: string;
};

const initialState: CompleteAssessmentSessionState = {
  status: "idle",
  message: "",
};

export function CompleteAssessmentSessionForm({
  token,
  sessionId,
}: CompleteAssessmentSessionFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeAssessmentSessionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border bg-card p-5">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div>
        <h2 className="text-lg font-semibold">Zakończ badanie</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Po zakończeniu badania odpowiedzi zostaną oznaczone jako kompletne, a link nie będzie już aktywny.
        </p>
      </div>

      {state.status === "error" ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Kończenie..." : "Zakończ badanie"}
      </button>
    </form>
  );
}