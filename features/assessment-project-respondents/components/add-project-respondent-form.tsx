// features/assessment-project-respondents/components/add-project-respondent-form.tsx

"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  UsersRound,
} from "lucide-react";

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
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="assessmentProjectId"
          value={assessmentProjectId}
        />

        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <UserPlus size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Uczestnik projektu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Dodaj respondenta do projektu badawczego.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Wybierz osobę z bazy respondentów partnera. Po przypisaniu będzie
              można wygenerować dla niej link dostępowy i śledzić status sesji.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Respondent musi najpierw istnieć w bazie partnera. Ten formularz
                tylko przypisuje istniejącą osobę do konkretnego projektu.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          {respondentOptions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
              Brak dostępnych respondentów do dodania. Utwórz respondenta albo
              sprawdź, czy wszyscy respondenci nie zostali już przypisani do
              tego projektu.
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="project-respondent-id" className="text-[#171717]">
                  Respondent
                </Label>

                <select
                  id="project-respondent-id"
                  name="respondentId"
                  required
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
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
                <div className="mt-5">
                  <ActionMessage status={state.status} message={state.message} />
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <UsersRound size={14} />
                  Projekt: <span className="font-mono text-[#171717]">{assessmentProjectId}</span>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <UserPlus size={16} />
                  {isPending ? "Dodawanie..." : "Dodaj do projektu"}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
