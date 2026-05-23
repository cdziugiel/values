// features/public-assessment/components/start-public-assessment-form.tsx

"use client";

import { useActionState } from "react";
import { PlayCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 rounded-full bg-[#171717] px-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      >
        <PlayCircle size={16} />
        {isPending ? "Uruchamianie..." : "Rozpocznij badanie"}
      </Button>

      {state.status === "error" ? (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <div className="flex gap-2">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </div>
        </div>
      ) : null}
    </form>
  );
}