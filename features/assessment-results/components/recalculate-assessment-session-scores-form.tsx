// features/assessment-results/components/recalculate-assessment-session-scores-form.tsx

"use client";

import { useActionState } from "react";
import { CheckCircle2, RefreshCcw, TriangleAlert } from "lucide-react";

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

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={[
        "max-w-[420px] rounded-[1.25rem] border px-4 py-3 text-xs leading-5",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

export function RecalculateAssessmentSessionScoresForm({
  tenantSlug,
  sessionId,
}: RecalculateAssessmentSessionScoresFormProps) {
  const [state, formAction, isPending] = useActionState(
    recalculateAssessmentSessionScoresAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
        className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      >
        <RefreshCcw size={14} />
        {isPending ? "Przeliczanie..." : "Przelicz ponownie"}
      </Button>

      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}
