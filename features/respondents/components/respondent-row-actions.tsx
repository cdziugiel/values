"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  archiveRespondentAction,
  type RespondentActionState,
  updateRespondentAction,
} from "../api/respondent.actions";
import type {
  RespondentListItem,
  RespondentOrganizationOption,
  RespondentUnitOption,
} from "../types/respondent.types";

type RespondentRowActionsProps = {
  tenantSlug: string;
  respondent: RespondentListItem;
  organizations: RespondentOrganizationOption[];
  units: RespondentUnitOption[];
  canManage: boolean;
};

const initialState: RespondentActionState = {
  status: "idle",
  message: "",
};

export function RespondentRowActions({
  tenantSlug,
  respondent,
  organizations,
  units,
  canManage,
}: RespondentRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateRespondentAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveRespondentAction,
    initialState,
  );

  if (!canManage) {
    return null;
  }

  if (!isEditing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
        Edytuj
      </Button>
    );
  }

  const filteredUnits = units.filter((unit) => {
    if (!respondent.clientOrganizationId) {
      return true;
    }

    return unit.clientOrganizationId === respondent.clientOrganizationId;
  });

  return (
    <div className="min-w-[380px] space-y-3 rounded-xl border bg-background p-3">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="respondentId" value={respondent.id} />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Email</label>
            <Input
              name="email"
              type="email"
              defaultValue={respondent.email ?? ""}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Kod zewnętrzny</label>
            <Input
              name="externalCode"
              defaultValue={respondent.externalCode ?? ""}
              maxLength={180}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Imię</label>
            <Input
              name="firstName"
              defaultValue={respondent.firstName ?? ""}
              maxLength={180}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Nazwisko</label>
            <Input
              name="lastName"
              defaultValue={respondent.lastName ?? ""}
              maxLength={180}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Telefon</label>
            <Input
              name="phone"
              defaultValue={respondent.phone ?? ""}
              maxLength={180}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Organizacja</label>
            <select
              name="clientOrganizationId"
              defaultValue={respondent.clientOrganizationId ?? ""}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Brak</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium">Jednostka</label>
            <select
              name="clientUnitId"
              defaultValue={respondent.clientUnitId ?? ""}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Brak</option>
              {filteredUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {updateState.status === "error" ? (
          <p className="text-xs text-destructive">{updateState.message}</p>
        ) : null}

        {updateState.status === "success" ? (
          <p className="text-xs text-green-700">{updateState.message}</p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isUpdating}>
            {isUpdating ? "Zapis..." : "Zapisz"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            Anuluj
          </Button>
        </div>
      </form>

      <form
        action={archiveAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Zarchiwizować respondenta ${respondent.email ?? respondent.id}?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="respondentId" value={respondent.id} />

        <Button
          type="submit"
          size="sm"
          variant="destructive"
          disabled={isArchiving}
        >
          {isArchiving ? "Archiwizacja..." : "Archiwizuj"}
        </Button>

        {archiveState.status === "error" ? (
          <p className="mt-2 text-xs text-destructive">
            {archiveState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}