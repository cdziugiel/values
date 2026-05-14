"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createClientOrganizationAction,
  type ClientOrganizationActionState,
} from "../api/client-organization.actions";

type CreateClientOrganizationFormProps = {
  tenantSlug: string;
  canCreate: boolean;
};

const initialState: ClientOrganizationActionState = {
  status: "idle",
  message: "",
};

export function CreateClientOrganizationForm({
  tenantSlug,
  canCreate,
}: CreateClientOrganizationFormProps) {
  const [state, formAction, isPending] = useActionState(
    createClientOrganizationAction,
    initialState,
  );

  if (!canCreate) {
    return null;
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <div>
        <h2 className="text-lg font-semibold">Nowa organizacja klienta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Organizacja klienta grupuje jednostki, respondentów i projekty badawcze.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="client-org-name">Nazwa</Label>
          <Input
            id="client-org-name"
            name="name"
            placeholder="ACME Sp. z o.o."
            required
            minLength={2}
            maxLength={180}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-org-industry">Branża</Label>
          <Input
            id="client-org-industry"
            name="industry"
            placeholder="Produkcja / HR / Energetyka"
            maxLength={120}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="client-org-size">Wielkość</Label>
          <Input
            id="client-org-size"
            name="size"
            placeholder="np. 50-250"
            maxLength={80}
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
        {isPending ? "Tworzenie..." : "Utwórz organizację"}
      </Button>
    </form>
  );
}