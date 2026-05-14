"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  recalculateAssessmentSessionScoresAction,
  type RecalculateAssessmentSessionScoresState,
} from "../api/assessment-session-results.actions";

type RecalculateAssessmentSessionScoresFormProps = {
  tenantSlug: string;
  sessionId: string;
};

const initialState: RecalculateAssessmentSessionScoresState = {
  status: "idle",
  message: "",
};

export function RecalculateAssessmentSessionScoresForm({
  tenantSlug,
  sessionId,
}: RecalculateAssessmentSessionScoresFormProps) {
  const [state, formAction, isPending] = useActionState(
    recalculateAssessmentSessionScoresAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? "Przeliczanie..." : "Przelicz wyniki ponownie"}
      </Button>

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
    </form>
  );
}