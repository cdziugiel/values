"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createRespondentAction,
  type RespondentActionState,
} from "../api/respondent.actions";
import type {
  RespondentOrganizationOption,
  RespondentUnitOption,
} from "../types/respondent.types";

type CreateRespondentFormProps = {
  tenantSlug: string;
  canCreate: boolean;
  organizations: RespondentOrganizationOption[];
  units: RespondentUnitOption[];
};

const initialState: RespondentActionState = {
  status: "idle",
  message: "",
};

export function CreateRespondentForm({
  tenantSlug,
  canCreate,
  organizations,
  units,
}: CreateRespondentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createRespondentAction,
    initialState,
  );

  if (!canCreate) {
    return null;
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <div>
        <h2 className="text-lg font-semibold">Nowy respondent</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dane identyfikujące respondenta są przechowywane oddzielnie od wyników.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="respondent-email">Email</Label>
          <Input
            id="respondent-email"
            name="email"
            type="email"
            placeholder="osoba@firma.pl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="respondent-first-name">Imię</Label>
          <Input
            id="respondent-first-name"
            name="firstName"
            placeholder="Anna"
            maxLength={180}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="respondent-last-name">Nazwisko</Label>
          <Input
            id="respondent-last-name"
            name="lastName"
            placeholder="Kowalska"
            maxLength={180}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="respondent-phone">Telefon</Label>
          <Input
            id="respondent-phone"
            name="phone"
            placeholder="+48..."
            maxLength={180}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="respondent-external-code">Kod zewnętrzny</Label>
          <Input
            id="respondent-external-code"
            name="externalCode"
            placeholder="EMP-001"
            maxLength={180}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="respondent-organization">Organizacja</Label>
          <select
            id="respondent-organization"
            name="clientOrganizationId"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">Brak</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="respondent-unit">Jednostka</Label>
          <select
            id="respondent-unit"
            name="clientUnitId"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">Brak</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
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
        {isPending ? "Tworzenie..." : "Utwórz respondenta"}
      </Button>
    </form>
  );
}