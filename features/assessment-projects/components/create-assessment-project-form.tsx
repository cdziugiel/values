"use client";

import { useActionState } from "react";

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
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <div>
        <h2 className="text-lg font-semibold">Nowy projekt badawczy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Projekt grupuje działania diagnostyczne, respondentów i późniejsze raporty.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="assessment-project-name">Nazwa projektu</Label>
          <Input
            id="assessment-project-name"
            name="name"
            placeholder="Badanie wartości 2026"
            required
            minLength={2}
            maxLength={180}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assessment-project-org">Organizacja klienta</Label>
          <select
            id="assessment-project-org"
            name="clientOrganizationId"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
          <Label htmlFor="assessment-project-starts">Start</Label>
          <Input
            id="assessment-project-starts"
            name="startsAt"
            type="date"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="assessment-project-ends">Koniec</Label>
          <Input
            id="assessment-project-ends"
            name="endsAt"
            type="date"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="assessment-project-description">Opis</Label>
          <textarea
            id="assessment-project-description"
            name="description"
            maxLength={2000}
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Cel badania, zakres, uwagi organizacyjne..."
          />
        </div>
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
        {isPending ? "Tworzenie..." : "Utwórz projekt"}
      </Button>
    </form>
  );
}