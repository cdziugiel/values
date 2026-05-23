// features/public-assessment/components/complete-assessment-session-form.tsx

"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  completeAssessmentSessionAction,
  type CompleteAssessmentSessionState,
} from "../api/complete-assessment-session.actions";

type CompleteAssessmentSessionFormProps = {
  mode?: "token" | "my-assessment";
  token: string;
  tenantSlug?: string;
  sessionId: string;
  projectQuestionnaireId?: string;
};

const initialState: CompleteAssessmentSessionState = {
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
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

export function CompleteAssessmentSessionForm({
  mode = "token",
  token,
  tenantSlug = "",
  sessionId,
  projectQuestionnaireId = "",
}: CompleteAssessmentSessionFormProps) {
  const [state, formAction, isPending] = useActionState(
    completeAssessmentSessionAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
    >
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input
        type="hidden"
        name="projectQuestionnaireId"
        value={projectQuestionnaireId}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <ClipboardCheck size={20} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              Zakończ badanie
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Po zakończeniu badania odpowiedzi zostaną oznaczone jako
              kompletne, a link nie będzie już aktywny.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          <CheckCircle2 size={16} />
          {isPending ? "Kończenie..." : "Zakończ badanie"}
        </Button>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-xs leading-5 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <ShieldCheck size={14} />
          Przed zakończeniem
        </div>
        Upewnij się, że wszystkie wymagane części badania zostały uzupełnione.
      </div>

      {state.status !== "idle" ? (
        <div className="mt-4">
          <ActionMessage status={state.status} message={state.message} />
        </div>
      ) : null}
    </form>
  );
}