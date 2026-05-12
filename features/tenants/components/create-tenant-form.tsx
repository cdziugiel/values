"use client";

import { useActionState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createTenantAction,
  type CreateTenantActionState,
} from "../api/tenant.actions";

const initialCreateTenantActionState: CreateTenantActionState = {
  status: "idle",
  message: "",
};

export function CreateTenantForm() {
  const [state, formAction, isPending] = useActionState(
    createTenantAction,
    initialCreateTenantActionState,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Nowy tenant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          System utworzy rekord tenanta, osobną bazę danych i wykona migracje.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nazwa</Label>
        <Input
          id="name"
          name="name"
          placeholder="ACME"
          required
          minLength={2}
          maxLength={160}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input
          id="slug"
          name="slug"
          placeholder="acme"
          required
          minLength={2}
          maxLength={48}
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
        />
        <p className="text-xs text-muted-foreground">
          Małe litery, cyfry i myślniki. Przykład: <code>acme</code>.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ownerEmail">Owner tenanta</Label>
        <Input
          id="ownerEmail"
          name="ownerEmail"
          type="email"
          placeholder="owner@firma.pl"
        />
        <p className="text-xs text-muted-foreground">
          Jeśli użytkownik nie istnieje, system utworzy konto i nada mu rolę TENANT_OWNER.
        </p>
      </div>

      {state.status !== "idle" ? (
        <div
          className={
            state.status === "success"
              ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          <div>{state.message}</div>

          {state.status === "success" && state.tenantSlug ? (
            <Link
              href={`/t/${state.tenantSlug}/dashboard`}
              className="mt-2 inline-block underline"
            >
              Przejdź do dashboardu tenanta
            </Link>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Tworzenie tenanta..." : "Utwórz tenanta"}
      </Button>
    </form>
  );
}