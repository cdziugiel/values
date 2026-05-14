"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  archiveClientUnitAction,
  type ClientUnitActionState,
  updateClientUnitAction,
} from "../api/client-unit.actions";
import { CLIENT_UNIT_TYPE_OPTIONS } from "../forms/client-unit.schema";
import type {
  ClientUnitListItem,
  ClientUnitOrganizationOption,
  ClientUnitParentOption,
} from "../types/client-unit.types";

type ClientUnitRowActionsProps = {
  tenantSlug: string;
  unit: ClientUnitListItem;
  canManage: boolean;
  organizations: ClientUnitOrganizationOption[];
  parentOptions: ClientUnitParentOption[];
};

const initialState: ClientUnitActionState = {
  status: "idle",
  message: "",
};

export function ClientUnitRowActions({
  tenantSlug,
  unit,
  canManage,
  organizations,
  parentOptions,
}: ClientUnitRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateClientUnitAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveClientUnitAction,
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

  const filteredParentOptions = parentOptions.filter(
    (option) =>
      option.id !== unit.id &&
      option.clientOrganizationId === unit.clientOrganizationId,
  );

  return (
    <div className="min-w-[340px] space-y-3 rounded-xl border bg-background p-3">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="clientUnitId" value={unit.id} />

        <div className="space-y-1">
          <label className="text-xs font-medium">Organizacja</label>
          <select
            name="clientOrganizationId"
            defaultValue={unit.clientOrganizationId}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Jednostka nadrzędna</label>
          <select
            name="parentId"
            defaultValue={unit.parentId ?? ""}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Brak</option>
            {filteredParentOptions.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Nazwa</label>
          <Input
            name="name"
            defaultValue={unit.name}
            required
            minLength={2}
            maxLength={180}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Typ</label>
          <select
            name="type"
            defaultValue={unit.type}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {CLIENT_UNIT_TYPE_OPTIONS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
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
            `Zarchiwizować jednostkę "${unit.name}"?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="clientUnitId" value={unit.id} />

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