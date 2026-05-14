"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  addTenantMemberAction,
  type TenantMemberActionState,
} from "../api/tenant-member.actions";
import { TENANT_MEMBER_ROLE_OPTIONS } from "../forms/tenant-member.schema";

type AddTenantMemberFormProps = {
  tenantSlug: string;
  canInvite: boolean;
};

const initialState: TenantMemberActionState = {
  status: "idle",
  message: "",
};

export function AddTenantMemberForm({
  tenantSlug,
  canInvite,
}: AddTenantMemberFormProps) {
  const [state, formAction, isPending] = useActionState(
    addTenantMemberAction,
    initialState,
  );

  if (!canInvite) {
    return null;
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <div>
        <h2 className="text-lg font-semibold">Dodaj członka</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Jeśli użytkownik nie istnieje, system utworzy konto. Logowanie nadal odbywa się przez magic link.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="member-email">Email</Label>
          <Input
            id="member-email"
            name="email"
            type="email"
            placeholder="osoba@firma.pl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-name">Nazwa / imię</Label>
          <Input
            id="member-name"
            name="name"
            placeholder="Jan Kowalski"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-role">Rola</Label>
          <select
            id="member-role"
            name="role"
            defaultValue="TENANT_MEMBER"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {TENANT_MEMBER_ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
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
        {isPending ? "Dodawanie..." : "Dodaj członka"}
      </Button>
    </form>
  );
}