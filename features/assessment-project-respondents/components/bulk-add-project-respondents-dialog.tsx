"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  Layers3,
  TriangleAlert,
  UserRoundPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  bulkAddAssessmentProjectRespondentsAction,
  type AssessmentProjectRespondentActionState,
} from "../api/assessment-project-respondent.actions";
import type {
  AssessmentProjectRespondentOrganizationOption,
  AssessmentProjectRespondentUnitOption,
} from "../types/assessment-project-respondent.types";

type BulkAddProjectRespondentsDialogProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  canAdd: boolean;
  organizationOptions: AssessmentProjectRespondentOrganizationOption[];
  unitOptions: AssessmentProjectRespondentUnitOption[];
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

export function BulkAddProjectRespondentsDialog({
  tenantSlug,
  assessmentProjectId,
  canAdd,
  organizationOptions,
  unitOptions,
}: BulkAddProjectRespondentsDialogProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizationOptions[0]?.id ?? "",
  );

  const [selectedUnitId, setSelectedUnitId] = useState("");

  const [state, formAction, isPending] = useActionState(
    bulkAddAssessmentProjectRespondentsAction,
    initialState,
  );

  const filteredUnitOptions = useMemo(
    () =>
      unitOptions.filter(
        (unit) => unit.clientOrganizationId === selectedOrganizationId,
      ),
    [selectedOrganizationId, unitOptions],
  );

  if (!canAdd) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Layers3 size={16} />
          Dodaj masowo
        </Button>
      </DialogTrigger>

      <DialogContent className="md:min-w-[500px] rounded-[1.75rem] border-black/10 bg-white/95 p-0 shadow-[0_24px_72px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="border-b border-black/10 px-6 py-5">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
              Uczestnicy projektu
            </p>

            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              Masowe dodawanie respondentów
            </DialogTitle>

            <DialogDescription className="text-sm leading-6 text-[#6b7280]">
              Dodaj do projektu wszystkich respondentów z organizacji albo tylko
              respondentów z wybranej jednostki / zespołu.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form action={formAction} className="space-y-5 px-6 py-5">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <input
            type="hidden"
            name="assessmentProjectId"
            value={assessmentProjectId}
          />

          {organizationOptions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
              Brak organizacji. Najpierw dodaj organizację i respondentów w
              bazie partnera.
            </div>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <div className="space-y-2">
                  <Label
                    htmlFor="bulk-client-organization-id"
                    className="text-[#171717]"
                  >
                    Organizacja
                  </Label>

                  <select
                    id="bulk-client-organization-id"
                    name="clientOrganizationId"
                    value={selectedOrganizationId}
                    onChange={(event) => {
                      setSelectedOrganizationId(event.target.value);
                      setSelectedUnitId("");
                    }}
                    required
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  >
                    {organizationOptions.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 space-y-2">
                  <Label
                    htmlFor="bulk-client-unit-id"
                    className="text-[#171717]"
                  >
                    Jednostka / zespół
                  </Label>

                  <select
                    id="bulk-client-unit-id"
                    name="clientUnitId"
                    value={selectedUnitId}
                    onChange={(event) => setSelectedUnitId(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  >
                    <option value="">
                      Cała organizacja — wszyscy respondenci
                    </option>

                    {filteredUnitOptions.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>

                  <p className="text-xs leading-5 text-[#6b7280]">
                    Pozostaw puste, aby dodać wszystkich respondentów z
                    organizacji. Wybierz jednostkę, aby dodać tylko
                    respondentów przypisanych bezpośrednio do tej jednostki.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
                <div className="flex gap-3">
                  <UserRoundPlus
                    size={18}
                    className="mt-0.5 shrink-0 text-[#0f766e]"
                  />

                  <p className="text-sm leading-6 text-[#0f766e]">
                    System doda tylko brakujących respondentów. Osoby już
                    aktywnie przypisane do projektu zostaną pominięte, a
                    wcześniej zarchiwizowane przypisania zostaną przywrócone.
                  </p>
                </div>
              </div>

              <ActionMessage status={state.status} message={state.message} />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <UserRoundPlus size={16} />
                  {isPending ? "Dodawanie..." : "Dodaj respondentów"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}