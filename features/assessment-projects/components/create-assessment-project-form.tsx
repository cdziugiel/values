// features/assessment-projects/components/create-assessment-project-form.tsx

"use client";

import { useActionState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  PlusCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createAssessmentProjectAction,
  type AssessmentProjectActionState,
} from "../api/assessment-project.actions";
import type { AssessmentProjectOrganizationOption } from "../types/assessment-project.types";

type CreateAssessmentProjectFormProps = {
  tenantSlug: string;
  canCreate: boolean;
  organizations: AssessmentProjectOrganizationOption[];
};

const initialState: AssessmentProjectActionState = {
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

export function CreateAssessmentProjectForm({
  tenantSlug,
  canCreate,
  organizations,
}: CreateAssessmentProjectFormProps) {
  const [state, formAction, isPending] = useActionState(
    createAssessmentProjectAction,
    initialState,
  );

  if (!canCreate) {
    return null;
  }

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowy projekt badawczy
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Utwórz projekt diagnostyczny dla klienta.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Projekt grupuje respondentów, przypisane kwestionariusze, sesje
              badawcze i późniejsze raporty. Dzięki temu cała diagnostyka ma
              jeden kontekst operacyjny.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Po utworzeniu projektu przypiszesz do niego kwestionariusze,
                dodasz uczestników i będziesz śledzić postęp sesji.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assessment-project-name" className="text-[#171717]">
                Nazwa projektu
              </Label>

              <Input
                id="assessment-project-name"
                name="name"
                placeholder="Badanie wartości 2026"
                required
                minLength={2}
                maxLength={180}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment-project-org" className="text-[#171717]">
                Organizacja klienta
              </Label>

              <select
                id="assessment-project-org"
                name="clientOrganizationId"
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                defaultValue=""
              >
                <option value="">Brak przypisania</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="assessment-project-starts"
                className="text-[#171717]"
              >
                Start
              </Label>

              <Input
                id="assessment-project-starts"
                name="startsAt"
                type="date"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assessment-project-ends" className="text-[#171717]">
                Koniec
              </Label>

              <Input
                id="assessment-project-ends"
                name="endsAt"
                type="date"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label
                htmlFor="assessment-project-description"
                className="text-[#171717]"
              >
                Opis
              </Label>

              <textarea
                id="assessment-project-description"
                name="description"
                maxLength={2000}
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                placeholder="Cel badania, zakres, uwagi organizacyjne..."
              />
            </div>
          </div>

          {state.status !== "idle" ? (
            <div className="mt-5">
              <ActionMessage status={state.status} message={state.message} />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <ClipboardList size={14} />
              Projekt zostanie przypisany do partnera:{" "}
              <span className="font-mono text-[#171717]">{tenantSlug}</span>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <CalendarPlus size={16} />
              {isPending ? "Tworzenie..." : "Utwórz projekt"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
