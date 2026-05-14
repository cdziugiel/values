"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createClientUnitAction,
  type ClientUnitActionState,
} from "../api/client-unit.actions";
import { CLIENT_UNIT_TYPE_OPTIONS } from "../forms/client-unit.schema";
import type {
  ClientUnitOrganizationOption,
  ClientUnitParentOption,
} from "../types/client-unit.types";

type CreateClientUnitFormProps = {
  tenantSlug: string;
  canCreate: boolean;
  organizations: ClientUnitOrganizationOption[];
  parentOptions: ClientUnitParentOption[];
};

const initialState: ClientUnitActionState = {
  status: "idle",
  message: "",
};

export function CreateClientUnitForm({
  tenantSlug,
  canCreate,
  organizations,
  parentOptions,
}: CreateClientUnitFormProps) {
  const [state, formAction, isPending] = useActionState(
    createClientUnitAction,
    initialState,
  );

  if (!canCreate) {
    return null;
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <div>
        <h2 className="text-lg font-semibold">Nowa jednostka organizacyjna</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dodaj dział, zespół, pion lub inną jednostkę w ramach organizacji klienta.
        </p>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Najpierw utwórz organizację klienta.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="client-unit-org">Organizacja</Label>
              <select
                id="client-unit-org"
                name="clientOrganizationId"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-unit-parent">Jednostka nadrzędna</Label>
              <select
                id="client-unit-parent"
                name="parentId"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">Brak</option>
                {parentOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-unit-name">Nazwa</Label>
              <Input
                id="client-unit-name"
                name="name"
                placeholder="HR / Produkcja / Zarząd"
                required
                minLength={2}
                maxLength={180}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-unit-type">Typ</Label>
              <select
                id="client-unit-type"
                name="type"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                defaultValue="department"
              >
                {CLIENT_UNIT_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
            {isPending ? "Tworzenie..." : "Utwórz jednostkę"}
          </Button>
        </>
      )}
    </form>
  );
}